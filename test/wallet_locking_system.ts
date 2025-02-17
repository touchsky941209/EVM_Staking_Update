import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { Token } from "../typechain-types";


//wallet_locking_system
describe("wallet_locking_system", function () {
    async function deployFixture() {
        const [admin, user1, user2] = await ethers.getSigners();
        const ERC20Test = await ethers.getContractFactory("Token");
        const USDT = await ERC20Test.connect(user1).deploy("USDT", "USDT", 6, 100_000_000_000n);
        const USDC = await ERC20Test.connect(user1).deploy("USDC", "USDC", 6, 100_000_000_000n);

        const ETH = await ERC20Test.connect(user1).deploy("ETH", "ETH", 18, 100_000_000n);
        await USDT.waitForDeployment();
        await USDC.waitForDeployment();

        const _StakingContract = await ethers.getContractFactory("StakingContract");
        const StakingContract = await _StakingContract.deploy(admin);

        return {
            admin,
            user1,
            user2,
            USDC,
            USDT,
            StakingContract,
        }
    }


    //Wallet Factory Performance Test
    describe("Wallet Factory", async () => {
        // For testing, generate usdt and usdc tokens using decimal 6.
        it("should create token", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal("100000.0");
            const lockTime = 3 * 30 * 24* 3600;
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            await USDT.connect(user1).approve(StakingContract, amountToDeposit);
            await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal("99900.0");
        })

        //Only administrators can set administrator permissions.
        it("Should set user1 as admin", async () => {
            const { admin, user1, StakingContract } = await loadFixture(deployFixture)
            await StakingContract.connect(admin).setAdmin(user1)
        })
        //Cannot set administrator privileges if the caller is not an administrator.
        it("Should not set admin if caller is not admin", async () => {
            const { admin, user1, StakingContract } = await loadFixture(deployFixture)
            await expect(StakingContract.connect(user1).setAdmin(user1)).to.be.revertedWith("caller is not admin")
        })

        //Check who the owner is
        it("Owner verification", async () => {
            const { admin, user1, StakingContract } = await loadFixture(deployFixture)
            const adminAddress = await StakingContract.connect(user1).admin()
            await expect(adminAddress).to.equal(admin)
        })
    })


    //Token locking performance test
    describe("Token Locking Contract", async () => {

        //After user1 deposits USDT, the tokens need to be locked in the smart contract
        it("Should Token Lock in smart contract with user1", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            const lockTime = 3 * 30 * 24* 3600;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals

            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }

            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));

            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
        })

        //Withdrawal is not possible within 3 months from the date user1 deposited USDT.
        it("Should not withdraw in 3 months with user1", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));
            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
            await expect(StakingContract.connect(user1).WithDraw(1, USDT))
                .to.be.revertedWith("Lock time not elapsed");
        })

        //Withdrawal is possible within 3 months from the date user1 deposited USDT.
        it("Should withdraw after 3 month with user1", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }

            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));

            const threeMonthsInSeconds = 3 * 30 * 24 * 60 * 60; // Approximation
            await time.increase(threeMonthsInSeconds);
            await StakingContract.connect(user1).WithDraw(1, USDT) // Withdraw usdt from smart contract

            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
        })


        //After user2 deposits USDT, the tokens need to be locked in the smart contract
        it("Should Token Lock in smart contract with user2", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            const lockTime = 3 * 30 * 24* 3600;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals

            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }

            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));

            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
        })

        //Withdrawal is not possible within 3 months from the date user2 deposited USDT.
        it("Should not withdraw in 3 months with user2", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            const lockTime = 3 * 30 * 24* 3600;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals

            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));
            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
            await expect(StakingContract.connect(user1).WithDraw(1, USDT))
                .to.be.revertedWith("Lock time not elapsed");
        })

        //Withdrawal is possible within 3 months from the date user2 deposited USDT.
        it("Should withdraw after 3 month with user2", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }

            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));

            const threeMonthsInSeconds = 3 * 30 * 24 * 60 * 60; // Approximation
            await time.increase(threeMonthsInSeconds);
            await StakingContract.connect(user1).WithDraw(1, USDT) // Withdraw deposition index 1

            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
        })

    })


    //Reward calculation Test
    describe("RewardDistribution Contract", async () => {

        //Withdrawal is possible after 3 months with compensation for user1
        it("Should withdraw after 3 month with reward with user1", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }

            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));

            const threeMonthsInSeconds = 3 * 30 * 24 * 60 * 60; // Approximation

            await time.increase(threeMonthsInSeconds);
            await StakingContract.connect(user1).WithDraw(1, USDT)

            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
        })

        //Withdrawal is impossible after 3 months with compensation for user1
        it("Should not withdraw in 3 months with Reward with user1", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));
            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
            await expect(StakingContract.connect(user1).WithDraw(1, USDT))
                .to.be.revertedWith("Lock time not elapsed");
        })

        //Withdrawal is possible after 3 months with compensation for user2
        it("Should withdraw after 3 month with reward with user2", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }

            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));

            const threeMonthsInSeconds = 3 * 30 * 24 * 60 * 60; // Approximation

            await time.increase(threeMonthsInSeconds);
            await StakingContract.connect(user1).WithDraw(1, USDT)

            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
        })

        //Withdrawal is impossible after 3 months with compensation for user2
        it("Should not withdraw in 3 months with Reward with user2", async () => {
            const { USDT, USDC, StakingContract, admin, user1 } = await loadFixture(deployFixture)
            const initAmount = 100000.0;
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String(initAmount.toFixed(1)));
            const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDT, adjust decimals
            const lockTime = 3 * 30 * 24* 3600;
            for (let i = 0; i < 3; i++) {
                await USDT.connect(user1).approve(StakingContract, amountToDeposit);
                await StakingContract.connect(user1).Deposite(USDT, amountToDeposit, lockTime);
            }
            expect(await ethers.formatUnits(await USDT.balanceOf(user1), 6)).to.equal(String((initAmount - 3 * 100).toFixed(1)));
            const tokenList = await StakingContract.connect(user1).getStakingTokenList(user1.address)
            const startTimeList = await StakingContract.connect(user1).getStakingTokenStartTime(user1.address)
            const amountList = await StakingContract.connect(user1).getStakingTokenAmount(user1.address)
            console.log("Token list =>", tokenList)
            await expect(StakingContract.connect(user1).WithDraw(1, USDT))
                .to.be.revertedWith("Lock time not elapsed");
        })
    })
});
