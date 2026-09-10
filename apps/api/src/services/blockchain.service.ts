import { ethers } from 'ethers';
import { logger } from '../lib/logger.js';

// AfyaTokenToken ABI — minimal interface for oracle-signed server-side transactions
const AfyaTokenTokenABI = [
  "function mintToWallet(address to, uint256 amount) external returns (bool)",
  "function approveClaimPayment(uint256 claimId, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

function getProvider() {
  const providerUrl = process.env.BESU_RPC_URL || process.env.RPC_URL || 'http://127.0.0.1:8545';
  return new ethers.JsonRpcProvider(providerUrl);
}

function getSignerWallet() {
  const privateKey = process.env.SYSTEM_OPERATOR_PK || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  return new ethers.Wallet(privateKey, getProvider());
}

function getTokenContract() {
  const contractAddress = process.env.AfyaToken_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  return new ethers.Contract(contractAddress, AfyaTokenTokenABI, getSignerWallet());
}

export const blockchainService = {

  /**
   * Mint AfyaToken tokens to a user wallet — called by the Daraja callback
   * after a successful M-PESA payment. Server-side oracle signer pattern.
   */
  mintTokensToUser: async (userAddress: string, amount: number): Promise<string> => {
    try {
      const tokenContract = getTokenContract();
      logger.info(`Minting ${amount} AfyaToken to ${userAddress}`);

      const parsedAmount = ethers.parseUnits(amount.toString(), 18);
      const tx = await tokenContract.mintToWallet(userAddress, parsedAmount);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      logger.error('Blockchain Minting Failure:', error);
      throw new Error('Failed to execute blockchain minting protocol.');
    }
  },

  /**
   * Transfer AfyaToken tokens between wallets — called by POST /wallet/transfer.
   * The system operator signs on behalf (custodial wallet model).
   */
  transferTokens: async (fromAddress: string, toAddress: string, amount: number): Promise<string> => {
    try {
      const tokenContract = getTokenContract();
      logger.info(`Transferring ${amount} AfyaToken from ${fromAddress} to ${toAddress}`);

      const parsedAmount = ethers.parseUnits(amount.toString(), 18);
      const tx = await tokenContract.transfer(toAddress, parsedAmount);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      logger.error('Blockchain Transfer Failure:', error);
      throw new Error('Failed to execute blockchain transfer.');
    }
  },

  /**
   * Check on-chain AfyaToken balance for a wallet address.
   */
  getBalance: async (walletAddress: string): Promise<number> => {
    try {
      const tokenContract = getTokenContract();
      const balance = await tokenContract.balanceOf(walletAddress);
      return Number(ethers.formatUnits(balance, 18));
    } catch (error) {
      logger.error('Balance check failed:', error);
      return 0;
    }
  }
};


