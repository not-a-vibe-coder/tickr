// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TickrWifPot} from "../src/TickrWifPot.sol";

/// Deploys TickrWifPot on Robinhood Chain mainnet and (optionally) moves FUND_AMOUNT $WIF into it.
///   PRIVATE_KEY   deployer / owner / signer key
///   WIF_TOKEN     $WIF address
///   REWARD_UNIT, DAILY_CAP, CLUE_PRICE   in wei (18 decimals)
///   BURN_BPS      share of clue payments burned (default 2000 = 20%)
///   FUND_AMOUNT   $WIF (wei) to move into the pot after deploy (default 0)
contract DeployWifPot is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        IERC20 wif = IERC20(vm.envAddress("WIF_TOKEN"));
        uint256 fundAmount = vm.envOr("FUND_AMOUNT", uint256(0));

        vm.startBroadcast(pk);
        TickrWifPot pot = new TickrWifPot(
            deployer,
            deployer,
            wif,
            vm.envUint("REWARD_UNIT"),
            vm.envUint("DAILY_CAP"),
            vm.envUint("CLUE_PRICE"),
            uint16(vm.envOr("BURN_BPS", uint256(2000)))
        );
        if (fundAmount > 0) {
            wif.approve(address(pot), fundAmount);
            pot.fund(fundAmount);
        }
        vm.stopBroadcast();
        console.log("TickrWifPot:", address(pot));
        console.log("pot balance:", pot.pot());
    }
}
