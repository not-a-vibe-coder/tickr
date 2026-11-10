// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TickrGame} from "../src/TickrGame.sol";
import {MockStockToken} from "../src/mocks/MockStockToken.sol";

/// Deploys TickrGame.
///   PRIVATE_KEY       deployer / owner key
///   SIGNER_ADDRESS    game server signer (defaults to deployer)
///   REWARD_TOKENS     comma-separated token addresses for milestones 3,7,14,30 (optional)
///   REWARD_AMOUNT     amount per milestone in wei units (default 1e17 = 0.1 token)
///   DEPLOY_MOCKS=true deploy local mock stock tokens (anvil only) and fund the pool
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address signer = vm.envOr("SIGNER_ADDRESS", deployer);
        uint256 amount = vm.envOr("REWARD_AMOUNT", uint256(1e17));
        bool mocks = vm.envOr("DEPLOY_MOCKS", false);

        vm.startBroadcast(pk);
        TickrGame game = new TickrGame(deployer, signer);
        console.log("TickrGame:", address(game));

        uint32[4] memory streaks = [uint32(3), 7, 14, 30];
        address[] memory tokens = new address[](4);
        if (mocks) {
            string[4] memory syms = ["TSLA", "AMZN", "PLTR", "AMD"];
            for (uint256 i; i < 4; ++i) {
                MockStockToken t = new MockStockToken(string.concat(syms[i], " (local test)"), syms[i]);
                t.mint(address(game), 1000 ether);
                tokens[i] = address(t);
                console.log(syms[i], address(t));
            }
        } else {
            address[] memory fromEnv = vm.envOr("REWARD_TOKENS", ",", new address[](0));
            for (uint256 i; i < fromEnv.length && i < 4; ++i) tokens[i] = fromEnv[i];
        }
        for (uint256 i; i < 4; ++i) {
            if (tokens[i] != address(0)) game.setMilestone(streaks[i], tokens[i], amount);
        }
        vm.stopBroadcast();
    }
}
