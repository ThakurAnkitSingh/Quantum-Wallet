import { useState, useEffect, useRef } from 'react';
import { WalletManager, WalletAccount, Transaction } from './utils/wallet';
import { Wallet, Plus, Send, History, Copy, Eye, EyeOff, Download } from 'lucide-react';

function App() {
  const [walletManager] = useState(() => WalletManager.getInstance());
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState<{ [key: string]: boolean }>({});
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [isRequestingAirdrop, setIsRequestingAirdrop] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState('');
  const [showFaucetModal, setShowFaucetModal] = useState(false);

  // Form states
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBlockchain, setNewAccountBlockchain] = useState<'ethereum' | 'solana'>('ethereum');
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [addressError, setAddressError] = useState('');

  // Add debounce ref
  const isProcessingRef = useRef(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    setAccounts(walletManager.getAccounts());
  };

  const createAccount = async () => {
    // Prevent multiple rapid calls
    if (isCreatingAccount || !newAccountName.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsCreatingAccount(true);
    
    try {
      // Get the current count of accounts for this blockchain type
      const blockchainAccounts = accounts.filter(a => a.blockchain === newAccountBlockchain);
      const accountIndex = blockchainAccounts.length;
      
      // Check if an account with this name and blockchain already exists
      const existingAccount = accounts.find(
        a => a.name === newAccountName && a.blockchain === newAccountBlockchain
      );
      
      if (existingAccount) {
        alert(`An account with name "${newAccountName}" for ${newAccountBlockchain} already exists.`);
        return;
      }
      
      console.log(`Creating ${newAccountBlockchain} account: ${newAccountName} at index ${accountIndex}`);
      
      const mnemonic = await walletManager.generateMnemonic();
      const account = await walletManager.createAccount(
        newAccountName,
        newAccountBlockchain,
        mnemonic,
        accountIndex
      );
      
      // Refresh accounts list instead of appending
      setAccounts(walletManager.getAccounts());
      setShowCreateAccount(false);
      setNewAccountName('');
      setNewAccountBlockchain('ethereum');
    } catch (error) {
      console.error('Error creating account:', error);
      alert(`Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingAccount(false);
      // Reset processing flag after a short delay to prevent immediate re-clicks
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  };

  const sendTransaction = async () => {
    if (!selectedAccount || isSendingTransaction) return;
    
    setIsSendingTransaction(true);
    try {
      const transaction = await walletManager.sendTransaction(
        selectedAccount,
        sendToAddress,
        sendAmount
      );
      
      setTransactions(prev => [...prev, transaction]);
      setShowSend(false);
      setSendToAddress('');
      setSendAmount('');
      
      // Refresh balances
      loadAccounts();
      alert('Transaction sent successfully!');
    } catch (error) {
      console.error('Error sending transaction:', error);
      alert(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingTransaction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const togglePrivateKey = (accountId: string) => {
    setShowPrivateKey(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const getBlockchainIcon = (blockchain: string) => {
    return blockchain === 'ethereum' ? '🔷' : '🟣';
  };

  const getBlockchainName = (blockchain: string) => {
    return blockchain === 'ethereum' ? 'Ethereum' : 'Solana';
  };

  // Add this function to validate address format
  const validateAddress = (address: string, blockchain: 'ethereum' | 'solana') => {
    if (!address) {
      setAddressError('');
      return;
    }
    
    if (blockchain === 'ethereum') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        setAddressError('Invalid Ethereum address format. Must start with 0x followed by 40 hex characters.');
      } else {
        setAddressError('');
      }
    } else {
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        setAddressError('Invalid Solana address format. Must be a Base58 encoded string.');
      } else {
        setAddressError('');
      }
    }
  };

  const requestSolanaAirdrop = async () => {
    if (!selectedAccount || selectedAccount.blockchain !== 'solana' || isRequestingAirdrop) return;
    
    setIsRequestingAirdrop(true);
    try {
      await walletManager.requestSolanaAirdrop(selectedAccount);
      
      // Refresh account data
      loadAccounts();
      alert('SOL airdrop received successfully!');
    } catch (error) {
      console.error('Error requesting SOL airdrop:', error);
      alert(`Failed to request SOL airdrop: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRequestingAirdrop(false);
    }
  };

  const requestEthereumAirdrop = async () => {
    if (!selectedAccount || selectedAccount.blockchain !== 'ethereum' || isRequestingAirdrop) return;
    
    setIsRequestingAirdrop(true);
    try {
      const message = await walletManager.requestEthereumAirdrop(selectedAccount);
      
      // Show modal with faucet information
      setFaucetMessage(message);
      setShowFaucetModal(true);
      
      // Refresh account data
      loadAccounts();
    } catch (error) {
      console.error('Error requesting ETH faucet info:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRequestingAirdrop(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Quantum Wallet</h1>
            </div>
            <button
              onClick={() => setShowCreateAccount(true)}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Accounts</h2>
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => setSelectedAccount(account)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedAccount?.id === account.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getBlockchainIcon(account.blockchain)}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">{account.name}</h3>
                          <p className="text-sm text-gray-500">{getBlockchainName(account.blockchain)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{account.balance}</p>
                        <p className="text-xs text-gray-500">
                          {account.address.slice(0, 6)}...{account.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No accounts yet. Create your first account!</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="lg:col-span-2">
            {selectedAccount ? (
              <div className="space-y-6">
                {/* Account Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedAccount.name}</h2>
                    <div className="flex space-x-2">
                      {selectedAccount.blockchain === 'solana' && (
                        <button
                          onClick={requestSolanaAirdrop}
                          disabled={isRequestingAirdrop}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Download className="h-4 w-4" />
                          <span>{isRequestingAirdrop ? 'Requesting...' : 'Request SOL'}</span>
                        </button>
                      )}
                      {selectedAccount.blockchain === 'ethereum' && (
                        <button
                          onClick={requestEthereumAirdrop}
                          disabled={isRequestingAirdrop}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Download className="h-4 w-4" />
                          <span>{isRequestingAirdrop ? 'Requesting...' : 'Request ETH'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowSend(true)}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Send className="h-4 w-4" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={selectedAccount.address}
                          readOnly
                          className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(selectedAccount.address)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
                      <div className="p-2 border border-gray-300 rounded-md bg-gray-50">
                        <span className="font-medium">{selectedAccount.balance}</span>
                        <span className="text-gray-500 ml-1">
                          {selectedAccount.blockchain === 'ethereum' ? 'ETH' : 'SOL'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={selectedAccount.publicKey}
                          readOnly
                          className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(selectedAccount.publicKey)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Private Key</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type={showPrivateKey[selectedAccount.id] ? "text" : "password"}
                          value={selectedAccount.privateKey}
                          readOnly
                          className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                        />
                        <button
                          onClick={() => togglePrivateKey(selectedAccount.id)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          {showPrivateKey[selectedAccount.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(selectedAccount.privateKey)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <History className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {transactions
                      .filter(tx => tx.from === selectedAccount.address)
                      .map((transaction) => (
                        <div key={transaction.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                Sent {transaction.amount} {transaction.blockchain === 'ethereum' ? 'ETH' : 'SOL'}
                              </p>
                              <p className="text-sm text-gray-500">To: {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {transaction.status}
                              </span>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(transaction.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    {transactions.filter(tx => tx.from === selectedAccount.address).length === 0 && (
                      <p className="text-gray-500 text-center py-8">No transactions yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Account</h3>
                  <p className="text-gray-500">Choose an account from the list to view details and manage transactions</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Account</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="My Ethereum Wallet"
                  disabled={isCreatingAccount}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blockchain</label>
                <select
                  value={newAccountBlockchain}
                  onChange={(e) => setNewAccountBlockchain(e.target.value as 'ethereum' | 'solana')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={isCreatingAccount}
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="solana">Solana</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateAccount(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isCreatingAccount}
              >
                Cancel
              </button>
              <button
                onClick={createAccount}
                disabled={!newAccountName || isCreatingAccount}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isCreatingAccount ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Transaction Modal */}
      {showSend && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Transaction</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Address</label>
                <input
                  type="text"
                  value={sendToAddress}
                  onChange={(e) => {
                    setSendToAddress(e.target.value);
                    validateAddress(e.target.value, selectedAccount.blockchain);
                  }}
                  className={`w-full p-2 border ${addressError ? 'border-red-500' : 'border-gray-300'} rounded-md`}
                  placeholder={selectedAccount.blockchain === 'ethereum' ? '0x...' : 'Solana address...'}
                />
                {addressError && (
                  <p className="text-red-500 text-xs mt-1">{addressError}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="0.01"
                  step="0.000001"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowSend(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendTransaction}
                disabled={!sendToAddress || !sendAmount || !!addressError || isSendingTransaction}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSendingTransaction ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ethereum Faucet Modal */}
      {showFaucetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Get Test Ethereum</h2>
            
            <div className="prose prose-sm">
              <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded-md text-xs">
                {faucetMessage}
              </pre>
              
              <p className="mt-4 text-sm">
                After receiving ETH, refresh your account to see the updated balance.
              </p>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedAccount?.address || '');
                  alert('Address copied to clipboard!');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Copy Address
              </button>
              <button
                onClick={() => setShowFaucetModal(false)}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 