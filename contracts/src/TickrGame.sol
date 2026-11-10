// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title TickrGame
/// @notice On-chain game state for Tickr on Robinhood Chain.
///
///  Daily puzzle
///   - Each day's answer is committed (hashed) before the day starts and can be revealed afterwards.
///   - The game server checks guesses off-chain and signs an EIP-712 `Solve`. Anyone (usually the
///     server's relayer, so players never need gas) can submit it.
///   - Consecutive daily solves build a streak.
///
///  $TCKR points
///   - Non-transferable in-game points. Every player starts with `starterPoints`.
///   - Earned by solving dailies (fewer guesses = more), streak bonuses and milestone bonuses.
///   - Spent and earned in demo trading. A future mainnet $TCKR token can be distributed from these balances.
///
///  Demo trading
///   - The server signs a short-lived `Quote` at the live Stock Token price. The contract moves points
///     and positions, so every player's portfolio and trade history live on-chain.
///   - Prices and quantities use 18 decimals. 1 point buys 1 USD of underlying value (internal unit only).
contract TickrGame is Ownable, EIP712 {
    struct Player {
        uint32 lastDay;
        uint32 streak;
        uint32 bestStreak;
        uint32 solves;
        uint32 totalGuesses;
    }

    struct Position {
        uint256 qty; // 18 decimals
        uint256 cost; // points paid for the open quantity (cost basis), 18 decimals
    }

    struct Quote {
        address player;
        string symbol;
        bool isBuy;
        uint256 qty;
        uint256 price;
        uint256 nonce;
        uint256 deadline;
    }

    bytes32 public constant SOLVE_TYPEHASH =
        keccak256("Solve(address player,uint32 day,uint8 guesses,uint256 deadline)");
    bytes32 public constant QUOTE_TYPEHASH = keccak256(
        "Quote(address player,string symbol,bool isBuy,uint256 qty,uint256 price,uint256 nonce,uint256 deadline)"
    );

    address public signer;

    // ── points config (tunable until tokenomics are final) ──
    uint256 public starterPoints = 10_000 ether;
    uint256 public solveBasePoints = 100 ether; // × (7 − guesses): 1 guess = 600, 6 guesses = 100
    uint256 public streakBonusPerDay = 20 ether; // × streak, capped
    uint256 public streakBonusCap = 600 ether;
    mapping(uint32 streak => uint256) public milestoneBonus;

    // ── state ──
    mapping(uint32 day => bytes32) public commitments;
    mapping(uint32 day => string) public revealedAnswers;
    mapping(address => Player) public players;
    mapping(address => mapping(uint32 day => uint8)) public solvedIn;
    mapping(address => bool) public joined;
    mapping(address => uint256) public points;
    address[] public playerList;

    mapping(address => mapping(bytes32 => Position)) public positions;
    mapping(address => bytes32[]) internal held;
    mapping(address => mapping(bytes32 => uint256)) internal heldIndex; // 1-based
    mapping(bytes32 => string) public symbolOf;
    mapping(address => mapping(uint256 => bool)) public usedNonce;
    uint256 public tradeCount;

    event SignerUpdated(address signer);
    event PuzzleCommitted(uint32 indexed day, bytes32 commitment);
    event PuzzleRevealed(uint32 indexed day, string answer);
    event Joined(address indexed player, uint256 starterPoints);
    event Solved(address indexed player, uint32 indexed day, uint8 guesses, uint32 streak, uint256 pointsAwarded);
    event PointsGranted(address indexed player, uint256 amount, string reason);
    event Traded(
        address indexed player,
        bytes32 indexed symbolHash,
        string symbol,
        bool isBuy,
        uint256 qty,
        uint256 price,
        uint256 value,
        int256 realizedPnl
    );

    error NotCommitted(uint32 day);
    error AlreadyCommitted(uint32 day);
    error AlreadySolved(address player, uint32 day);
    error BadGuessCount(uint8 guesses);
    error Expired();
    error BadSignature();
    error BadReveal();
    error NotAuthorized();
    error NonceUsed();
    error InsufficientPoints(uint256 needed, uint256 available);
    error InsufficientPosition(uint256 needed, uint256 available);
    error ZeroAmount();

    constructor(address initialOwner, address initialSigner) Ownable(initialOwner) EIP712("Tickr", "2") {
        signer = initialSigner;
        milestoneBonus[3] = 500 ether;
        milestoneBonus[7] = 1_500 ether;
        milestoneBonus[14] = 4_000 ether;
        milestoneBonus[30] = 10_000 ether;
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

    function setPointsConfig(uint256 starter, uint256 solveBase, uint256 perDay, uint256 cap) external onlyOwner {
        (starterPoints, solveBasePoints, streakBonusPerDay, streakBonusCap) = (starter, solveBase, perDay, cap);
    }

    function setMilestoneBonus(uint32 streak, uint256 amount) external onlyOwner {
        milestoneBonus[streak] = amount;
    }

    /// @notice Award points for other activities (events, trading competitions…).
    function grantPoints(address player, uint256 amount, string calldata reason) external onlyOwnerOrSigner {
        _join(player);
        points[player] += amount;
        emit PointsGranted(player, amount, reason);
    }

    function commitPuzzles(uint32[] calldata days_, bytes32[] calldata hashes) external onlyOwnerOrSigner {
        require(days_.length == hashes.length, "length");
        for (uint256 i; i < days_.length; ++i) {
            if (commitments[days_[i]] != bytes32(0)) revert AlreadyCommitted(days_[i]);
            commitments[days_[i]] = hashes[i];
            emit PuzzleCommitted(days_[i], hashes[i]);
        }
    }

    /// @notice Publish a past day's answer; anyone can check it against the commitment.
    function revealPuzzle(uint32 day, string calldata answer, bytes32 salt) external {
        if (keccak256(abi.encode(day, answer, salt)) != commitments[day]) revert BadReveal();
        revealedAnswers[day] = answer;
        emit PuzzleRevealed(day, answer);
    }

    // ───────────────────────────── players ─────────────────────────────

    /// @notice Gives a new player their starter points. Called automatically on first solve or trade.
    function join(address player) external {
        _join(player);
    }

    function _join(address player) internal {
        if (joined[player]) return;
        joined[player] = true;
        playerList.push(player);
        points[player] += starterPoints;
        emit Joined(player, starterPoints);
    }

    // ───────────────────────────── daily puzzle ─────────────────────────────

    function recordSolve(address player, uint32 day, uint8 guesses, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert Expired();
        if (guesses == 0 || guesses > 6) revert BadGuessCount(guesses);
        if (commitments[day] == bytes32(0)) revert NotCommitted(day);
        if (solvedIn[player][day] != 0) revert AlreadySolved(player, day);

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(SOLVE_TYPEHASH, player, day, guesses, deadline)));
        if (ECDSA.recover(digest, signature) != signer) revert BadSignature();

        _join(player);
        Player storage p = players[player];
        p.streak = (p.solves > 0 && p.lastDay + 1 == day) ? p.streak + 1 : 1;
        p.lastDay = day;
        p.solves += 1;
        p.totalGuesses += guesses;
        if (p.streak > p.bestStreak) p.bestStreak = p.streak;
        solvedIn[player][day] = guesses;

        uint256 bonus = streakBonusPerDay * p.streak;
        if (bonus > streakBonusCap) bonus = streakBonusCap;
        uint256 award = solveBasePoints * (7 - guesses) + bonus + milestoneBonus[p.streak];
        points[player] += award;

        emit Solved(player, day, guesses, p.streak, award);
    }

    // ───────────────────────────── demo trading ─────────────────────────────

    function trade(Quote calldata q, bytes calldata signature) external {
        if (block.timestamp > q.deadline) revert Expired();
        if (q.qty == 0) revert ZeroAmount();
        if (usedNonce[q.player][q.nonce]) revert NonceUsed();
        bytes32 symbolHash = keccak256(bytes(q.symbol));
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(QUOTE_TYPEHASH, q.player, symbolHash, q.isBuy, q.qty, q.price, q.nonce, q.deadline))
        );
        if (ECDSA.recover(digest, signature) != signer) revert BadSignature();
        usedNonce[q.player][q.nonce] = true;

        _join(q.player);
        Position storage pos = positions[q.player][symbolHash];
        uint256 value = q.qty * q.price / 1e18;
        int256 realized;

        if (q.isBuy) {
            if (points[q.player] < value) revert InsufficientPoints(value, points[q.player]);
            points[q.player] -= value;
            pos.qty += q.qty;
            pos.cost += value;
            if (heldIndex[q.player][symbolHash] == 0) {
                held[q.player].push(symbolHash);
                heldIndex[q.player][symbolHash] = held[q.player].length;
                if (bytes(symbolOf[symbolHash]).length == 0) symbolOf[symbolHash] = q.symbol;
            }
        } else {
            if (pos.qty < q.qty) revert InsufficientPosition(q.qty, pos.qty);
            uint256 basis = pos.cost * q.qty / pos.qty;
            pos.cost -= basis;
            pos.qty -= q.qty;
            points[q.player] += value;
            realized = int256(value) - int256(basis);
            if (pos.qty == 0) _removeHeld(q.player, symbolHash);
        }
        tradeCount += 1;
        emit Traded(q.player, symbolHash, q.symbol, q.isBuy, q.qty, q.price, value, realized);
    }

    function _removeHeld(address player, bytes32 symbolHash) internal {
        uint256 idx = heldIndex[player][symbolHash];
        bytes32[] storage arr = held[player];
        bytes32 last = arr[arr.length - 1];
        arr[idx - 1] = last;
        heldIndex[player][last] = idx;
        arr.pop();
        delete heldIndex[player][symbolHash];
        delete positions[player][symbolHash];
    }

    // ───────────────────────────── views ─────────────────────────────

    function getPortfolio(address player)
        external
        view
        returns (uint256 cash, string[] memory symbols, uint256[] memory qty, uint256[] memory cost)
    {
        bytes32[] storage h = held[player];
        symbols = new string[](h.length);
        qty = new uint256[](h.length);
        cost = new uint256[](h.length);
        for (uint256 i; i < h.length; ++i) {
            symbols[i] = symbolOf[h[i]];
            Position storage p = positions[player][h[i]];
            qty[i] = p.qty;
            cost[i] = p.cost;
        }
        cash = joined[player] ? points[player] : starterPoints;
    }

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
        returns (address[] memory addrs, Player[] memory stats, uint256[] memory cash)
    {
        uint256 n = playerList.length;
        if (offset >= n) return (new address[](0), new Player[](0), new uint256[](0));
        uint256 end = offset + limit > n ? n : offset + limit;
        addrs = new address[](end - offset);
        stats = new Player[](end - offset);
        cash = new uint256[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            address a = playerList[i];
            addrs[i - offset] = a;
            stats[i - offset] = players[a];
            cash[i - offset] = points[a];
        }
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
