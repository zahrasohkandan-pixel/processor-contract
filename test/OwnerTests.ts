import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const TEN_P_18 = BigNumber.from('1000000000000000000');

const price = 10;

describe('Processor Tests', function () {
    async function deployContracts() {
        const [owner, newOnwer, newAdmin, hacker] = await ethers.getSigners();

        const Processor = await ethers.getContractFactory('Processor');
        const processor = await Processor.connect(owner).deploy();
        await processor.deployed();
        console.log('Processor deployed to:', processor.address);
    
        return { processor };
    }

    it('Change Admin', async function () {
        const { processor } = await loadFixture(deployContracts);

        const [owner, newOnwer, newAdmin, hacker] = await ethers.getSigners();

        await expect(processor.connect(hacker).changeAdmin(hacker.address)).to.be.reverted;

        var tx = await processor.connect(owner).changeAdmin(newAdmin.address);
        await tx.wait();

        expect(await processor.admin()).to.equal(newAdmin.address);
    });

    it('Change Owner', async function () {
        const { processor } = await loadFixture(deployContracts);

        const [owner, newOnwer, newAdmin, hacker] = await ethers.getSigners();

        await expect(processor.connect(hacker).transferOwnership(hacker.address)).to.be.reverted;

        var tx = await processor.connect(owner).transferOwnership(newOnwer.address);
        await tx.wait();

        expect(await processor.owner()).to.equal(newOnwer.address);
    });

    it('Set Max Rate Increase', async function () {
        const { processor } = await loadFixture(deployContracts);

        const [owner, newOnwer, newAdmin, hacker] = await ethers.getSigners();

        const newMaxRateIncrease = BigNumber.from(285388127854);

        await expect(processor.connect(hacker).setMaxRateIncrease(newMaxRateIncrease)).to.be.reverted;

        var tx = await processor.connect(owner).setMaxRateIncrease(newMaxRateIncrease);
        await tx.wait();

        expect(await processor.maxRateIncrease()).to.equal(newMaxRateIncrease);
    });
});
