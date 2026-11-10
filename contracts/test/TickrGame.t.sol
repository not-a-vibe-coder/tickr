// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TickrGame} from "../src/TickrGame.sol";

contract TickrGameTest is Test {
    TickrGame game;
    uint256 signerKey = 0xA11CE;
    address signer;
    address owner = address(0x0123);
    address alice = address(0xA1);
    address relayer = address(0xBEEF);
    uint256 nonce;

    function setUp() public {
        signer = vm.addr(signerKey);
        game = new TickrGame(owner, signer);
        uint32[] memory d = new uint32[](10);
        bytes32[] memory h = new bytes32[](10);
        for (uint32 i; i < 10; ++i) {
            d[i] = 100 + i;
            h[i] = keccak256(abi.encode(d[i], "AMD", bytes32(uint256(i))));
        }
        vm.prank(owner);
        game.commitPuzzles(d, h);
    }

    function _signDigest(bytes32 structHash) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", game.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _solve(address player, uint32 day, uint8 guesses) internal {
        uint256 dl = block.timestamp + 1 hours;
        bytes memory sig = _signDigest(keccak256(abi.encode(game.SOLVE_TYPEHASH(), player, day, guesses, dl)));
        vm.prank(relayer);
        game.recordSolve(player, day, guesses, dl, sig);
    }

    function _quote(address player, string memory sym, bool isBuy, uint256 qty, uint256 price)
        internal
        returns (TickrGame.Quote memory q, bytes memory sig)
    {
        q = TickrGame.Quote(player, sym, isBuy, qty, price, ++nonce, block.timestamp + 60);
        sig = _signDigest(
            keccak256(abi.encode(game.QUOTE_TYPEHASH(), q.player, keccak256(bytes(sym)), isBuy, qty, price, q.nonce, q.deadline))
        );
    }

    function _trade(address player, string memory sym, bool isBuy, uint256 qty, uint256 price) internal {
        (TickrGame.Quote memory q, bytes memory sig) = _quote(player, sym, isBuy, qty, price);
        vm.prank(relayer);
        game.trade(q, sig);
    }

    // ── daily ──

    function test_solveAwardsPointsAndStreak() public {
        _solve(alice, 100, 4); // 10k starter + 100*3 + 20*1
        assertEq(game.points(alice), 10_000 ether + 300 ether + 20 ether);
        _solve(alice, 101, 1); // + 600 + 40
        _solve(alice, 102, 6); // + 100 + 60 + 500 milestone(3)
        (uint32 lastDay, uint32 streak, uint32 best, uint32 solves, uint32 total) = game.players(alice);
        assertEq(lastDay, 102);
        assertEq(streak, 3);
        assertEq(best, 3);
        assertEq(solves, 3);
        assertEq(total, 11);
        assertEq(game.points(alice), 10_000 ether + 320 ether + 640 ether + 660 ether);
        assertEq(game.playerCount(), 1);
    }

    function test_missedDayResetsStreak() public {
        _solve(alice, 100, 3);
        _solve(alice, 101, 3);
        _solve(alice, 103, 3);
        (, uint32 streak, uint32 best,,) = game.players(alice);
        assertEq(streak, 1);
        assertEq(best, 2);
        assertEq(game.liveStreak(alice, 105), 0);
    }

    function test_cannotSolveTwiceOrForge() public {
        _solve(alice, 100, 3);
        uint256 dl = block.timestamp + 1 hours;
        bytes memory sig = _signDigest(keccak256(abi.encode(game.SOLVE_TYPEHASH(), alice, uint32(100), uint8(3), dl)));
        vm.expectRevert(abi.encodeWithSelector(TickrGame.AlreadySolved.selector, alice, uint32(100)));
        game.recordSolve(alice, 100, 3, dl, sig);

        bytes memory sig2 = _signDigest(keccak256(abi.encode(game.SOLVE_TYPEHASH(), alice, uint32(101), uint8(3), dl)));
        vm.expectRevert(TickrGame.BadSignature.selector);
        game.recordSolve(alice, 101, 1, dl, sig2);
    }

    function test_uncommittedDayRejected() public {
        uint256 dl = block.timestamp + 1 hours;
        bytes memory sig = _signDigest(keccak256(abi.encode(game.SOLVE_TYPEHASH(), alice, uint32(500), uint8(3), dl)));
        vm.expectRevert(abi.encodeWithSelector(TickrGame.NotCommitted.selector, uint32(500)));
        game.recordSolve(alice, 500, 3, dl, sig);
    }

    function test_revealMatchesCommitment() public {
        game.revealPuzzle(101, "AMD", bytes32(uint256(1)));
        assertEq(game.revealedAnswers(101), "AMD");
        vm.expectRevert(TickrGame.BadReveal.selector);
        game.revealPuzzle(102, "TSLA", bytes32(uint256(2)));
    }

    // ── trading ──

    function test_buySellRealizesPnl() public {
        _trade(alice, "TSLA", true, 10 ether, 250 ether); // spend 2,500
        assertEq(game.points(alice), 7_500 ether);
        (uint256 cash, string[] memory syms, uint256[] memory qty, uint256[] memory cost) = game.getPortfolio(alice);
        assertEq(cash, 7_500 ether);
        assertEq(syms.length, 1);
        assertEq(syms[0], "TSLA");
        assertEq(qty[0], 10 ether);
        assertEq(cost[0], 2_500 ether);

        _trade(alice, "TSLA", false, 4 ether, 300 ether); // +1,200, basis 1,000 → +200 realized
        assertEq(game.points(alice), 8_700 ether);
        (, , qty, cost) = game.getPortfolio(alice);
        assertEq(qty[0], 6 ether);
        assertEq(cost[0], 1_500 ether);

        _trade(alice, "TSLA", false, 6 ether, 200 ether); // closes position
        (, syms,,) = game.getPortfolio(alice);
        assertEq(syms.length, 0);
        assertEq(game.points(alice), 9_900 ether);
    }

    function test_multiplePositionsAndRemoval() public {
        _trade(alice, "TSLA", true, 1 ether, 100 ether);
        _trade(alice, "AMD", true, 1 ether, 100 ether);
        _trade(alice, "NVDA", true, 1 ether, 100 ether);
        _trade(alice, "TSLA", false, 1 ether, 100 ether);
        (, string[] memory syms,,) = game.getPortfolio(alice);
        assertEq(syms.length, 2);
        _trade(alice, "TSLA", true, 2 ether, 100 ether);
        (, syms,,) = game.getPortfolio(alice);
        assertEq(syms.length, 3);
    }

    function test_cannotOverspendOrOversell() public {
        (TickrGame.Quote memory q, bytes memory sig) = _quote(alice, "TSLA", true, 100 ether, 250 ether);
        vm.expectRevert(abi.encodeWithSelector(TickrGame.InsufficientPoints.selector, 25_000 ether, 10_000 ether));
        game.trade(q, sig);
        game.join(alice);
        (q, sig) = _quote(alice, "AMD", false, 1 ether, 100 ether);
        vm.expectRevert(abi.encodeWithSelector(TickrGame.InsufficientPosition.selector, 1 ether, 0));
        game.trade(q, sig);
    }

    function test_quoteReplayTamperAndExpiry() public {
        (TickrGame.Quote memory q, bytes memory sig) = _quote(alice, "TSLA", true, 1 ether, 100 ether);
        game.trade(q, sig);
        vm.expectRevert(TickrGame.NonceUsed.selector);
        game.trade(q, sig);

        (q, sig) = _quote(alice, "TSLA", true, 1 ether, 100 ether);
        q.price = 1 ether; // tamper
        vm.expectRevert(TickrGame.BadSignature.selector);
        game.trade(q, sig);

        (q, sig) = _quote(alice, "TSLA", true, 1 ether, 100 ether);
        vm.warp(q.deadline + 1);
        vm.expectRevert(TickrGame.Expired.selector);
        game.trade(q, sig);
    }

    function test_analytics() public {
        address bob = address(0xB0B);
        _trade(alice, "TSLA", true, 2 ether, 100 ether);
        _trade(bob, "TSLA", true, 1 ether, 110 ether);
        _trade(alice, "AMD", true, 1 ether, 50 ether);
        (uint32 holders, uint32 trades, uint256 vol) = game.symbolStats(keccak256("TSLA"));
        assertEq(holders, 2);
        assertEq(trades, 2);
        assertEq(vol, 310 ether);

        _trade(alice, "TSLA", false, 2 ether, 120 ether); // alice exits TSLA
        (holders, trades,) = game.symbolStats(keccak256("TSLA"));
        assertEq(holders, 1);
        assertEq(trades, 3);
        assertEq(game.totalVolume(), 310 ether + 50 ether + 240 ether);

        (TickrGame.TradeRecord[] memory rec, string[] memory syms) = game.getRecentTrades(10);
        assertEq(rec.length, 4);
        assertEq(syms[0], "TSLA");
        assertEq(rec[0].player, alice);
        assertFalse(rec[0].isBuy);
        assertEq(syms[1], "AMD");

        (rec, syms) = game.getPlayerTrades(alice, 2);
        assertEq(rec.length, 2);
        assertEq(syms[0], "TSLA");
        assertEq(syms[1], "AMD");
        assertEq(game.tradeCountOf(bob), 1);

        (string[] memory all, TickrGame.SymbolStats[] memory st) = game.getSymbolStats();
        assertEq(all.length, 2);
        assertEq(st[1].holders, 1); // AMD
    }

    function test_recentRingWraps() public {
        for (uint256 i; i < 70; ++i) _trade(alice, "TSLA", true, 1 ether, 1 ether);
        (TickrGame.TradeRecord[] memory rec,) = game.getRecentTrades(100);
        assertEq(rec.length, 64);
        assertEq(game.tradeCount(), 70);
    }

    function test_grantPointsAuth() public {
        vm.expectRevert(TickrGame.NotAuthorized.selector);
        vm.prank(alice);
        game.grantPoints(alice, 1 ether, "x");
        vm.prank(signer);
        game.grantPoints(alice, 1 ether, "weekly top 10");
        assertEq(game.points(alice), 10_001 ether);
    }
}
