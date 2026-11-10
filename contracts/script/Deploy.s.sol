// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TickrGame} from "../src/TickrGame.sol";

/// Deploys TickrGame.
///   PRIVATE_KEY     deployer / owner key (also the default signer)
///   SIGNER_ADDRESS  game-server signer (optional)
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address signer = vm.envOr("SIGNER_ADDRESS", deployer);
        vm.startBroadcast(pk);
        TickrGame game = new TickrGame(deployer, signer);
        vm.stopBroadcast();
        console.log("TickrGame:", address(game));
    }
}
