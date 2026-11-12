// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TickrWifPot} from "../src/TickrWifPot.sol";

contract MockWif is ERC20 {
    constructor() ERC20("World is Flat", "WIF") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TickrWifPotTest is Test {
    MockWif wif;
    TickrWifPot pot;
    address owner = address(0xA11CE);
    uint256 signerPk = 0xB0B;
    address signer;
    address player = address(0xCAFE);
    address relayer = address(0xBEEF);
    uint32 day;

    uint256 constant UNIT = 10 ether; // 10 WIF per unit
    uint256 constant CAP = 100 ether; // 100 WIF per day
    uint256 constant CLUE = 5 ether; // 5 WIF per clue
    uint16 constant BURN = 2000; // 20%

    function setUp() public {
        vm.warp(20768 days + 3 hours);
        day = uint32(block.timestamp / 1 days);
        signer = vm.addr(signerPk);
        wif = new MockWif();
        pot = new TickrWifPot(owner, signer, IERC20(address(wif)), UNIT, CAP, CLUE, BURN);
        wif.mint(address(this), 1_000 ether);
        wif.approve(address(pot), type(uint256).max);
        pot.fund(500 ether);
    }

    function _sig(address p, uint32 d, uint8 g, uint256 deadline) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(pot.REWARD_TYPEHASH(), p, d, g, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", pot.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_rewardScalesWithGuessesAndPaysPlayer() public {
        uint256 dl = block.timestamp + 10 minutes;
        vm.prank(relayer);
        uint256 got = pot.claimReward(player, day, 2, dl, _sig(player, day, 2, dl));
        assertEq(got, UNIT * 5);
        assertEq(wif.balanceOf(player), UNIT * 5);
        assertEq(wif.balanceOf(relayer), 0);
        assertTrue(pot.claimed(player, day));
        assertEq(pot.paidOn(day), UNIT * 5);
    }

    function test_cannotClaimTwiceOrForge() public {
        uint256 dl = block.timestamp + 10 minutes;
        bytes memory sig = _sig(player, day, 3, dl);
        pot.claimReward(player, day, 3, dl, sig);
        vm.expectRevert(TickrWifPot.AlreadyClaimed.selector);
        pot.claimReward(player, day, 3, dl, sig);

        // tampered guesses (1 instead of 6) → signature no longer matches
        address other = address(0xD00D);
        bytes memory sig6 = _sig(other, day, 6, dl);
        vm.expectRevert(TickrWifPot.BadSignature.selector);
        pot.claimReward(other, day, 1, dl, sig6);

        // signature for someone else can't pay a different player
        vm.expectRevert(TickrWifPot.BadSignature.selector);
        pot.claimReward(address(0xE11E), day, 6, dl, sig6);

        // a non-signer key is rejected
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", pot.domainSeparator(), keccak256(abi.encode(pot.REWARD_TYPEHASH(), other, day, uint8(6), dl))));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBAD, digest);
        vm.expectRevert(TickrWifPot.BadSignature.selector);
        pot.claimReward(other, day, 6, dl, abi.encodePacked(r, s, v));
    }

    function test_dailyCapLimitsPayouts() public {
        uint256 dl = block.timestamp + 10 minutes;
        uint256 total;
        for (uint160 i = 1; i <= 5; i++) {
            address p = address(i + 1000);
            total += pot.claimReward(p, day, 1, dl, _sig(p, day, 1, dl)); // 60 WIF asked each
        }
        assertEq(total, CAP);
        assertEq(pot.paidOn(day), CAP);
        // next day the cap resets
        uint256 tomorrow = (uint256(day) + 1) * 1 days + 3 hours;
        vm.warp(tomorrow);
        uint32 d2 = day + 1;
        uint256 dl2 = tomorrow + 10 minutes;
        assertEq(pot.claimReward(player, d2, 1, dl2, _sig(player, d2, 1, dl2)), UNIT * 6);
    }

    function test_potRunningDryPaysWhatIsLeft() public {
        uint256 drain = pot.pot() - 7 ether;
        vm.prank(owner);
        pot.withdraw(owner, drain);
        uint256 dl = block.timestamp + 10 minutes;
        assertEq(pot.claimReward(player, day, 1, dl, _sig(player, day, 1, dl)), 7 ether);
        address p2 = address(0x2222);
        assertEq(pot.claimReward(p2, day, 1, dl, _sig(p2, day, 1, dl)), 0); // marks claimed, pays nothing
        assertTrue(pot.claimed(p2, day));
    }

    function test_expiredAndWrongDayRejected() public {
        uint256 dl = block.timestamp - 1;
        bytes memory sig = _sig(player, day, 2, dl);
        vm.expectRevert(TickrWifPot.Expired.selector);
        pot.claimReward(player, day, 2, dl, sig);

        uint256 ok = block.timestamp + 10 minutes;
        bytes memory sigTomorrow = _sig(player, day + 1, 2, ok);
        bytes memory sigOld = _sig(player, day - 2, 2, ok);
        bytes memory sig7 = _sig(address(0x3333), day, 7, ok);
        vm.expectRevert(TickrWifPot.BadDay.selector);
        pot.claimReward(player, day + 1, 2, ok, sigTomorrow);
        vm.expectRevert(TickrWifPot.BadDay.selector);
        pot.claimReward(player, day - 2, 2, ok, sigOld);
        // yesterday is still allowed (solve finished just after midnight)
        assertEq(pot.claimReward(player, day - 1, 2, ok, _sig(player, day - 1, 2, ok)), UNIT * 5);

        vm.expectRevert(TickrWifPot.BadGuesses.selector);
        pot.claimReward(address(0x3333), day, 7, ok, sig7);
    }

    function test_buyClueRefillsPotAndBurns() public {
        wif.mint(player, 100 ether);
        uint256 potBefore = pot.pot();
        vm.startPrank(player);
        wif.approve(address(pot), type(uint256).max);
        pot.buyClue(day);
        pot.buyClue(day);
        vm.stopPrank();
        assertEq(pot.cluesBought(player, day), 2);
        assertEq(pot.pot() - potBefore, 2 * (CLUE - (CLUE * BURN) / 10_000));
        assertEq(wif.balanceOf(pot.BURN()), 2 * (CLUE * BURN) / 10_000);
        assertEq(wif.balanceOf(player), 100 ether - 2 * CLUE);
        assertEq(pot.totalBurned(), 2 * (CLUE * BURN) / 10_000);
    }

    function test_clueLimitAndDayChecks() public {
        wif.mint(player, 100 ether);
        vm.startPrank(player);
        wif.approve(address(pot), type(uint256).max);
        for (uint256 i; i < 5; i++) pot.buyClue(day);
        vm.expectRevert(TickrWifPot.NoCluesLeft.selector);
        pot.buyClue(day);
        vm.expectRevert(TickrWifPot.BadDay.selector);
        pot.buyClue(day + 1);
        vm.stopPrank();
    }

    function test_onlyOwnerAdmin() public {
        vm.expectRevert();
        pot.setConfig(1, 1, 1, 0);
        vm.expectRevert();
        pot.withdraw(address(this), 1);
        vm.expectRevert();
        pot.setSigner(address(1));
        vm.startPrank(owner);
        vm.expectRevert(TickrWifPot.BadConfig.selector);
        pot.setConfig(1, 1, 1, 5001);
        pot.setConfig(2 ether, 50 ether, 1 ether, 1000);
        vm.stopPrank();
        assertEq(pot.rewardUnit(), 2 ether);
        assertEq(pot.quote(day, 1), 12 ether);
    }
}
