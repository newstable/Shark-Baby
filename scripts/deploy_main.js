const fs = require("fs");
const colors = require("colors");
const SHARKBABYToken = require("../artifacts/contracts/sharkbaby.sol/SHARKBABYOKEN.json");
const StakingABI = require("../artifacts/contracts/staking.sol/Staking.json").abi;
const { ethers } = require("hardhat");
const ERC20ABI =
	require("../artifacts/contracts/dexfactory.sol/IERC20.json").abi;

async function main() {
	// get network
	var [owner] = await ethers.getSigners();

	let network = await owner.provider._networkPromise;
	let chainId = network.chainId;

	console.log(chainId,owner.address);

	var exchangeRouter;

	var sharkbabyToken;
	var sharkToken;
	var babyToken;

	var stakingTokenPool;
    
    exchangeRouter = {
        address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    };
    sharkToken = { address: process.env.SHARKADDRESS };
    babyToken = { address: process.env.BABYADDRESS };

    const SHARKBABYTOKEN = await ethers.getContractFactory("SHARKBABYOKEN");
    sharkbabyToken = await SHARKBABYTOKEN.deploy(exchangeRouter.address);
    await sharkbabyToken.deployed();

        
    const Staking = await ethers.getContractFactory("Staking");
    stakingTokenPool = await Staking.deploy(
        sharkbabyToken.address,
        sharkToken.address,
        babyToken.address
    );
    await stakingTokenPool.deployed();

    console.log("stakingTokenPool", stakingTokenPool.address.yellow);

    var tx = await stakingTokenPool.setInitialAddresses(exchangeRouter.address, process.env.MARKETINGADDRESS);
    await tx.wait();
        	//setFeeAddress
    try {
        tx = await sharkbabyToken.setFeeAddresses(
            process.env.MARKETINGADDRESS,
            process.env.GAMINGADDRESS,
            stakingTokenPool.address
        );

        await tx.wait();
    } catch (err) {
        console.log("setFee error: ", err);
    }
        

    var SharkbabyTokenContract = {
        address: sharkbabyToken.address,
        abi: SHARKBABYToken.abi,
    };

	// save cotracts object that deployed for using in web3
	var contractObject = {
		sharkbabyToken: SharkbabyTokenContract,
		stakingTokenPool: {
			address: stakingTokenPool.address,
			abi: StakingABI,
		},
	};
	fs.writeFileSync(
		`./build/${network.chainId}.json`,
		JSON.stringify(contractObject, undefined, 4)
	);
}

main()
	.then(() => {
		console.log("complete".green);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
