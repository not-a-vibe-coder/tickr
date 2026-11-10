// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TickrGame} from "../src/TickrGame.sol";
import {MockStockToken} from "../src/mocks/MockStockToken.sol";

contract TickrGameTest is Test {
    TickrGame game;
    MockStockToken tsla;
    uint256 signerKey = 0xA11CE;
    address signer;
    address owner = address(0x0123);
    address alice = address(0xA1);
    address relayer = address(0xBEEF);

    function setUp() public {
        signer = vm.addr(signerKey);
        game = new TickrGame(owner, signer);
        tsla = new MockStockToken("Tesla Test", "TSLA");
        tsla.mint(address(game), 100 ether);
        vm.prank(owner);
        game.setMilestone(3, address(tsla), 1 ether);

        uint32[] memory d = new uint32[](10);
        bytes32[] memory h = new bytes32[](10);
        for (uint32 i; i < 10; ++i) {
            d[i] = 100 + i;
            h[i] = keccak256(abi.encode(d[i], "AMD", bytes32(uint256(i))));
        }
        vm.prank(owner);
        game.commitPuzzles(d, h);
    }

    function _sig(address player, uint32 day, uint8 guesses, uint256 deadline) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(game.SOLVE_TYPEHASH(), player, day, guesses, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", game.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _solve(address player, uint32 day, uint8 guesses) internal {
        uint256 dl = block.timestamp + 1 hours;
        vm.prank(relayer);
        game.recordSolve(player, day, guesses, dl, _sig(player, day, guesses, dl));
    }

    function test_streakBuildsAndPaysMilestone() public {
        _solve(alice, 100, 4);
        _solve(alice, 101, 2);
        assertEq(tsla.balanceOf(alice), 0);
        _solve(alice, 102, 6);
        (uint32 lastDay, uint32 streak, uint32 best, uint32 solves, uint32 total) = game.players(alice);
        assertEq(lastDay, 102);
        assertEq(streak, 3);
        assertEq(best, 3);
        assertEq(solves, 3);
        assertEq(total, 12);
        assertEq(tsla.balanceOf(alice), 1 ether, "milestone reward");
        assertEq(game.playerCount(), 1);
    }

    function test_missedDayResetsStreak() public {
        _solve(alice, 100, 3);
        _solve(alice, 101, 3);
        _solve(alice, 103, 3);
        (, uint32 streak, uint32 best,,) = game.players(alice);
        assertEq(streak, 1);
        assertEq(best, 2);
        assertEq(game.liveStreak(alice, 103), 1);
        assertEq(game.liveStreak(alice, 105), 0);
    }

    function test_cannotSolveTwice() public {
        _solve(alice, 100, 3);
        uint256 dl = block.timestamp + 1 hours;
        bytes memory sig = _sig(alice, 100, 3, dl);
        vm.expectRevert(abi.encodeWithSelector(TickrGame.AlreadySolved.selector, alice, uint32(100)));
        game.recordSolve(alice, 100, 3, dl, sig);
    }

    function test_rejectsForgedSignature() public {
        uint256 dl = block.timestamp + 1 hours;
        bytes memory sig = _sig(alice, 100, 3, dl);
        vm.expectRevert(TickrGame.BadSignature.selector);
        game.recordSolve(alice, 100, 1, dl, sig); // tampered guess count
    }

    function test_rejectsUncommittedDayAndExpired() public {
        uint256 dl = block.timestamp + 1 hours;
        bytes memory s500 = _sig(alice, 500, 3, dl);
        vm.expectRevert(abi.encodeWithSelector(TickrGame.NotCommitted.selector, uint32(500)));
        game.recordSolve(alice, 500, 3, dl, s500);

        bytes memory sig = _sig(alice, 100, 3, dl);
        vm.warp(dl + 1);
        vm.expectRevert(TickrGame.Expired.selector);
        game.recordSolve(alice, 100, 3, dl, sig);
    }

    function test_unfundedMilestoneDoesNotRevert() public {
        vm.prank(owner);
        game.withdraw(address(tsla), owner, 100 ether);
        _solve(alice, 100, 3);
        _solve(alice, 101, 3);
        _solve(alice, 102, 3);
        assertEq(tsla.balanceOf(alice), 0);
    }

    function test_revealMatchesCommitment() public {
        game.revealPuzzle(101, "AMD", bytes32(uint256(1)));
        assertEq(game.revealedAnswers(101), "AMD");
        vm.expectRevert(TickrGame.BadReveal.selector);
        game.revealPuzzle(102, "TSLA", bytes32(uint256(2)));
    }

    function test_onlyOwnerOrSignerCommits() public {
        uint32[] memory d = new uint32[](1);
        bytes32[] memory h = new bytes32[](1);
        d[0] = 900;
        h[0] = bytes32("x");
        vm.expectRevert(TickrGame.NotAuthorized.selector);
        vm.prank(alice);
        game.commitPuzzles(d, h);
        vm.prank(signer);
        game.commitPuzzles(d, h);
        assertEq(game.commitments(900), bytes32("x"));
    }
}
