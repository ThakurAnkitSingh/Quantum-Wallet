# Quantum Wallet

A modern, multi-chain cryptocurrency wallet supporting Ethereum and Solana networks.

![Quantum Wallet](https://img.shields.io/badge/Quantum-Wallet-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.x-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)

## Features

- **Multi-Chain Support**: Manage both Ethereum and Solana accounts in one application
- **Hierarchical Deterministic (HD) Wallets**: Create multiple accounts from a single mnemonic phrase
- **Secure Key Management**: Private keys are stored securely in-memory only
- **Test Network Integration**: Connected to Ethereum Sepolia and Solana Devnet
- **Transaction Management**: Send and receive transactions on both blockchains
- **Built-in Faucet Access**: Request test tokens directly from the interface
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **Blockchain Libraries**:
  - Ethereum: ethers.js
  - Solana: @solana/web3.js
- **Cryptography**: bip39, bip32, secp256k1
- **Build Tools**: Vite, PostCSS

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/quantum-wallet.git
   cd quantum-wallet
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### Creating a New Wallet

1. Click the "Create Account" button in the top-right corner
2. Enter a name for your account
3. Select the blockchain (Ethereum or Solana)
4. Click "Create"

### Getting Test Tokens

#### For Ethereum (Sepolia):

1. Select your Ethereum account
2. Click "Request ETH"
3. Follow the instructions to visit an external faucet
4. Paste your wallet address to receive test ETH

#### For Solana (Devnet):

1. Select your Solana account
2. Click "Request SOL"
3. Test SOL will be automatically sent to your account

### Sending Transactions

1. Select the account you want to send from
2. Click "Send"
3. Enter the recipient address
4. Enter the amount to send
5. Click "Send"
6. Wait for transaction confirmation

### Viewing Transaction History

1. Select an account
2. Scroll down to see the transaction history section
3. All transactions will be displayed with status and timestamp

## Security Considerations

- This wallet is for educational and testing purposes only
- Never use this wallet for real cryptocurrency or on mainnet
- Private keys are stored in-memory and will be lost when the browser is closed
- No sensitive data is sent to any server

## Development Roadmap

- [ ] Add support for ERC-20 and SPL tokens
- [ ] Implement wallet import functionality
- [ ] Add transaction fee estimation
- [ ] Support for additional blockchains (Bitcoin, Polygon, etc.)
- [ ] Implement secure local storage encryption
- [ ] Add address book functionality

## Architecture

Quantum Wallet uses a modular architecture:

1. **WalletManager**: Core singleton class that manages accounts and transactions
2. **Blockchain Adapters**: Specialized code for interacting with each blockchain
3. **UI Components**: React components for user interaction
4. **Cryptographic Utilities**: Functions for key generation and signing

### Key Generation Flow

```
Mnemonic (BIP39) → Seed → HD Wallet (BIP32) → Derived Keys → Blockchain Accounts
```

## Troubleshooting

### Common Issues

1. **"Invalid address format" error**:

   - Ensure you're using the correct address format for the selected blockchain
   - Ethereum addresses start with "0x" followed by 40 hex characters
   - Solana addresses are Base58 encoded strings

2. **"Insufficient balance" error**:

   - Request more test tokens from the faucet
   - Ensure you have enough for the transaction amount plus gas fees

3. **Transaction stuck in "pending" state**:
   - Network congestion can cause delays
   - For Ethereum, you might need to wait longer during busy periods

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [ethers.js](https://docs.ethers.io/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [BIP39](https://github.com/bitcoinjs/bip39)
- [Tailwind CSS](https://tailwindcss.com/)
- [React](https://reactjs.org/)
