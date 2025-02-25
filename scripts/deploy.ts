const { ethers, hardhatArguments } = require("hardhat");
const networks = require("./networks");
const fs = require("fs")
require('dotenv').config();

const Save_Deployment_History = async (chainId: any, deploymentsOutput: any) => {
    let existingData = {};
    try {
        const rawData = fs.readFileSync(`deployments/${chainId}.json`, 'utf8');
        existingData = JSON.parse(rawData);
    } catch (err) {
        // console.error("Error reading existing file:", err);
    }
    const updatedData = { ...existingData, ...deploymentsOutput };
    fs.writeFileSync(`deployments/${chainId}.json`, JSON.stringify(updatedData));

}

const USDC_TOKEN_Deployment = async (chainId: any) => {
    try {
        const USDC_TOKEN_Deployment_Transaction = await ethers.deployContract("Token", ["USDT", "USDT", 6, 100_000_000_000]);

        const deploymentsOutput = {
            USDC_TOKEN: await USDC_TOKEN_Deployment_Transaction.getAddress()
        }

        await Save_Deployment_History(chainId, deploymentsOutput)
        console.log("USDC_TOKEN was deployed to address ", await USDC_TOKEN_Deployment_Transaction.getAddress());
        console.log(" >>> Tx =>", USDC_TOKEN_Deployment_Transaction)
    } catch (err) {
        console.error("    >>> err =>", err)
    }
}

const WDAI_TOKEN_Deployment = async (chainId: any) => {
    const USDC_TOKEN_Deployment_Transaction = await ethers.deployContract("Token", ["usdt_token", "USDt_TOKEN", 6, 100_000_000_000_000]);

    const deploymentsOutput = {
        WDAI: await USDC_TOKEN_Deployment_Transaction.getAddress()
    }

    await Save_Deployment_History(chainId, deploymentsOutput)
    console.log("WDAI_TOKEN was deployed to address", await USDC_TOKEN_Deployment_Transaction.getAddress());
}

const BridgeT_Contract_Deployment = async (chainId: any) => {
    const BridgeToken = await ethers.deployContract("BridgeToken");

    const deploymentsOutput = {
        BridgeT: await BridgeToken.getAddress()
    }

    await Save_Deployment_History(chainId, deploymentsOutput)
    console.log("BridgeT deployed to address:", await BridgeToken.getAddress());
}

const EstokkYam_Contract_Deployment = async (chainId: any) => {
    const EstokkYam = await ethers.deployContract("EstokkYam");

    const deploymentsOutput = {
        EstokkYam: await EstokkYam.getAddress()
    }

    await Save_Deployment_History(chainId, deploymentsOutput)
    console.log("EstokkYam deployed to address:", await EstokkYam.getAddress());
}

const TokenFactory_Contract_Deployment = async (chainId: any) => {
    const TokenFactory = await ethers.deployContract("TokenFactory", []);

    const deploymentsOutput = {
        TokenFactory: await TokenFactory.getAddress()
    }

    await Save_Deployment_History(chainId, deploymentsOutput)
    console.log("TokenFactory deployed to address:", await TokenFactory.getAddress());
}

const Staking_Conract_Deployment = async (chainId: any, signer: any) => {
    try {
        console.log(">>>> Deploying contract ")
        const options = { gasLimit: 8000000 };
        const Staking_Contract = await ethers.deployContract("StakingContract", [signer], options)
        await Staking_Contract.waitForDeployment()
        const deploymentsOutput = {
            StakingContract: await Staking_Contract.getAddress()
        }
        await Save_Deployment_History(chainId, deploymentsOutput)
        console.log("StakingContract deployed to address:", await Staking_Contract.getAddress());
        console.log(">>>> tx =>", Staking_Contract)
    } catch (err) {
        console.error(err)
    } finally {
        console.log("Finisehd")

    }
}
async function main() {

    if (!fs.existsSync("deployments")) {
        fs.mkdirSync("deployments");
    }

    const [deployer] = await ethers.getSigners();
    const balance = Number(ethers.formatEther(await ethers.provider.getBalance(deployer)))
    const network = hardhatArguments.network
    const chainId = (await ethers.provider.getNetwork()).chainId
    const emoji = "\x1b[32m✔\x1b[0m"

    console.log("    Wallet: ", deployer.address);
    console.log("    Balance:", balance.toFixed(5), networks.symbol[chainId] || "Unknown");
    console.log("    Network =>", network)
    console.log("    ChainID =>", chainId)

    // await USDC_TOKEN_Deployment(chainId)
    await Staking_Conract_Deployment(chainId, deployer.address)
    // await WDAI_TOKEN_Deployment(chainId)
    // await BridgeT_Contract_Deployment(chainId)
    // await EstokkYam_Contract_Deployment(chainId)
    // await TokenFactory_Contract_Deployment(chainId)


    const afterBalance = Number(ethers.formatEther(await ethers.provider.getBalance(deployer)))
    console.log("Balance:", afterBalance.toFixed(5), networks.symbol[chainId] || "Unknown");

    const wastedGasFee = balance - Number(ethers.formatEther(await ethers.provider.getBalance(deployer)))
    console.log(wastedGasFee, networks.symbol[chainId] || "Unknown", "was wasted!")

    console.log(emoji, "Project was deployed successfully on", network)
}



main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });