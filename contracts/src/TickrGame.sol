// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TickrGame
/// @notice On-chain record for Tickr, the daily stock-chart guessing game.
///  - Each day's answer is committed (hashed) before the day starts and revealed afterwards,
///    so anyone can verify the puzzle was never changed mid-day.
///  - The game server checks guesses off-chain and signs an EIP-712 "Solve" attestation.
///    Anyone (usually the server's relayer, so players never need gas) can submit it.
///  - Consecutive daily solves build a streak. Hitting a streak milestone pays a reward
///    from this contract's ERC-20 balance (Season 0: Robinhood Chain testnet stock tokens).
contract TickrGame is Ownable, EIP712 {
    using SafeERC20 for IERC20;

    struct Player {
        uint32 lastDay; // last day solved
        uint32 streak; // current consecutive-day streak
        uint32 bestStreak;
        uint32 solves;
        uint32 totalGuesses; // sum of guesses across solves (avg = totalGuesses / solves)
    }

    struct Reward {
        address token;
        uint256 amount;
    }

    bytes32 public constant SOLVE_TYPEHASH =
        keccak256("Solve(address player,uint32 day,uint8 guesses,uint256 deadline)");

    /// @notice Address whose signatures are accepted as proof of a solve (the game server).
    address public signer;

    mapping(uint32 day => bytes32) public commitments;
    mapping(uint32 day => string) public revealedAnswers;
    mapping(address => Player) public players;
    mapping(address => mapping(uint32 day => uint8)) public solvedIn; // guesses used, 0 = not solved
    mapping(uint32 streak => Reward) public milestoneRewards;
    uint32[] public milestones;
    address[] public playerList;

    event SignerUpdated(address signer);
    event PuzzleCommitted(uint32 indexed day, bytes32 commitment);
    event PuzzleRevealed(uint32 indexed day, string answer);
    event Solved(address indexed player, uint32 indexed day, uint8 guesses, uint32 streak);
    event MilestoneSet(uint32 indexed streak, address token, uint256 amount);
    event RewardPaid(address indexed player, uint32 indexed streak, address token, uint256 amount);
    event RewardUnfunded(address indexed player, uint32 indexed streak, address token, uint256 amount);

    error NotCommitted(uint32 day);
    error AlreadyCommitted(uint32 day);
    error AlreadySolved(address player, uint32 day);
    error BadGuessCount(uint8 guesses);
    error Expired();
    error BadSignature();
    error BadReveal();
    error NotAuthorized();

    constructor(address initialOwner, address initialSigner) Ownable(initialOwner) EIP712("Tickr", "1") {
        signer = initialSigner;
        emit SignerUpdated(initialSigner);
    }

    // ───────────────────────────── admin ─────────────────────────────

    modifier onlyOwnerOrSigner() {
        if (msg.sender != owner() && msg.sender != signer) revert NotAuthorized();
        _;
    }

    function setSigner(address newSigner) external onlyOwner {
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    /// @notice Commit hashes for upcoming days. commitment = keccak256(abi.encode(day, answer, salt)).
    function commitPuzzles(uint32[] calldata days_, bytes32[] calldata hashes) external onlyOwnerOrSigner {
        require(days_.length == hashes.length, "length");
        for (uint256 i; i < days_.length; ++i) {
            if (commitments[days_[i]] != bytes32(0)) revert AlreadyCommitted(days_[i]);
            commitments[days_[i]] = hashes[i];
            emit PuzzleCommitted(days_[i], hashes[i]);
        }
    }

    /// @notice Publish a past day's answer. Anyone can check it against the commitment.
    function revealPuzzle(uint32 day, string calldata answer, bytes32 salt) external {
        if (keccak256(abi.encode(day, answer, salt)) != commitments[day]) revert BadReveal();
        revealedAnswers[day] = answer;
        emit PuzzleRevealed(day, answer);
    }

    function setMilestone(uint32 streak, address token, uint256 amount) external onlyOwner {
        if (milestoneRewards[streak].token == address(0) && token != address(0)) milestones.push(streak);
        milestoneRewards[streak] = Reward(token, amount);
        emit MilestoneSet(streak, token, amount);
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ───────────────────────────── gameplay ─────────────────────────────

    /// @notice Record a solve signed by the game server. Callable by anyone (relayer-friendly).
    function recordSolve(address player, uint32 day, uint8 guesses, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert Expired();
        if (guesses == 0 || guesses > 6) revert BadGuessCount(guesses);
        if (commitments[day] == bytes32(0)) revert NotCommitted(day);
        if (solvedIn[player][day] != 0) revert AlreadySolved(player, day);

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(SOLVE_TYPEHASH, player, day, guesses, deadline)));
        if (ECDSA.recover(digest, signature) != signer) revert BadSignature();

        Player storage p = players[player];
        if (p.solves == 0) playerList.push(player);

        p.streak = (p.solves > 0 && p.lastDay + 1 == day) ? p.streak + 1 : 1;
        p.lastDay = day;
        p.solves += 1;
        p.totalGuesses += guesses;
        if (p.streak > p.bestStreak) p.bestStreak = p.streak;
        solvedIn[player][day] = guesses;

        emit Solved(player, day, guesses, p.streak);
        _payMilestone(player, p.streak);
    }

    function _payMilestone(address player, uint32 streak) internal {
        Reward memory r = milestoneRewards[streak];
        if (r.token == address(0) || r.amount == 0) return;
        if (IERC20(r.token).balanceOf(address(this)) < r.amount) {
            emit RewardUnfunded(player, streak, r.token, r.amount);
            return;
        }
        IERC20(r.token).safeTransfer(player, r.amount);
        emit RewardPaid(player, streak, r.token, r.amount);
    }

    // ───────────────────────────── views ─────────────────────────────

    /// @notice Streak as it stands today: a streak is only "live" if the last solve was today or yesterday.
    function liveStreak(address player, uint32 today) external view returns (uint32) {
        Player memory p = players[player];
        if (p.solves == 0) return 0;
        return (p.lastDay == today || p.lastDay + 1 == today) ? p.streak : 0;
    }

    function playerCount() external view returns (uint256) {
        return playerList.length;
    }

    function getPlayers(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory addrs, Player[] memory stats)
    {
        uint256 n = playerList.length;
        if (offset >= n) return (new address[](0), new Player[](0));
        uint256 end = offset + limit > n ? n : offset + limit;
        addrs = new address[](end - offset);
        stats = new Player[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            addrs[i - offset] = playerList[i];
            stats[i - offset] = players[playerList[i]];
        }
    }

    function getMilestones() external view returns (uint32[] memory streaks, Reward[] memory rewards) {
        streaks = milestones;
        rewards = new Reward[](streaks.length);
        for (uint256 i; i < streaks.length; ++i) {
            rewards[i] = milestoneRewards[streaks[i]];
        }
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
