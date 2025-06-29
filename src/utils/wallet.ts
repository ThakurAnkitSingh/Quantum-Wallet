import * as bip39 from "bip39"; // Imports the BIP39 library for mnemonic phrase generation and handling
import { BIP32Factory } from "bip32"; // Imports BIP32 for hierarchical deterministic wallet functionality
import * as ecc from "@bitcoinerlab/secp256k1"; // Imports elliptic curve cryptography for key generation
import { ethers } from "ethers"; // Imports ethers.js library for Ethereum blockchain interactions
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction as SolanaTransaction,
} from "@solana/web3.js"; // Imports Solana web3 libraries for Solana blockchain interactions
import { Buffer } from "buffer"; // Imports Buffer for binary data handling

// Defines the structure for a wallet account with all necessary properties
export interface WalletAccount {
  id: string; // Unique identifier for the account
  name: string; // User-friendly name for the account
  blockchain: "ethereum" | "solana"; // The blockchain this account belongs to
  address: string; // The public address of the account
  privateKey: string; // The private key (sensitive data)
  publicKey: string; // The public key
  balance: string; // The account balance as a string
  mnemonic: string; // The recovery phrase for the account
  derivationPath: string; // The HD wallet derivation path
}

// Defines the structure for a blockchain transaction
export interface Transaction {
  id: string; // Unique identifier for the transaction
  from: string; // Sender address
  to: string; // Recipient address
  amount: string; // Amount being transferred
  blockchain: "ethereum" | "solana"; // The blockchain this transaction is on
  status: "pending" | "confirmed" | "failed"; // Current status of the transaction
  timestamp: number; // When the transaction was created
  hash?: string; // Optional transaction hash from the blockchain
}

// Main wallet management class implementing the Singleton pattern
export class WalletManager {
  private static instance: WalletManager; // Static instance for Singleton pattern
  private accounts: WalletAccount[] = []; // Stores all wallet accounts
  private transactions: Transaction[] = []; // Stores all transactions

  // Returns the singleton instance of WalletManager
  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  // Validates if an address is a valid Ethereum address
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Validates if an address is likely a valid Solana address
  private isValidSolanaAddress(address: string): boolean {
    try {
      // Try to create a PublicKey object to validate the address
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Generates a new mnemonic phrase with 256 bits of entropy (24 words)
  async generateMnemonic(): Promise<string> {
    return bip39.generateMnemonic(256); // 24 words
  }

  // Creates a new wallet account based on blockchain type and mnemonic
  async createAccount(
    name: string, // User-provided account name
    blockchain: "ethereum" | "solana", // Blockchain type
    mnemonic: string, // Recovery phrase
    accountIndex: number = 0 // Index for HD wallet derivation
  ): Promise<WalletAccount> {
    console.log(
      `Creating ${blockchain} account: ${name} at index ${accountIndex}`
    );
    console.log(`Current accounts count: ${this.accounts.length}`);

    // More thorough duplicate checking
    // Check if account with same blockchain and index already exists
    const existingAccountByIndex = this.accounts.find(
      (acc) =>
        acc.blockchain === blockchain &&
        acc.id === `${blockchain}-${accountIndex}`
    );

    if (existingAccountByIndex) {
      console.error(
        `Account with blockchain ${blockchain} and index ${accountIndex} already exists`
      );
      throw new Error(
        `Account with blockchain ${blockchain} and index ${accountIndex} already exists`
      );
    }

    // Check if account with same name already exists
    const existingAccountByName = this.accounts.find(
      (acc) => acc.blockchain === blockchain && acc.name === name
    );

    if (existingAccountByName) {
      console.error(
        `Account with name ${name} for ${blockchain} already exists`
      );
      throw new Error(
        `Account with name "${name}" for ${blockchain} already exists`
      );
    }

    // Convert mnemonic to seed for HD wallet generation
    const seed = await bip39.mnemonicToSeed(mnemonic);
    // Create HD wallet root node from seed
    const hdNode = BIP32Factory(ecc).fromSeed(seed);

    let address: string;
    let privateKey: string;
    let publicKey: string;
    let derivationPath: string;

    if (blockchain === "ethereum") {
      // For Ethereum accounts, use BIP44 path with coin type 60
      derivationPath = `m/44'/60'/0'/0/${accountIndex}`;
      const ethNode = hdNode.derivePath(derivationPath); // Derive the specific account node
      privateKey = Buffer.from(ethNode.privateKey!).toString("hex"); // Convert private key to hex
      const ethWallet = new ethers.Wallet(`0x${privateKey}`); // Create Ethereum wallet
      address = ethWallet.address; // Get Ethereum address
      publicKey = ethWallet.address; // For Ethereum, public key is same as address
    } else {
      // For Solana accounts, use BIP44 path with coin type 501
      derivationPath = `m/44'/501'/0'/0'/${accountIndex}'`;
      const solNode = hdNode.derivePath(derivationPath); // Derive the specific account node

      // Create Solana keypair from the derived private key
      const privateKeyBytes = solNode.privateKey!;
      const keypair = Keypair.fromSeed(Uint8Array.from(privateKeyBytes));

      // Store just the 32-byte private key as hex
      privateKey = Buffer.from(privateKeyBytes).toString("hex");
      address = keypair.publicKey.toString(); // Get Solana address
      publicKey = keypair.publicKey.toString(); // Get Solana public key

      console.log(
        "Created Solana keypair with public key:",
        keypair.publicKey.toString()
      );
    }

    // Create the account object with all necessary information
    const account: WalletAccount = {
      id: `${blockchain}-${accountIndex}`, // Create unique ID
      name,
      blockchain,
      address,
      privateKey,
      publicKey,
      balance: "0", // Initialize with zero balance
      mnemonic,
      derivationPath,
    };

    console.log(`Account created: ${account.id} - ${account.address}`);
    this.accounts.push(account); // Add to accounts array
    console.log(`Total accounts after creation: ${this.accounts.length}`);
    return account;
  }

  // Returns all wallet accounts
  getAccounts(): WalletAccount[] {
    return this.accounts;
  }

  // Finds and returns a specific account by ID
  getAccount(id: string): WalletAccount | undefined {
    return this.accounts.find((account) => account.id === id);
  }

  // Fetches the current balance for an account from the blockchain
  async getBalance(account: WalletAccount): Promise<string> {
    try {
      if (account.blockchain === "ethereum") {
        // For Ethereum, connect to Sepolia testnet via Infura
        const provider = new ethers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
        );
        // Get balance in wei
        const balance = await provider.getBalance(account.address);
        // Convert wei to ether and return
        return ethers.formatEther(balance);
      } else {
        // For Solana, connect to devnet
        const connection = new Connection(
          "https://api.devnet.solana.com",
          "confirmed"
        );
        const publicKey = new PublicKey(account.address);
        // Get balance in lamports
        const balance = await connection.getBalance(publicKey);
        // Convert lamports to SOL and return
        return (balance / LAMPORTS_PER_SOL).toString();
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0"; // Return zero on error
    }
  }

  // Sends a transaction from one account to another address
  async sendTransaction(
    fromAccount: WalletAccount, // Sender account
    toAddress: string, // Recipient address
    amount: string // Amount to send
  ): Promise<Transaction> {
    console.log(
      `Sending transaction: ${amount} from ${fromAccount.address} to ${toAddress}`
    );

    // Validate inputs to prevent errors
    if (!toAddress || !amount || parseFloat(amount) <= 0) {
      throw new Error("Invalid transaction parameters");
    }

    // Add blockchain-specific address validation
    if (fromAccount.blockchain === "ethereum") {
      if (!this.isValidEthereumAddress(toAddress)) {
        throw new Error(
          "Invalid Ethereum address format. Must start with 0x followed by 40 hex characters."
        );
      }
    } else {
      if (!this.isValidSolanaAddress(toAddress)) {
        throw new Error(
          "Invalid Solana address format. Must be a valid Solana public key."
        );
      }
    }

    // Create transaction object with initial pending status
    const transaction: Transaction = {
      id: Date.now().toString(), // Use timestamp as ID
      from: fromAccount.address,
      to: toAddress,
      amount,
      blockchain: fromAccount.blockchain,
      status: "pending",
      timestamp: Date.now(),
    };

    try {
      if (fromAccount.blockchain === "ethereum") {
        // For Ethereum transactions
        const provider = new ethers.JsonRpcProvider(
          "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
        );

        // Create wallet with private key and provider
        const wallet = new ethers.Wallet(
          `0x${fromAccount.privateKey}`,
          provider
        );

        // Check if account has sufficient balance
        const balance = await provider.getBalance(fromAccount.address);
        const amountWei = ethers.parseEther(amount); // Convert ETH to wei

        if (balance < amountWei) {
          throw new Error("Insufficient balance");
        }

        // Send the transaction
        const tx = await wallet.sendTransaction({
          to: toAddress,
          value: amountWei,
        });

        console.log(`Ethereum transaction sent: ${tx.hash}`);
        transaction.hash = tx.hash;

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        transaction.status = receipt ? "confirmed" : "failed";
      } else {
        // For Solana transactions
        const connection = new Connection(
          "https://api.devnet.solana.com",
          "confirmed"
        );

        // Create public keys for sender and recipient
        const fromPubkey = new PublicKey(fromAccount.address);
        const toPubkey = new PublicKey(toAddress);

        // Create keypair from private key for signing
        let keypair;
        try {
          // Convert the hex private key to Uint8Array
          const privateKeyBytes = Uint8Array.from(
            Buffer.from(fromAccount.privateKey, "hex")
          );

          // Create keypair from seed (private key)
          keypair = Keypair.fromSeed(privateKeyBytes);

          // Verify the keypair matches our address
          if (keypair.publicKey.toString() !== fromAccount.address) {
            throw new Error("Derived keypair doesn't match account address");
          }

          // Check if account has sufficient balance
          const balance = await connection.getBalance(fromPubkey);
          const lamports = parseFloat(amount) * LAMPORTS_PER_SOL; // Convert SOL to lamports

          if (balance < lamports) {
            throw new Error("Insufficient balance");
          }

          // Create Solana transaction for token transfer
          const solTransaction = new SolanaTransaction().add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey,
              lamports: Math.floor(lamports),
            })
          );

          // Get recent blockhash for transaction validity window
          const { blockhash } = await connection.getLatestBlockhash();
          solTransaction.recentBlockhash = blockhash;
          solTransaction.feePayer = fromPubkey; // Set fee payer

          // Sign and send transaction
          const signature = await connection.sendTransaction(solTransaction, [
            keypair,
          ]);

          console.log(`Solana transaction sent: ${signature}`);
          transaction.hash = signature;

          // Confirm transaction
          const confirmation = await connection.confirmTransaction(signature);
          transaction.status = confirmation.value.err ? "failed" : "confirmed";
        } catch (error) {
          console.error("Error creating Solana keypair:", error);
          throw new Error(
            `Failed to create Solana keypair: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      this.transactions.push(transaction); // Add to transactions array

      // Update account balance after transaction
      fromAccount.balance = await this.getBalance(fromAccount);

      return transaction;
    } catch (error) {
      console.error("Transaction failed:", error);
      transaction.status = "failed"; // Update status to failed
      this.transactions.push(transaction); // Still store failed transactions
      throw error; // Re-throw for caller to handle
    }
  }

  // Returns transactions, optionally filtered by account ID
  getTransactions(accountId?: string): Transaction[] {
    if (accountId) {
      const account = this.getAccount(accountId);
      if (!account) return [];

      // If accountId provided, filter transactions for that account
      return this.transactions.filter((tx) => tx.from === account.address);
    }
    return this.transactions; // Otherwise return all transactions
  }

  // Requests an airdrop of SOL from the Solana devnet faucet
  async requestSolanaAirdrop(
    account: WalletAccount,
    amount: number = 1
  ): Promise<string> {
    if (account.blockchain !== "solana") {
      throw new Error("Airdrop can only be requested for Solana accounts");
    }

    try {
      // Connect to Solana devnet
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      // Create public key from account address
      const publicKey = new PublicKey(account.address);

      // Request airdrop (amount in SOL, converted to lamports)
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );

      // Confirm transaction
      await connection.confirmTransaction(signature);

      // Update account balance
      account.balance = await this.getBalance(account);

      return signature;
    } catch (error) {
      console.error("Error requesting SOL airdrop:", error);
      throw error;
    }
  }

  // Provides information about requesting test ETH from Sepolia faucet
  async requestEthereumAirdrop(account: WalletAccount): Promise<string> {
    if (account.blockchain !== "ethereum") {
      throw new Error("This method is only for Ethereum accounts");
    }

    // Unlike Solana, Ethereum testnets don't have a programmatic faucet we can call directly
    // So we'll return instructions for the user to get test ETH

    // First, update the account balance in case they already have ETH
    account.balance = await this.getBalance(account);

    // Return a message with faucet links
    return `To get test ETH for ${account.address}, use one of these Sepolia faucets:
    1. Alchemy Faucet: https://sepoliafaucet.com/
    2. Infura Faucet: https://www.infura.io/faucet/sepolia
    3. QuickNode Faucet: https://faucet.quicknode.com/ethereum/sepolia
    
    You'll need to connect your wallet or paste your address: ${account.address}`;
  }
}
