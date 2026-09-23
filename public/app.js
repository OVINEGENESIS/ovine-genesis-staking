const connectBtn = document.getElementById('connectBtn');
const walletChip = document.getElementById('walletChip');
const demoNote = document.getElementById('demoNote');

const CHAIN_ID = 4663;
const CHAIN_ID_HEX = '0x1237';

const ROBINHOOD_CHAIN = {
  chainId: CHAIN_ID_HEX,
  chainName: 'Robinhood Chain',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: [
    'https://rpc.mainnet.chain.robinhood.com/'
  ],
  blockExplorerUrls: [
    'https://robinhoodchain.blockscout.com'
  ]
};

let provider = null;
let account = null;

// --------------------------------------------------
// Wallet detection
// --------------------------------------------------

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function setConnected(address) {
  account = address;

  const shortAddress = shortenAddress(address);

  connectBtn.textContent = shortAddress;
  walletChip.textContent = `Connected: ${shortAddress}`;

  demoNote.textContent =
    'Wallet connected. NFT ownership check coming next.';
}

function setDisconnected() {
  account = null;

  connectBtn.textContent = 'Connect Wallet';
  walletChip.textContent = 'Wallet not connected';

  demoNote.textContent = 'Connect your wallet to continue.';
}

// --------------------------------------------------
// Add / switch Robinhood Chain
// --------------------------------------------------

async function switchToRobinhood() {
  if (!provider) {
    throw new Error('Wallet provider not found.');
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [
        {
          chainId: CHAIN_ID_HEX
        }
      ]
    });
  } catch (error) {

    // Chain is not added yet
    if (error.code === 4902) {

      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [ROBINHOOD_CHAIN]
      });

    } else {
      throw error;
    }
  }
}

// --------------------------------------------------
// Connect wallet
// --------------------------------------------------

async function connectWallet() {

  if (!provider) {
    alert(
      'No compatible wallet detected.\n\n' +
      'Please install MetaMask or Robinhood Wallet, then refresh this page.'
    );
    return;
  }

  try {

    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      return;
    }

    await switchToRobinhood();

    const chainId = await provider.request({
      method: 'eth_chainId'
    });

    if (parseInt(chainId, 16) !== CHAIN_ID) {

      alert(
        'Wrong network.\n\n' +
        'Please switch to Robinhood Chain.'
      );

      return;
    }

    setConnected(accounts[0]);

  } catch (error) {

    console.error('Wallet connection error:', error);

    alert(
      'Wallet connection failed.\n\n' +
      (error?.message || 'Unknown error')
    );
  }
}

// --------------------------------------------------
// Account changes
// --------------------------------------------------

function handleAccountsChanged(accounts) {

  if (!accounts || accounts.length === 0) {
    setDisconnected();
    return;
  }

  setConnected(accounts[0]);
}

// --------------------------------------------------
// Network changes
// --------------------------------------------------

function handleChainChanged(chainId) {

  if (parseInt(chainId, 16) !== CHAIN_ID) {

    walletChip.textContent = 'Wrong network';

    demoNote.textContent =
      'Please switch to Robinhood Chain.';

    return;
  }

  if (account) {
    setConnected(account);
  }
}

// --------------------------------------------------
// EIP-6963 wallet discovery
// --------------------------------------------------

let discoveredWallets = [];

window.addEventListener(
  'eip6963:announceProvider',
  (event) => {

    const wallet = event.detail;

    if (!wallet || !wallet.provider) {
      return;
    }

    discoveredWallets.push(wallet);

    // Use the first discovered EVM wallet
    if (!provider) {
      provider = wallet.provider;

      provider.on?.(
        'accountsChanged',
        handleAccountsChanged
      );

      provider.on?.(
        'chainChanged',
        handleChainChanged
      );
    }
  }
);

// Ask installed wallets to announce themselves
window.dispatchEvent(
  new Event('eip6963:requestProvider')
);

// Fallback for older wallets
if (window.ethereum) {

  if (!provider) {
    provider = window.ethereum;
  }

  provider.on?.(
    'accountsChanged',
    handleAccountsChanged
  );

  provider.on?.(
    'chainChanged',
    handleChainChanged
  );
}

// --------------------------------------------------
// Button
// --------------------------------------------------

connectBtn.addEventListener(
  'click',
  connectWallet
);

console.log(
  'Ovine Genesis staking loaded.'
);

console.log(
  'Wallet provider:',
  provider
);
