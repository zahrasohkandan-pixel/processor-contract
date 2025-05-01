import { ethers } from 'hardhat';

async function main() {
    const Usdc = await ethers.getContractFactory('Erc20Token');
    const usdc = await Usdc.deploy('USD Coin', 'USDC', 1000000, 6);
    await usdc.deployed();
    console.log('USDC deployed to:', usdc.address);

    const Usdt = await ethers.getContractFactory('Erc20Token');
    const usdt = await Usdt.deploy('Tether', 'USDT', 1000000, 6);
    await usdt.deployed();
    console.log('USDT deployed to:', usdt.address);

    const Dai = await ethers.getContractFactory('Erc20Token');
    const dai = await Dai.deploy('Dai', 'DAI', 1000000, 18);
    await dai.deployed();
    console.log('DAI deployed to:', dai.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
