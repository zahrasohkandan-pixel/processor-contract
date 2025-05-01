import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe('Recurrent Tests', function () {
    async function deployContracts() {
        const [admin, store, buyer, hacker] = await ethers.getSigners();

        console.log('admin:', admin.address);
        console.log('store:', store.address);
        console.log('buyer:', buyer.address);
        console.log('hacker:', hacker.address);

        const Usdc = await ethers.getContractFactory('Erc20Token');
        const usdc = await Usdc.connect(buyer).deploy('USD Coin', 'USDC', 1000000, 6);
        await usdc.deployed();
        console.log('USDC deployed to:', usdc.address);

        const Processor = await ethers.getContractFactory('Processor');
        const processor = await Processor.connect(admin).deploy();
        await processor.deployed();
        console.log('Processor deployed to:', processor.address);

        const amount = 100;
        const amountBig = BigNumber.from(amount).mul(10**6);
        const feeBig = amountBig.div(100);  // 1%

        const balanceUsdcOld = await usdc.balanceOf(buyer.address);
        console.log(`Buyer balance: ${balanceUsdcOld.toString()} USDC`);

        console.log(`Approving ${amountBig.toString()} USDC`);
        var tx = await usdc.connect(buyer).approve(processor.address, ethers.constants.MaxUint256);
        await tx.wait();
    
        return { usdc, processor, amountBig, feeBig, balanceUsdcOld };
    }
   
    it('PayAndSubscribe', async function () {
        const { usdc, processor, amountBig, feeBig, balanceUsdcOld } = await loadFixture(deployContracts);

        const [admin, store, buyer, hacker] = await ethers.getSigners();

        const interval = 60 * 60 * 24 * 30; // 30 days

        var tx = await processor.connect(buyer).payAndSubscribe(store.address, 'xyz_order', amountBig, feeBig, usdc.address, interval);
        await tx.wait();

        const subscription = await processor.getSubscription(store.address, buyer.address);

        expect(subscription.amount).to.equal(amountBig);
        expect(subscription.token).to.equal(usdc.address);
        expect(subscription.interval).to.equal(interval);
        expect(subscription.lastPaymentTime).to.equal(await time.latest());

        const balanceUsdcNew = await usdc.balanceOf(buyer.address);
        console.log(`Buyer balance: ${balanceUsdcNew.toString()} USDC`);

        expect(balanceUsdcNew).to.equal(balanceUsdcOld.sub(amountBig));
    });
   
    it('PayForSubscription', async function () {
        const { usdc, processor, amountBig, feeBig, balanceUsdcOld } = await loadFixture(deployContracts);

        const [admin, store, buyer, hacker] = await ethers.getSigners();

        const interval = 60 * 60 * 24 * 30; // 30 days

        var tx = await processor.connect(buyer).payAndSubscribe(store.address, 'xyz_order', amountBig, feeBig, usdc.address, interval);
        await tx.wait();

        var subscription = await processor.getSubscription(store.address, buyer.address);

        // Too soon
        await expect(processor.connect(admin).payForSubscription(store.address, buyer.address, 'xyz_order', amountBig, feeBig)).to.be.reverted;

        await time.increaseTo(subscription.lastPaymentTime.add(interval));

        // Not admin
        await expect(processor.connect(hacker).payForSubscription(store.address, buyer.address, 'xyz_order', amountBig, feeBig)).to.be.reverted;

        // No subscription
        await expect(processor.connect(admin).payForSubscription(store.address, hacker.address, 'xyz_order', amountBig, feeBig)).to.be.reverted;

        // No subscription
        await expect(processor.connect(admin).payForSubscription(hacker.address, buyer.address, 'xyz_order', amountBig, feeBig)).to.be.reverted;

        // Too much
        await expect(processor.connect(admin).payForSubscription(store.address, buyer.address, 'xyz_order', amountBig.mul(2), feeBig)).to.be.reverted;

        const amountNew = 101;
        const amountNewBig = BigNumber.from(amountNew).mul(10**6);

        var tx = await processor.connect(admin).payForSubscription(store.address, buyer.address, 'xyz_order', amountNewBig, feeBig);
        await tx.wait();

        subscription = await processor.getSubscription(store.address, buyer.address);

        expect(subscription.amount).to.equal(amountNewBig);
        expect(subscription.lastPaymentTime).to.equal(await time.latest());
    });
   
    it('Unsubscribe', async function () {
        const { usdc, processor, amountBig, feeBig, balanceUsdcOld } = await loadFixture(deployContracts);

        const [admin, store, buyer, hacker] = await ethers.getSigners();

        const interval = 60 * 60 * 24 * 30; // 30 days

        var tx = await processor.connect(buyer).payAndSubscribe(store.address, 'xyz_order', amountBig, feeBig, usdc.address, interval);
        await tx.wait();

        var subscription = await processor.getSubscription(store.address, buyer.address);
        expect(subscription.amount).to.equal(amountBig);

        // No subscription
        await expect(processor.connect(buyer).unsubscribe(hacker.address, buyer.address)).to.be.reverted;

        // No subscription
        await expect(processor.connect(store).unsubscribe(store.address, hacker.address)).to.be.reverted;

        // Caller not a merchant or buyer
        await expect(processor.connect(admin).unsubscribe(store.address, buyer.address)).to.be.reverted;

        var tx = await processor.connect(buyer).unsubscribe(store.address, buyer.address);
        await tx.wait();

        subscription = await processor.getSubscription(store.address, buyer.address);
        expect(subscription.amount).to.equal(ethers.constants.Zero);
    });
});
