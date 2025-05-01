import { ethers } from 'hardhat';

async function main() {
    const Processor = await ethers.getContractFactory('Processor');
    const processor = await Processor.deploy();
    await processor.deployed();

    console.log('Processor deployed to:', processor.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
