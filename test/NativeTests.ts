import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

describe('Processor Tests', function () {
    async function deployContracts() {
        const [proc, store, buyer, admin] = await ethers.getSigners();

        const Processor = await ethers.getContractFactory('Processor');
        const processor = await Processor.connect(proc).deploy();
        await processor.deployed();
        console.log('Processor deployed to:', processor.address);
    
        return { processor };
    }

    it('Pay', async function () {
        const { processor } = await loadFixture(deployContracts);

        const [proc, store, buyer, admin] = await ethers.getSigners();

        const amount = 100;
        const amountBig = BigNumber.from(amount).mul(ethers.constants.WeiPerEther);
        const feeBig = amountBig.div(100);  // 1%

        const balanceBuyerOld = await ethers.provider.getBalance(buyer.address);
        console.log(`Buyer old balance: ${balanceBuyerOld.toString()} ETH`);

        const balanceStoreOld = await ethers.provider.getBalance(store.address);
        console.log(`Store old balance: ${balanceStoreOld.toString()} ETH`);

        var tx = await processor.connect(buyer).payNativeCoin(store.address, 'xyz_order', feeBig, {value: amountBig});
        await tx.wait();

        const balanceBuyerNew = await ethers.provider.getBalance(buyer.address);
        console.log(`Buyer new balance: ${balanceBuyerNew.toString()} ETH, diff: ${balanceBuyerOld.sub(balanceBuyerNew).div(ethers.constants.WeiPerEther)}`);

        const balanceStoreNew = await ethers.provider.getBalance(store.address);
        console.log(`Store new balance: ${balanceStoreNew.toString()} ETH, diff: ${balanceStoreNew.sub(balanceStoreOld).div(ethers.constants.WeiPerEther)}`);

        expect(balanceBuyerOld.sub(balanceBuyerNew).div(ethers.constants.WeiPerEther)).to.equal(amount);
    });
});