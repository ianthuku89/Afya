import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
            accounts: { count: 10 },
        },
        besu_local: {
            url: process.env.BESU_RPC_URL || "http://127.0.0.1:8545",
            chainId: 1337,
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
        },
        besu_prod: {
            url: process.env.BESU_PROD_RPC_URL || "",
            chainId: Number(process.env.BESU_PROD_CHAIN_ID) || 5550,
            accounts: process.env.DEPLOYER_PRIVATE_KEY_PROD
                ? [process.env.DEPLOYER_PRIVATE_KEY_PROD]
                : [],
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    typechain: {
        outDir: "typechain-types",
        target: "ethers-v6",
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
    },
};

export default config;
