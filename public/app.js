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

let wallets = [];
let provider = null;
let account = null;


// ==========================================
// ADDRESS
// ==========================================

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}


// ==========================================
// WALLET UI
// ==========================================

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

  demoNote.textContent =
    'Connect your wallet to continue.';
}


// ==========================================
// MODAL
// ==========================================

function createWalletModal() {
  const oldModal = document.getElementById('walletModal');

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement('div');

  modal.id = 'walletModal';

  modal.innerHTML = `
    <div class="og-wallet-overlay">
      <div class="og-wallet-modal">

        <button class="og-wallet-close" id="walletModalClose">
          ×
        </button>

        <div class="og-wallet-title">
          Connect Wallet
        </div>

        <div class="og-wallet-subtitle">
          Choose your wallet
        </div>

        <div class="og-wallet-list" id="walletList"></div>

        <div class="og-wallet-footer">
          Make sure your wallet is installed in this browser.
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById('walletModalClose')
    .addEventListener('click', closeWalletModal);

  document
    .querySelector('.og-wallet-overlay')
    .addEventListener('click', (event) => {
      if (event.target.classList.contains('og-wallet-overlay')) {
        closeWalletModal();
      }
    });

  renderWalletList();
}

function closeWalletModal() {
  const modal = document.getElementById('walletModal');

  if (modal) {
    modal.remove();
  }
}


// ==========================================
// WALLET LIST
// ==========================================

function renderWalletList() {
  const list = document.getElementById('walletList');

  if (!list) {
    return;
  }

  list.innerHTML = '';

  if (wallets.length === 0) {
    list.innerHTML = `
      <div class="og-no-wallet">
        No compatible browser wallet detected.
        <br><br>
        Please install MetaMask, Rabby,
        Coinbase Wallet, OKX, or another
        EVM-compatible wallet.
      </div>
    `;

    return;
  }

  wallets.forEach((wallet, index) => {

    const button = document.createElement('button');

    button.className = 'og-wallet-option';

    const icon =
      wallet.info?.icon ||
      '';

    const name =
      wallet.info?.name ||
      `Wallet ${index + 1}`;

    button.innerHTML = `
      <span class="og-wallet-icon">
        ${
          icon
            ? `<img src="${icon}" alt="">`
            : '◈'
        }
      </span>

      <span class="og-wallet-name">
        ${name}
      </span>

      <span class="og-wallet-arrow">
        →
      </span>
    `;

    button.addEventListener('click', async () => {

      provider = wallet.provider;

      closeWalletModal();

      await connectWallet();

    });

    list.appendChild(button);
  });
}


// ==========================================
// ROBINHOOD CHAIN
// ==========================================

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

    // Chain not added to wallet
    if (error.code === 4902) {

      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          ROBINHOOD_CHAIN
        ]
      });

    } else {

      throw error;

    }
  }
}


// ==========================================
// CONNECT WALLET
// ==========================================

async function connectWallet() {

  if (!provider) {

    alert(
      'No wallet provider selected.\n\n' +
      'Please choose a wallet first.'
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
        'Please switch to Robinhood Chain.'
      );

      return;
    }

    setConnected(accounts[0]);

  } catch (error) {

    console.error(
      'Wallet connection error:',
      error
    );

    alert(
      error?.message ||
      'Wallet connection failed.'
    );
  }
}


// ==========================================
// ACCOUNT CHANGE
// ==========================================

function handleAccountsChanged(accounts) {

  if (!accounts || accounts.length === 0) {

    setDisconnected();

    return;
  }

  setConnected(accounts[0]);
}


// ==========================================
// CHAIN CHANGE
// ==========================================

function handleChainChanged(chainId) {

  if (parseInt(chainId, 16) !== CHAIN_ID) {

    walletChip.textContent =
      'Wrong network';

    demoNote.textContent =
      'Please switch to Robinhood Chain.';

    return;
  }

  if (account) {

    setConnected(account);

  }
}


// ==========================================
// EIP-6963 WALLET DISCOVERY
// ==========================================

window.addEventListener(
  'eip6963:announceProvider',
  (event) => {

    const detail = event.detail;

    if (
      !detail ||
      !detail.provider ||
      !detail.info
    ) {
      return;
    }

    // Prevent duplicates
    const exists = wallets.some(
      wallet =>
        wallet.info.uuid === detail.info.uuid
    );

    if (!exists) {

      wallets.push(detail);

    }
  }
);


// Ask browser wallets to announce themselves

window.dispatchEvent(
  new Event('eip6963:requestProvider')
);


// ==========================================
// FALLBACK FOR OLDER WALLETS
// ==========================================

if (window.ethereum) {

  const fallbackExists = wallets.some(
    wallet =>
      wallet.provider === window.ethereum
  );

  if (!fallbackExists) {

    wallets.push({
      info: {
        uuid: 'legacy-provider',
        name: 'Browser Wallet',
        icon: ''
      },
      provider: window.ethereum
    });

  }
}


// ==========================================
// BUTTON
// ==========================================

connectBtn.addEventListener(
  'click',
  () => {

    createWalletModal();

  }
);


// ==========================================
// BASIC WALLET MODAL STYLE
// ==========================================

const style = document.createElement('style');

style.textContent = `

.og-wallet-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.og-wallet-modal {
  position: relative;
  width: min(420px, 100%);
  background: #111;
  border: 1px solid #444;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 25px 80px rgba(0,0,0,.55);
  color: white;
}

.og-wallet-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: 0;
  background: transparent;
  color: #aaa;
  font-size: 28px;
  cursor: pointer;
}

.og-wallet-close:hover {
  color: white;
}

.og-wallet-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 6px;
}

.og-wallet-subtitle {
  color: #999;
  font-size: 14px;
  margin-bottom: 20px;
}

.og-wallet-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.og-wallet-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #333;
  border-radius: 12px;
  background: #181818;
  color: white;
  cursor: pointer;
  text-align: left;
  font-size: 15px;
  transition: .15s ease;
}

.og-wallet-option:hover {
  background: #242424;
  border-color: #777;
  transform: translateY(-1px);
}

.og-wallet-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 24px;
}

.og-wallet-icon img {
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

.og-wallet-name {
  flex: 1;
  font-weight: 600;
}

.og-wallet-arrow {
  color: #777;
  font-size: 18px;
}

.og-wallet-footer {
  margin-top: 18px;
  color: #666;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.og-no-wallet {
  padding: 20px;
  text-align: center;
  color: #aaa;
  line-height: 1.5;
  font-size: 13px;
}

`;

document.head.appendChild(style);


// ==========================================
// INITIAL STATE
// ==========================================

walletChip.textContent =
  'Wallet not connected';

console.log(
  'Ovine Genesis staking loaded.'
);
