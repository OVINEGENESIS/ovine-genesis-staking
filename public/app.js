const connectBtn = document.getElementById('connectBtn');
const walletChip = document.getElementById('walletChip');
const demoNote = document.getElementById('demoNote');

const stakeButtons = document.querySelectorAll('.stake-btn');
const stakeAllBtn = document.getElementById('stakeAllBtn');
const pointsEl = document.getElementById('points');
const stakedCountEl = document.getElementById('stakedCount');
const dailyEarnEl = document.getElementById('dailyEarn');

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
let profileOpen = false;

let points = 0;


// ==========================================
// ADDRESS
// ==========================================

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}


// ==========================================
// CONNECTED STATE
// ==========================================

function setConnected(address) {
  account = address;

  const shortAddress = shortenAddress(address);

  connectBtn.textContent = shortAddress;
  walletChip.textContent = `Connected: ${shortAddress}`;

  demoNote.textContent =
    'Wallet connected. NFT ownership check coming next.';

  localStorage.setItem(
    'ovine_wallet_connected',
    'true'
  );

  localStorage.setItem(
    'ovine_wallet_address',
    address
  );

  if (provider) {
    localStorage.setItem(
      'ovine_wallet_uuid',
      getProviderUUID(provider)
    );
  }

  attachProfileMenu();
}


function setDisconnected() {
  account = null;
  profileOpen = false;

  connectBtn.textContent = 'Connect Wallet';
  walletChip.textContent = 'Wallet not connected';

  demoNote.textContent =
    'Connect your wallet to continue.';

  localStorage.removeItem(
    'ovine_wallet_connected'
  );

  localStorage.removeItem(
    'ovine_wallet_address'
  );

  localStorage.removeItem(
    'ovine_wallet_uuid'
  );

  removeProfileMenu();
}


// ==========================================
// PROVIDER UUID
// ==========================================

function getProviderUUID(targetProvider) {

  const wallet = wallets.find(
    item => item.provider === targetProvider
  );

  return wallet?.info?.uuid || '';
}


// ==========================================
// WALLET MODAL
// ==========================================

function createWalletModal() {

  const oldModal =
    document.getElementById('walletModal');

  if (oldModal) {
    oldModal.remove();
  }

  const modal = document.createElement('div');

  modal.id = 'walletModal';

  modal.innerHTML = `
    <div class="og-wallet-overlay">

      <div class="og-wallet-modal">

        <button
          class="og-wallet-close"
          id="walletModalClose"
        >
          ×
        </button>

        <div class="og-wallet-title">
          Connect Wallet
        </div>

        <div class="og-wallet-subtitle">
          Choose your wallet
        </div>

        <div
          class="og-wallet-list"
          id="walletList"
        ></div>

        <div class="og-wallet-footer">
          Make sure your wallet is installed
          in this browser.
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  document
    .getElementById('walletModalClose')
    .addEventListener(
      'click',
      closeWalletModal
    );

  document
    .querySelector('.og-wallet-overlay')
    .addEventListener('click', event => {

      if (
        event.target.classList.contains(
          'og-wallet-overlay'
        )
      ) {
        closeWalletModal();
      }

    });

  renderWalletList();

  // Ask wallets to announce again
  window.dispatchEvent(
    new Event('eip6963:requestProvider')
  );
}


function closeWalletModal() {

  const modal =
    document.getElementById('walletModal');

  if (modal) {
    modal.remove();
  }
}


// ==========================================
// WALLET LIST
// ==========================================

function renderWalletList() {

  const list =
    document.getElementById('walletList');

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

    const button =
      document.createElement('button');

    button.className =
      'og-wallet-option';

    const icon =
      wallet.info?.icon || '';

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

    button.addEventListener(
      'click',
      async () => {

        provider = wallet.provider;

        localStorage.setItem(
          'ovine_wallet_uuid',
          wallet.info?.uuid || ''
        );

        closeWalletModal();

        await connectWallet();

      }
    );

    list.appendChild(button);
  });
}


// ==========================================
// ROBINHOOD CHAIN
// ==========================================

async function switchToRobinhood() {

  if (!provider) {
    throw new Error(
      'Wallet provider not found.'
    );
  }

  try {

    await provider.request({
      method:
        'wallet_switchEthereumChain',

      params: [
        {
          chainId: CHAIN_ID_HEX
        }
      ]
    });

  } catch (error) {

    if (error.code === 4902) {

      await provider.request({
        method:
          'wallet_addEthereumChain',

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
// CONNECT
// ==========================================

async function connectWallet(
  silent = false
) {

  if (!provider) {

    if (!silent) {
      alert(
        'Please choose a wallet first.'
      );
    }

    return;
  }

  try {

    const accounts =
      await provider.request({
        method: 'eth_requestAccounts'
      });

    if (
      !accounts ||
      accounts.length === 0
    ) {
      return;
    }

    await switchToRobinhood();

    const chainId =
      await provider.request({
        method: 'eth_chainId'
      });

    if (
      parseInt(chainId, 16) !== CHAIN_ID
    ) {

      if (!silent) {
        alert(
          'Please switch to Robinhood Chain.'
        );
      }

      return;
    }

    setConnected(accounts[0]);

  } catch (error) {

    console.error(
      'Wallet connection error:',
      error
    );

    if (!silent) {

      alert(
        error?.message ||
        'Wallet connection failed.'
      );

    }
  }
}


// ==========================================
// AUTO RECONNECT
// ==========================================

async function autoReconnect() {

  const savedUUID =
    localStorage.getItem(
      'ovine_wallet_uuid'
    );

  if (!savedUUID) {
    return;
  }

  const savedWallet =
    wallets.find(
      wallet =>
        wallet.info?.uuid === savedUUID
    );

  if (!savedWallet) {
    return;
  }

  provider = savedWallet.provider;

  try {

    // IMPORTANT:
    // eth_accounts does NOT open a popup.
    const accounts =
      await provider.request({
        method: 'eth_accounts'
      });

    if (
      !accounts ||
      accounts.length === 0
    ) {
      return;
    }

    const chainId =
      await provider.request({
        method: 'eth_chainId'
      });

    if (
      parseInt(chainId, 16) !== CHAIN_ID
    ) {

      walletChip.textContent =
        'Wrong network';

      demoNote.textContent =
        'Please switch to Robinhood Chain.';

      return;
    }

    setConnected(accounts[0]);

  } catch (error) {

    console.log(
      'Auto reconnect skipped:',
      error
    );

  }
}


// ==========================================
// ACCOUNT CHANGED
// ==========================================

function handleAccountsChanged(accounts) {

  if (
    !accounts ||
    accounts.length === 0
  ) {

    setDisconnected();

    return;
  }

  setConnected(accounts[0]);
}


// ==========================================
// CHAIN CHANGED
// ==========================================

function handleChainChanged(chainId) {

  if (
    parseInt(chainId, 16) !== CHAIN_ID
  ) {

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
// PROFILE MENU
// ==========================================

function attachProfileMenu() {

  removeProfileMenu();

  if (!account) {
    return;
  }

  const wrapper =
    document.createElement('div');

  wrapper.id = 'profileWrapper';

  wrapper.className =
    'og-profile-wrapper';

  wrapper.innerHTML = `

    <button
      class="og-profile-button"
      id="profileButton"
    >

      <span class="og-profile-avatar">
        OG
      </span>

      <span class="og-profile-address">
        ${shortenAddress(account)}
      </span>

      <span class="og-profile-arrow">
        ▼
      </span>

    </button>

    <div
      class="og-profile-menu"
      id="profileMenu"
    >

      <div class="og-profile-header">

        <div class="og-profile-big-avatar">
          OG
        </div>

        <div>

          <div class="og-profile-title">
            Ovine Holder
          </div>

          <div class="og-profile-small">
            Robinhood Chain
          </div>

        </div>

      </div>

      <div class="og-profile-divider"></div>

      <div class="og-profile-label">
        WALLET
      </div>

      <div class="og-profile-wallet">
        ${account}
      </div>

      <button
        class="og-copy-button"
        id="copyWalletButton"
      >
        Copy Address
      </button>

      <div class="og-profile-divider"></div>

      <div class="og-profile-row">
        <span>Ovine NFTs</span>
        <strong>--</strong>
      </div>

      <div class="og-profile-row">
        <span>Staked</span>
        <strong id="profileStaked">
          0
        </strong>
      </div>

      <div class="og-profile-row">
        <span>Points</span>
        <strong id="profilePoints">
          0
        </strong>
      </div>

      <div class="og-profile-divider"></div>

      <button
        class="og-disconnect-button"
        id="disconnectButton"
      >
        Disconnect Wallet
      </button>

    </div>
  `;

  connectBtn.replaceWith(wrapper);

  document
    .getElementById('profileButton')
    .addEventListener(
      'click',
      toggleProfileMenu
    );

  document
    .getElementById('disconnectButton')
    .addEventListener(
      'click',
      () => {

        setDisconnected();

      }
    );

  document
    .getElementById('copyWalletButton')
    .addEventListener(
      'click',
      async () => {

        try {

          await navigator.clipboard.writeText(
            account
          );

          const button =
            document.getElementById(
              'copyWalletButton'
            );

          button.textContent =
            'Copied ✓';

          setTimeout(() => {

            if (button) {
              button.textContent =
                'Copy Address';
            }

          }, 1500);

        } catch (error) {

          console.error(error);

        }

      }
    );

  updateProfileStats();
}


function toggleProfileMenu() {

  const menu =
    document.getElementById(
      'profileMenu'
    );

  if (!menu) {
    return;
  }

  profileOpen = !profileOpen;

  menu.classList.toggle(
    'show',
    profileOpen
  );
}


function removeProfileMenu() {

  const wrapper =
    document.getElementById(
      'profileWrapper'
    );

  if (wrapper) {

    wrapper.remove();

  }

  // Re-create original connect button
  if (
    !document.getElementById(
      'connectBtn'
    )
  ) {

    const button =
      document.createElement('button');

    button.id = 'connectBtn';

    button.className =
      'btn btn-primary';

    button.textContent =
      'Connect Wallet';

    const nav =
      document.querySelector('.nav');

    if (nav) {
      nav.appendChild(button);
    }

    button.addEventListener(
      'click',
      openWalletPicker
    );
  }
}


// ==========================================
// WALLET PICKER
// ==========================================

function openWalletPicker() {

  createWalletModal();

}


// ==========================================
// STAKING DEMO
// ==========================================

function updateStats() {

  const cards =
    [...document.querySelectorAll(
      '.nft-card'
    )];

  const staked =
    cards.filter(
      card =>
        card.dataset.staked === 'true'
    ).length;

  if (stakedCountEl) {
    stakedCountEl.textContent =
      staked;
  }

  if (dailyEarnEl) {
    dailyEarnEl.textContent =
      `+${staked * 10}`;
  }

  if (pointsEl) {
    pointsEl.textContent =
      points.toLocaleString();
  }

  const profileStaked =
    document.getElementById(
      'profileStaked'
    );

  const profilePoints =
    document.getElementById(
      'profilePoints'
    );

  if (profileStaked) {
    profileStaked.textContent =
      staked;
  }

  if (profilePoints) {
    profilePoints.textContent =
      points.toLocaleString();
  }
}


stakeButtons.forEach(button => {

  button.addEventListener(
    'click',
    () => {

      if (!account) {

        alert(
          'Please connect your wallet first.'
        );

        return;
      }

      const card =
        button.closest('.nft-card');

      const isStaked =
        card.dataset.staked === 'true';

      card.dataset.staked =
        (!isStaked).toString();

      button.textContent =
        isStaked
          ? 'Stake'
          : 'Unstake';

      if (!isStaked) {
        points += 10;
      }

      updateStats();

    }
  );

});


if (stakeAllBtn) {

  stakeAllBtn.addEventListener(
    'click',
    () => {

      if (!account) {

        alert(
          'Please connect your wallet first.'
        );

        return;
      }

      document
        .querySelectorAll('.nft-card')
        .forEach(card => {

          card.dataset.staked =
            'true';

          const button =
            card.querySelector(
              '.stake-btn'
            );

          if (button) {
            button.textContent =
              'Unstake';
          }

        });

      updateStats();

    }
  );

}


// ==========================================
// EIP-6963 WALLET DISCOVERY
// ==========================================

window.addEventListener(
  'eip6963:announceProvider',
  event => {

    const detail = event.detail;

    if (
      !detail ||
      !detail.provider ||
      !detail.info
    ) {
      return;
    }

    const exists =
      wallets.some(
        wallet =>
          wallet.info?.uuid ===
          detail.info.uuid
      );

    if (!exists) {

      wallets.push(detail);

    }

    // Refresh modal if it is open
    if (
      document.getElementById(
        'walletModal'
      )
    ) {

      renderWalletList();

    }

    // Try auto reconnect after wallet discovery
    autoReconnect();

  }
);


// Ask installed wallets to announce
window.dispatchEvent(
  new Event(
    'eip6963:requestProvider'
  )
);


// ==========================================
// FALLBACK WALLET
// ==========================================

if (window.ethereum) {

  const exists =
    wallets.some(
      wallet =>
        wallet.provider ===
        window.ethereum
    );

  if (!exists) {

    wallets.push({

      info: {
        uuid: 'legacy-provider',
        name: 'Browser Wallet',
        icon: ''
      },

      provider:
        window.ethereum

    });

  }

}


// ==========================================
// GLOBAL CONNECT BUTTON
// ==========================================

document.addEventListener(
  'click',
  event => {

    const button =
      event.target.closest(
        '#connectBtn'
      );

    if (!button) {
      return;
    }

    openWalletPicker();

  }
);


// ==========================================
// DYNAMIC PROFILE CSS
// ==========================================

const style =
  document.createElement('style');

style.textContent = `

.og-profile-wrapper {
  position: relative;
}

.og-profile-button {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 12px 7px 7px;
  border: 1px solid #555;
  border-radius: 10px;
  background: #151515;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

.og-profile-button:hover {
  border-color: #aaa;
}

.og-profile-avatar,
.og-profile-big-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #111;
  font-weight: 900;
}

.og-profile-avatar {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 10px;
}

.og-profile-big-avatar {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  font-size: 14px;
}

.og-profile-address {
  font-size: 13px;
}

.og-profile-arrow {
  color: #888;
  font-size: 9px;
}

.og-profile-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 310px;
  padding: 18px;
  background: #111;
  border: 1px solid #444;
  border-radius: 14px;
  box-shadow: 0 25px 70px rgba(0,0,0,.55);
  display: none;
  z-index: 9999;
}

.og-profile-menu.show {
  display: block;
}

.og-profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.og-profile-title {
  font-weight: 800;
  font-size: 15px;
}

.og-profile-small {
  margin-top: 4px;
  color: #888;
  font-size: 11px;
}

.og-profile-divider {
  height: 1px;
  background: #292929;
  margin: 16px 0;
}

.og-profile-label {
  color: #777;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 7px;
}

.og-profile-wallet {
  color: #ccc;
  font-size: 11px;
  line-height: 1.5;
  word-break: break-all;
}

.og-copy-button,
.og-disconnect-button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.og-copy-button {
  border: 1px solid #333;
  background: #1c1c1c;
  color: #fff;
}

.og-disconnect-button {
  border: 1px solid #5a3030;
  background: #241313;
  color: #ffb5b5;
}

.og-copy-button:hover,
.og-disconnect-button:hover {
  border-color: #888;
}

.og-profile-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  color: #999;
  font-size: 13px;
}

.og-profile-row strong {
  color: #fff;
}

.og-wallet-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0,0,0,.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.og-wallet-modal {
  position: relative;
  width: min(420px,100%);
  background: #111;
  border: 1px solid #444;
  border-radius: 16px;
  padding: 28px;
  color: white;
  box-shadow: 0 25px 80px rgba(0,0,0,.55);
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
}

.og-wallet-option:hover {
  background: #242424;
  border-color: #777;
}

.og-wallet-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
}

.og-wallet-footer {
  margin-top: 18px;
  color: #666;
  font-size: 11px;
  text-align: center;
}

.og-no-wallet {
  padding: 20px;
  text-align: center;
  color: #aaa;
  line-height: 1.5;
}

@media (max-width: 600px) {

  .og-profile-menu {
    right: -10px;
    width: 290px;
  }

  .og-profile-address {
    display: none;
  }

}

`;

document.head.appendChild(style);


// ==========================================
// INITIALIZE
// ==========================================

walletChip.textContent =
  'Wallet not connected';

updateStats();

console.log(
  'Ovine Genesis staking loaded.'
);
