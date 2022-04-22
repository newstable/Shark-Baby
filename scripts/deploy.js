const fs = require("fs");
const colors = require("colors");
const SHARKBABYToken = require("../artifacts/contracts/sharkbaby.sol/SHARKBABYOKEN.json");
const Staking = require("../artifacts/contracts/staking.sol/Staking.json");
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
	var exchangeFactory;
	var wICICB;

	var sharkbabyToken;
	var sharkToken;
	var babyToken;

	var stakingTokenPool;

	var ICICBSwapV2PairContract;

	// if it is fantom testnet, it use own exchange contract
	if (chainId === 4002 || chainId === 1337 || chainId === 26 || chainId === 417) {
		/* ----------- factory -------------- */
		//deploy factory contract for test
		const Factory = await ethers.getContractFactory("ICICBSwapFactory");
		exchangeFactory = await Factory.deploy(owner.address);
		await exchangeFactory.deployed();
		console.log(await exchangeFactory.INIT_CODE_PAIR_HASH());

		console.log("exchangeFactory", exchangeFactory.address.yellow);
		/* ----------- WICICB -------------- */
		//deploy WICICB contract for test
		const WICICB = await ethers.getContractFactory("WICICB");
		wICICB = await WICICB.deploy();
		await wICICB.deployed();

		console.log("WICICB", wICICB.address.yellow);

		/* ----------- Router -------------- */
		//deploy Router contract for test
		const Router = await ethers.getContractFactory("ICICBSwapRouter");
		exchangeRouter = await Router.deploy(
			exchangeFactory.address,
			wICICB.address
		);
		await exchangeRouter.deployed();

		console.log("exchangeRouter", exchangeRouter.address.yellow);
	} else {
		// if it is binance smart chain, it use ICICBSwap contract
		exchangeRouter = {
			address: "0x8e12fD09f7A761AABaD0C8E0e574d797FE27b8A6",
		};
		sharkToken = { address: process.env.SHARKADDRESS };
		babyToken = { address: process.env.BABYADDRESS };
	}
    // eslint-disable-next-line no-lone-blocks
    {
        /* ----------- SharkbabyToken -------------- */
        {
        	const SHARKBABYTOKEN = await ethers.getContractFactory("SHARKBABYOKEN");
        	sharkbabyToken = await SHARKBABYTOKEN.deploy();
        	await sharkbabyToken.deployed();
        	console.log("sharkbabyToken", sharkbabyToken.address.yellow);

        	var tx = await sharkbabyToken.setInitialAddresses(
        		exchangeRouter.address
        	);
        	await tx.wait();

        	//set paircontract
        	var pairAddress = await sharkbabyToken.ICICBSwapV2Pair();
        	ICICBSwapV2PairContract = new ethers.Contract(
        		pairAddress,
        		ERC20ABI,
        		owner
        	);

        	//shark and baby token
        	const ERC20TOKEN = await ethers.getContractFactory("ERC20");
        	sharkToken = await ERC20TOKEN.deploy("AutoShark", "SHARK");
        	await sharkToken.deployed();
        	console.log("sharkToken", sharkToken.address.yellow);

        	babyToken = await ERC20TOKEN.deploy("Babyswap", "BABY");
        	await babyToken.deployed();
        	console.log("babyToken", babyToken.address.yellow);

        	var tx = await sharkbabyToken.approve(
        		exchangeRouter.address,
        		ethers.utils.parseUnits("100000000", 18)
        	);
        	await tx.wait();

        	var tx = await sharkToken.approve(
        		exchangeRouter.address,
        		ethers.utils.parseUnits("100000000", 18)
        	);
        	await tx.wait();

        	var tx = await babyToken.approve(
        		exchangeRouter.address,
        		ethers.utils.parseUnits("100000000", 18)
        	);
        	await tx.wait();

        	tx = await exchangeRouter.addLiquidity(
        		sharkbabyToken.address,
        		sharkToken.address,
        		ethers.utils.parseUnits("500000", 18),
        		ethers.utils.parseUnits("500000", 18),
        		0,
        		0,
        		owner.address,
        		"111111111111111111111"
        	);
        	await tx.wait();

        	tx = await exchangeRouter.addLiquidity(
        		sharkbabyToken.address,
        		babyToken.address,
        		ethers.utils.parseUnits("500000", 18),
        		ethers.utils.parseUnits("500000", 18),
        		0,
        		0,
        		owner.address,
        		"111111111111111111111"
        	);
        	await tx.wait();
        }

        /* ----------- staking -------------- */
        {
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
        }

        if (chainId === 4002 || chainId === 1337) {
        	tx = await sharkbabyToken.excludeAddressFromFee(owner.address, true);
        	await tx.wait();
        	tx = await sharkbabyToken.approve(
        		exchangeRouter.address,
        		ethers.utils.parseUnits("100000000", 18)
        	);
        	await tx.wait();

        	try {
        		tx = await exchangeRouter.addLiquidityETH(
        			sharkbabyToken.address,
        			ethers.utils.parseUnits("5000", 18),
        			0,
        			0,
        			owner.address,
        			"111111111111111111111",
        			{ value: ethers.utils.parseUnits("1", 18) }
        		);
        		await tx.wait();
        	} catch (err) {
        		console.log("add liquidity error: ", err);
        	}

        	console.log("------------addLiquidityETH".yellow);

        	tx = await sharkToken.approve(
        		exchangeRouter.address,
        		ethers.utils.parseUnits("1000000", 18)
        	);
        	await tx.wait();
        	tx = await babyToken.approve(
        		exchangeRouter.address,
        		ethers.utils.parseUnits("1000000", 18)
        	);
        	await tx.wait();

        	tx = await exchangeRouter.addLiquidity(
        		sharkbabyToken.address,
        		sharkToken.address,
        		ethers.utils.parseUnits("50000", 18),
        		ethers.utils.parseUnits("10000", 18),
        		0,
        		0,
        		owner.address,
        		"111111111111111111111"
        	);
        	await tx.wait();

        	console.log("----------addLiquidity sharkToken".yellow);

        	tx = await exchangeRouter.addLiquidity(
        		sharkbabyToken.address,
        		babyToken.address,
        		ethers.utils.parseUnits("50000", 18),
        		ethers.utils.parseUnits("10000", 18),
        		0,
        		0,
        		owner.address,
        		"111111111111111111111"
        	);
        	await tx.wait();

        	tx = await sharkbabyToken.excludeAddressFromFee(owner.address, false);
        	await tx.wait();

        	console.log("----------addLiquidity babyToken".yellow);
        }

        if (chainId === 4002 || chainId === 1337) {
        	//transfer test
        	var swapAmount = ethers.utils.parseUnits("100000", 18);

        	tx =
        		await exchangeRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
        			swapAmount,
        			0,
        			[sharkbabyToken.address, wICICB.address],
        			owner.address,
        			"99000000000000000"
        		);
        	await tx.wait();
        	console.log("----------swapExactTokensForETH".yellow);

        	tx =
        		await exchangeRouter.swapExactETHForTokensSupportingFeeOnTransferTokens(
        			0,
        			[wICICB.address, sharkbabyToken.address],
        			owner.address,
        			"99000000000000000",
        			{ value: ethers.utils.parseUnits("0.1", 18) }
        		);
        	await tx.wait();
        	console.log("----------swapExactETHForTokens".yellow);
        }

        var SharkbabyTokenContract = {
        	address: sharkbabyToken.address,
        	abi: SHARKBABYToken.abi,
        };
    }
	// save cotracts object that deployed for using in web3
	var contractObject = {
		sharkbabyToken: SharkbabyTokenContract,
		stakingTokenPool: {
			address: stakingTokenPool.address,
			abi: Staking.abi,
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
