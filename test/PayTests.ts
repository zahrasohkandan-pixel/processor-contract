import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe('Processor Tests', function () {
    async function deployContracts() {
        const [proc, store, buyer] = await ethers.getSigners();

        const Usdc = await ethers.getContractFactory('Erc20Token');
        const usdc = await Usdc.connect(proc).deploy('USD Coin', 'USDC', 1000000, 6);
        await usdc.deployed();
        console.log('USDC deployed to:', usdc.address);

        const Processor = await ethers.getContractFactory('Processor');
        const processor = await Processor.connect(proc).deploy();
        await processor.deployed();
        console.log('Processor deployed to:', processor.address);
    
        return { usdc, processor };
    }

    it('Pay', async function () {
        const { usdc, processor } = await loadFixture(deployContracts);

        const [proc, store, buyer] = await ethers.getSigners();

        const amount = 100;
        const amountBig = BigNumber.from(amount).mul(10**6);
        const feeBig = amountBig.div(100);  // 1%

        var tx = await usdc.connect(proc).transfer(buyer.address, amountBig);
        await tx.wait();

        const balanceUsdcOld = await usdc.balanceOf(buyer.address);
        console.log(`Buyer balance: ${balanceUsdcOld.toString()} USDC`);

        console.log(`Approving ${amountBig.toString()} USDC`);

        var tx = await usdc.connect(buyer).approve(processor.address, amountBig);
        await tx.wait();

        tx = await processor.connect(buyer).pay(store.address, 'xyz_order', amountBig, feeBig, usdc.address);
        await tx.wait();

        const balanceUsdcNew = await usdc.balanceOf(buyer.address);
        console.log(`Buyer balance: ${balanceUsdcNew.toString()} USDC`);

        const balanceUsdcStore = await usdc.balanceOf(store.address);
        console.log(`Store balance: ${balanceUsdcStore.toString()} USDC`);

        const balanceUsdcProc = await usdc.balanceOf(proc.address);

        expect(balanceUsdcNew).to.equal(0);
        expect(balanceUsdcStore).to.equal(amountBig.sub(feeBig));
        expect(balanceUsdcProc).to.equal(BigNumber.from(1000000).mul(10**6).sub(amountBig.sub(feeBig)));
    });
});
