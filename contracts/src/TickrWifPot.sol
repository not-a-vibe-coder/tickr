// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TickrWifPot
/// @notice The $WIF loop for Tickr's daily case, on Robinhood Chain mainnet.
///   Earn:  solve the daily case → the game server signs (player, day, guesses) → anyone relays it →
///          this contract pays `rewardUnit × (7 − guesses)` $WIF from the pot (fewer guesses, bigger reward).
///          Payouts per day are capped by `dailyCap`, so a leaked signer key can't drain more than one day.
///   Spend: stuck on today's case? pay `cluePrice` $WIF to unlock the next clue early.
///          `burnBps` of it is burned, the rest refills the pot for future solvers.
/// Day = days since the Unix epoch (UTC), matching the game server.
contract TickrWifPot is Ownable, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant BURN = 0x000000000000000000000000000000000000dEaD;
    uint8 public constant MAX_GUESSES = 6;
    uint8 public constant MAX_CLUES = 5;
    uint16 public constant MAX_BURN_BPS = 5000;

    bytes32 public constant REWARD_TYPEHASH =
        keccak256("Reward(address player,uint32 day,uint8 guesses,uint256 deadline)");

    IERC20 public immutable wif;
    address public signer;
    uint256 public rewardUnit; // $WIF per "point": a 1-guess solve earns 6 units, a 6-guess solve earns 1
    uint256 public dailyCap; // max $WIF paid out per day
    uint256 public cluePrice; // $WIF per extra clue
    uint16 public burnBps; // share of clue payments burned (basis points)

    mapping(uint32 => uint256) public paidOn; // day => $WIF paid out
    mapping(address => mapping(uint32 => bool)) public claimed; // player => day => rewarded
    mapping(address => mapping(uint32 => uint8)) public cluesBought; // player => day => extra clues
    uint256 public totalPaid;
    uint256 public totalBurned;
    uint256 public totalClueSpend;

    event Rewarded(address indexed player, uint32 indexed day, uint8 guesses, uint256 amount);
    event ClueBought(address indexed player, uint32 indexed day, uint8 clueNumber, uint256 price, uint256 burned);
    event Funded(address indexed from, uint256 amount);
    event ConfigChanged(uint256 rewardUnit, uint256 dailyCap, uint256 cluePrice, uint16 burnBps);
    event SignerChanged(address signer);

    error BadDay();
    error Expired();
    error AlreadyClaimed();
    error BadGuesses();
    error BadSignature();
    error NoCluesLeft();
    error BadConfig();

    constructor(
        address initialOwner,
        address initialSigner,
        IERC20 token,
        uint256 rewardUnit_,
        uint256 dailyCap_,
        uint256 cluePrice_,
        uint16 burnBps_
    ) Ownable(initialOwner) EIP712("TickrWifPot", "1") {
        wif = token;
        signer = initialSigner;
        _setConfig(rewardUnit_, dailyCap_, cluePrice_, burnBps_);
        emit SignerChanged(initialSigner);
    }

    // ───────────────────────── admin ─────────────────────────

    function setSigner(address newSigner) external onlyOwner {
        signer = newSigner;
        emit SignerChanged(newSigner);
    }

    function setConfig(uint256 rewardUnit_, uint256 dailyCap_, uint256 cluePrice_, uint16 burnBps_) external onlyOwner {
        _setConfig(rewardUnit_, dailyCap_, cluePrice_, burnBps_);
    }

    function _setConfig(uint256 rewardUnit_, uint256 dailyCap_, uint256 cluePrice_, uint16 burnBps_) internal {
        if (burnBps_ > MAX_BURN_BPS) revert BadConfig();
        rewardUnit = rewardUnit_;
        dailyCap = dailyCap_;
        cluePrice = cluePrice_;
        burnBps = burnBps_;
        emit ConfigChanged(rewardUnit_, dailyCap_, cluePrice_, burnBps_);
    }

    /// @notice Owner can pull $WIF back out (e.g. to end the season).
    function withdraw(address to, uint256 amount) external onlyOwner {
        wif.safeTransfer(to, amount);
    }

    // ───────────────────────── pot ─────────────────────────

    /// @notice Anyone can top up the pot (requires an approval first).
    function fund(uint256 amount) external nonReentrant {
        wif.safeTransferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    function pot() public view returns (uint256) {
        return wif.balanceOf(address(this));
    }

    function today() public view returns (uint32) {
        return uint32(block.timestamp / 1 days);
    }

    /// @notice What a solve in `guesses` would pay right now on `day` (0 if the day's cap or the pot is spent).
    function quote(uint32 day, uint8 guesses) public view returns (uint256) {
        if (guesses == 0 || guesses > MAX_GUESSES) return 0;
        uint256 amount = rewardUnit * (MAX_GUESSES + 1 - guesses);
        uint256 left = dailyCap > paidOn[day] ? dailyCap - paidOn[day] : 0;
        uint256 bal = pot();
        if (amount > left) amount = left;
        if (amount > bal) amount = bal;
        return amount;
    }

    // ───────────────────────── earn ─────────────────────────

    /// @notice Pays a daily solve. `signature` is the game server's EIP-712 Reward signature.
    ///         Callable by anyone (the server relays it so players never pay gas); $WIF always goes to `player`.
    function claimReward(address player, uint32 day, uint8 guesses, uint256 deadline, bytes calldata signature)
        external
        nonReentrant
        returns (uint256 amount)
    {
        if (block.timestamp > deadline) revert Expired();
        uint32 t = today();
        if (day > t || day + 1 < t) revert BadDay(); // today, or yesterday for a solve finished at midnight
        if (guesses == 0 || guesses > MAX_GUESSES) revert BadGuesses();
        if (claimed[player][day]) revert AlreadyClaimed();
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REWARD_TYPEHASH, player, day, guesses, deadline)));
        if (ECDSA.recover(digest, signature) != signer) revert BadSignature();

        claimed[player][day] = true;
        amount = quote(day, guesses);
        if (amount > 0) {
            paidOn[day] += amount;
            totalPaid += amount;
            wif.safeTransfer(player, amount);
        }
        emit Rewarded(player, day, guesses, amount);
    }

    // ───────────────────────── spend ─────────────────────────

    /// @notice Pay `cluePrice` $WIF (approve first) to unlock the next clue on today's case early.
    function buyClue(uint32 day) external nonReentrant {
        uint32 t = today();
        if (day > t || day + 1 < t) revert BadDay();
        uint8 n = cluesBought[msg.sender][day];
        if (n >= MAX_CLUES) revert NoCluesLeft();
        cluesBought[msg.sender][day] = n + 1;

        uint256 price = cluePrice;
        uint256 burned = (price * burnBps) / 10_000;
        totalClueSpend += price;
        totalBurned += burned;
        wif.safeTransferFrom(msg.sender, address(this), price - burned);
        if (burned > 0) wif.safeTransferFrom(msg.sender, BURN, burned);
        emit ClueBought(msg.sender, day, n + 1, price, burned);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
