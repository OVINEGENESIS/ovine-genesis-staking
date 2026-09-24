// ==========================================
// OVINE GENESIS — STAKING APP
// ==========================================

// ------------------------------------------
// DOM ELEMENTS
// ------------------------------------------

const connectBtn = document.getElementById('connectBtn');
const walletChip = document.getElementById('walletChip');
const demoNote = document.getElementById('demoNote');

const stakeButtons = document.querySelectorAll('.stake-btn');
const stakeAllBtn = document.getElementById('stakeAllBtn');

const pointsEl = document.getElementById('points');
const stakedCountEl = document.getElementById('stakedCount');
const dailyEarnEl = document.getElementById('dailyEarn');


// ------------------------------------------
// ROBINHOOD CHAIN
// ------------------------------------------

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


// ------------------------------------------
// STATE
// ------------------------------------------

let wallets = [];
let provider = null;
let account = null;
let profileOpen = false;
let points = 0;


// ------------------------------------------
// SHORTEN ADDRESS
// ------------------------------------------

function shortenAddress(address) {

  if (!address) return '';

  return (
    address.slice(0, 6) +
    '...' +
    address.slice(-4)
  );
}


// ------------------------------------------
// SET CONNECTED
// ------------------------------------------

function setConnected(address, walletInfo = null) {

  account = address;

  provider =
    walletInfo?.provider ||
    provider ||
    window.ethereum;

  localStorage.setItem(
    'ovine_wallet_connected',
    'true'
  );

  localStorage.setItem(
    'ovine_wallet_address',
    address
  );

  if (walletInfo?.uuid) {

    localStorage.setItem(
      'ovine_wallet_uuid',
      walletInfo.uuid
    );
  }

  // Update wallet chip

  if (walletChip) {

    walletChip.textContent =
      shortenAddress(address);
  }


  // Update connect button

  const currentConnectBtn =
    document.getElementById('connectBtn');

  if (currentConnectBtn) {

    currentConnectBtn.textContent =
      'PROFILE';
  }


  // Hide demo note

  if (demoNote) {

    demoNote.style.display = 'none';
  }


  // Attach profile

  attachProfileMenu();

  console.log(
    'Wallet connected:',
    address
  );
}


// ------------------------------------------
// SET DISCONNECTED
// ------------------------------------------

function setDisconnected() {

  account = null;
  provider = null;
  profileOpen = false;

  localStorage.removeItem(
    'ovine_wallet_connected'
  );

  localStorage.removeItem(
    'ovine_wallet_address'
  );

  localStorage.removeItem(
    'ovine_wallet_uuid'
  );


  if (walletChip) {

    walletChip.textContent =
      'Wallet not connected';
  }


  removeProfileMenu();


  if (demoNote) {

    demoNote.style.display = '';
  }


  console.log(
    'Wallet disconnected'
  );
}


// ------------------------------------------
// GET WALLET UUID
// ------------------------------------------

function getProviderUUID(walletProvider) {

  const found = wallets.find(
    wallet =>
      wallet.provider === walletProvider
  );

  return found?.info?.uuid || null;
}


// ------------------------------------------
// CREATE WALLET MODAL
// ------------------------------------------

function createWalletModal() {

  let modal =
    document.getElementById(
      'walletModal'
    );

  if (modal) {

    return modal;
  }


  modal =
    document.createElement('div');

  modal.id = 'walletModal';

  modal.innerHTML = `

    <div class="wallet-modal-backdrop"></div>

    <div class="wallet-modal-box">

      <div class="wallet-modal-header">

        <div>
          <div class="wallet-modal-title">
            Connect Wallet
          </div>

          <div class="wallet-modal-subtitle">
            Select your wallet
          </div>
        </div>

        <button
          id="walletModalClose"
          class="wallet-modal-close"
        >
          ×
        </button>

      </div>

      <div
        id="walletList"
        class="wallet-list"
      ></div>

    </div>
  `;


  document.body.appendChild(modal);


  document
    .getElementById('walletModalClose')
    ?.addEventListener(
      'click',
      closeWalletModal
    );


  modal
    .querySelector(
      '.wallet-modal-backdrop'
    )
    ?.addEventListener(
      'click',
      closeWalletModal
    );


  return modal;
}


// ------------------------------------------
// CLOSE WALLET MODAL
// ------------------------------------------

function closeWalletModal() {

  const modal =
    document.getElementById(
      'walletModal'
    );

  if (modal) {

    modal.remove();
  }
}


// ------------------------------------------
// RENDER WALLET LIST
// ------------------------------------------

function renderWalletList() {

  const modal =
    createWalletModal();

  const list =
    modal.querySelector(
      '#walletList'
    );

  if (!list) return;


  list.innerHTML = '';


  if (!wallets.length) {

    list.innerHTML = `

      <div class="wallet-empty">

        No compatible wallet found.

        <br><br>

        Please install a Web3 wallet
        such as Rabby or MetaMask.

      </div>

    `;

    return;
  }


  wallets.forEach(
    wallet => {

      const button =
        document.createElement(
          'button'
        );

      button.className =
        'wallet-option';


      const icon =
        wallet.info?.icon || '';


      const name =
        wallet.info?.name ||
        'Wallet';


      button.innerHTML = `

        <div class="wallet-option-icon">

          ${
            icon
              ? `<img src="${icon}" alt="">`
              : '◎'
          }

        </div>

        <div class="wallet-option-name">

          ${name}

        </div>

        <div class="wallet-option-arrow">

          →

        </div>

      `;


      button.addEventListener(
        'click',
        async () => {

          try {

            await connectWallet(
              false,
              wallet
            );

          } catch (error) {

            console.error(
              error
            );

            alert(
              error?.message ||
              'Wallet connection failed.'
            );
          }

        }
      );


      list.appendChild(
        button
      );
    }
  );
}


// ------------------------------------------
// SWITCH TO ROBINHOOD CHAIN
// ------------------------------------------

async function switchToRobinhood(
  walletProvider
) {

  if (!walletProvider) {

    throw new Error(
      'Wallet provider not found.'
    );
  }


  try {

    await walletProvider.request({

      method:
        'wallet_switchEthereumChain',

      params: [
        {
          chainId:
            CHAIN_ID_HEX
        }
      ]

    });

  } catch (error) {

    // Chain not added

    if (
      error.code === 4902 ||
      error.code === -32603
    ) {

      await walletProvider.request({

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


// ------------------------------------------
// CONNECT WALLET
// ------------------------------------------

async function connectWallet(
  silent = false,
  walletInfo = null
) {

  try {

    let walletProvider =
      walletInfo?.provider;


    // If no selected wallet,
    // use normal injected provider

    if (!walletProvider) {

      walletProvider =
        window.ethereum;
    }


    if (!walletProvider) {

      if (!silent) {

        openWalletPicker();

      }

      return;
    }


    provider =
      walletProvider;


    // Request account

    const accounts =
      await walletProvider.request({

        method:
          silent
            ? 'eth_accounts'
            : 'eth_requestAccounts'

      });


    if (
      !accounts ||
      !accounts.length
    ) {

      if (!silent) {

        openWalletPicker();

      }

      return;
    }


    const address =
      accounts[0];


    // Switch chain

    await switchToRobinhood(
      walletProvider
    );


    // Verify chain

    const chainId =
      await walletProvider.request({

        method:
          'eth_chainId'

      });


    if (
      chainId.toLowerCase() !==
      CHAIN_ID_HEX.toLowerCase()
    ) {

      throw new Error(
        'Please switch to Robinhood Chain.'
      );
    }


    const uuid =
      getProviderUUID(
        walletProvider
      );


    setConnected(
      address,
      {
        provider:
          walletProvider,

        uuid:
          uuid
      }
    );


    closeWalletModal();


    // Listen for wallet changes

    if (
      walletProvider.on
    ) {

      walletProvider.on(
        'accountsChanged',
        handleAccountsChanged
      );

      walletProvider.on(
        'chainChanged',
        handleChainChanged
      );
    }

  } catch (error) {

    console.error(
      'Wallet connection error:',
      error
    );


    if (!silent) {

      alert(
        error?.message ||
        'Failed to connect wallet.'
      );
    }
  }
}


// ------------------------------------------
// AUTO RECONNECT
// ------------------------------------------

async function autoReconnect() {

  const wasConnected =
    localStorage.getItem(
      'ovine_wallet_connected'
    );


  if (
    wasConnected !== 'true'
  ) {

    return;
  }


  const savedAddress =
    localStorage.getItem(
      'ovine_wallet_address'
    );


  if (!savedAddress) {

    return;
  }


  let walletProvider =
    null;


  const savedUUID =
    localStorage.getItem(
      'ovine_wallet_uuid'
    );


  if (savedUUID) {

    const savedWallet =
      wallets.find(
        wallet =>
          wallet.info?.uuid ===
          savedUUID
      );


    if (savedWallet) {

      walletProvider =
        savedWallet.provider;
    }
  }


  if (!walletProvider) {

    walletProvider =
      window.ethereum;
  }


  if (!walletProvider) {

    return;
  }


  try {

    const accounts =
      await walletProvider.request({

        method:
          'eth_accounts'

      });


    if (
      accounts &&
      accounts.length
    ) {

      const address =
        accounts[0];


      const chainId =
        await walletProvider.request({

          method:
            'eth_chainId'

        });


      if (
        chainId.toLowerCase() ===
        CHAIN_ID_HEX.toLowerCase()
      ) {

        setConnected(
          address,
          {
            provider:
              walletProvider,

            uuid:
              getProviderUUID(
                walletProvider
              )
          }
        );

      } else {

        console.log(
          'Wallet connected but wrong network.'
        );
      }
    }

  } catch (error) {

    console.error(
      'Auto reconnect failed:',
      error
    );
  }
}


// ------------------------------------------
// ACCOUNT CHANGED
// ------------------------------------------

function handleAccountsChanged(
  accounts
) {

  if (
    !accounts ||
    !accounts.length
  ) {

    setDisconnected();

    return;
  }


  setConnected(
    accounts[0],
    {
      provider:
        provider,

      uuid:
        getProviderUUID(
          provider
        )
    }
  );
}


// ------------------------------------------
// CHAIN CHANGED
// ------------------------------------------

function handleChainChanged(
  chainId
) {

  if (
    chainId.toLowerCase() !==
    CHAIN_ID_HEX.toLowerCase()
  ) {

    alert(
      'Please switch back to Robinhood Chain.'
    );

    return;
  }


  if (account) {

    setConnected(
      account,
      {
        provider:
          provider,

        uuid:
          getProviderUUID(
            provider
          )
      }
    );
  }
}


// ==========================================
// PROFILE STATS
// ==========================================

function updateProfileStats() {

  const profileStaked =
    document.getElementById(
      'profileStaked'
    );


  const profilePoints =
    document.getElementById(
      'profilePoints'
    );


  const cards =
    [
      ...document.querySelectorAll(
        '.nft-card'
      )
    ];


  const staked =
    cards.filter(
      card =>
        card.dataset.staked ===
        'true'
    ).length;


  if (profileStaked) {

    profileStaked.textContent =
      staked;
  }


  if (profilePoints) {

    profilePoints.textContent =
      points.toLocaleString();
  }
}


// ==========================================
// PROFILE MENU
// ==========================================

function attachProfileMenu() {

  const oldProfile =
    document.getElementById(
      'profileWrapper'
    );

  if (oldProfile) {

    oldProfile.remove();
  }


  const currentConnectBtn =
    document.getElementById(
      'connectBtn'
    );


  if (currentConnectBtn) {

    currentConnectBtn.style.display =
      'none';
  }


  const nav =
    document.querySelector(
      '.nav'
    );


  if (!nav) return;


  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.id =
    'profileWrapper';

  wrapper.className =
    'profile-wrapper';


  wrapper.innerHTML = `

    <button
      id="profileBtn"
      class="profile-btn"
    >

      <span class="profile-avatar">
        OG
      </span>

      <span>
        ${shortenAddress(account)}
      </span>

      <span class="profile-arrow">
        ▾
      </span>

    </button>


    <div
      id="profileDropdown"
      class="profile-dropdown"
    >

      <div class="profile-header">

        <div class="profile-avatar-large">
          OG
        </div>

        <div>

          <div class="profile-name">
            Ovine Holder
          </div>

          <div class="profile-address">
            ${account}
          </div>

        </div>

      </div>


      <div class="profile-divider"></div>


      <div class="profile-stat-grid">

        <div class="profile-stat">

          <div class="profile-stat-label">
            OVINE NFTs
          </div>

          <div
            id="profileNfts"
            class="profile-stat-value"
          >
            --
          </div>

        </div>


        <div class="profile-stat">

          <div class="profile-stat-label">
            STAKED
          </div>

          <div
            id="profileStaked"
            class="profile-stat-value"
          >
            0
          </div>

        </div>


        <div class="profile-stat">

          <div class="profile-stat-label">
            POINTS
          </div>

          <div
            id="profilePoints"
            class="profile-stat-value"
          >
            0
          </div>

        </div>

      </div>


      <div class="profile-divider"></div>


      <button
        id="copyAddressBtn"
        class="profile-action"
      >

        Copy Address

      </button>


      <button
        id="disconnectWalletBtn"
        class="profile-action danger"
      >

        Disconnect Wallet

      </button>

    </div>

  `;


  nav.appendChild(
    wrapper
  );


  const profileBtn =
    document.getElementById(
      'profileBtn'
    );


  const dropdown =
    document.getElementById(
      'profileDropdown'
    );


  profileBtn?.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      toggleProfileMenu();

    }
  );


  document
    .getElementById(
      'copyAddressBtn'
    )
    ?.addEventListener(
      'click',
      async () => {

        try {

          await navigator.clipboard.writeText(
            account
          );

          const button =
            document.getElementById(
              'copyAddressBtn'
            );

          if (button) {

            button.textContent =
              'Copied ✓';

            setTimeout(
              () => {

                button.textContent =
                  'Copy Address';

              },
              1500
            );
          }

        } catch (error) {

          console.error(
            error
          );

          alert(
            'Could not copy address.'
          );
        }
      }
    );


  document
    .getElementById(
      'disconnectWalletBtn'
    )
    ?.addEventListener(
      'click',
      () => {

        setDisconnected();

      }
    );


  updateProfileStats();
}


// ------------------------------------------
// TOGGLE PROFILE
// ------------------------------------------

function toggleProfileMenu() {

  const dropdown =
    document.getElementById(
      'profileDropdown'
    );


  if (!dropdown) return;


  profileOpen =
    !profileOpen;


  dropdown.classList.toggle(
    'open',
    profileOpen
  );
}


// ------------------------------------------
// REMOVE PROFILE
// ------------------------------------------

function removeProfileMenu() {

  const profile =
    document.getElementById(
      'profileWrapper'
    );


  if (profile) {

    profile.remove();
  }


  const nav =
    document.querySelector(
      '.nav'
    );


  if (!nav) return;


  const existingConnect =
    document.getElementById(
      'connectBtn'
    );


  if (existingConnect) {

    existingConnect.style.display =
      '';
    
    existingConnect.textContent =
      'CONNECT WALLET';

    return;
  }


  // Create new connect button
  // if original one was removed

  const button =
    document.createElement(
      'button'
    );


  button.id =
    'connectBtn';

  button.className =
    'connect-btn';

  button.textContent =
    'CONNECT WALLET';


  nav.appendChild(
    button
  );
}


// ==========================================
// OPEN WALLET PICKER
// ==========================================

function openWalletPicker() {

  createWalletModal();

  renderWalletList();
}


// ==========================================
// DEMO STAKING
// ==========================================

function updateStats() {

  const cards =
    [
      ...document.querySelectorAll(
        '.nft-card'
      )
    ];


  const staked =
    cards.filter(
      card =>
        card.dataset.staked ===
        'true'
    ).length;


  const daily =
    staked * 10;


  if (stakedCountEl) {

    stakedCountEl.textContent =
      staked;
  }


  if (dailyEarnEl) {

    dailyEarnEl.textContent =
      daily;
  }


  if (pointsEl) {

    pointsEl.textContent =
      points.toLocaleString();
  }


  updateProfileStats();
}


// ------------------------------------------
// STAKE / UNSTAKE
// ------------------------------------------

stakeButtons.forEach(
  button => {

    button.addEventListener(
      'click',
      () => {

        if (!account) {

          openWalletPicker();

          return;
        }


        const card =
          button.closest(
            '.nft-card'
          );


        if (!card) return;


        const isStaked =
          card.dataset.staked ===
          'true';


        if (isStaked) {

          card.dataset.staked =
            'false';

          button.textContent =
            'STAKE';

          button.classList.remove(
            'unstake'
          );

        } else {

          card.dataset.staked =
            'true';

          button.textContent =
            'UNSTAKE';

          button.classList.add(
            'unstake'
          );
        }


        updateStats();
      }
    );
  }
);


// ------------------------------------------
// STAKE ALL
// ------------------------------------------

if (stakeAllBtn) {

  stakeAllBtn.addEventListener(
    'click',
    () => {

      if (!account) {

        openWalletPicker();

        return;
      }


      const cards =
        [
          ...document.querySelectorAll(
            '.nft-card'
          )
        ];


      cards.forEach(
        card => {

          card.dataset.staked =
            'true';


          const button =
            card.querySelector(
              '.stake-btn'
            );


          if (button) {

            button.textContent =
              'UNSTAKE';

            button.classList.add(
              'unstake'
            );
          }
        }
      );


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

    const detail =
      event.detail;


    if (!detail) return;


    const provider =
      detail.provider;

    const info =
      detail.info;


    if (!provider || !info) return;


    const exists =
      wallets.some(
        wallet =>
          wallet.info?.uuid ===
          info.uuid
      );


    if (exists) return;


    wallets.push({

      info:
        info,

      provider:
        provider

    });


    renderWalletList();


    // Try auto reconnect
    // after wallet discovery

    autoReconnect();
  }
);


// Request wallet announcements

window.dispatchEvent(
  new Event(
    'eip6963:requestProvider'
  )
);


// ------------------------------------------
// FALLBACK INJECTED WALLET
// ------------------------------------------

if (
  window.ethereum &&
  wallets.length === 0
) {

  wallets.push({

    info: {

      uuid:
        'legacy-injected-wallet',

      name:
        'Browser Wallet',

      icon:
        ''

    },

    provider:
      window.ethereum

  });
}


// ==========================================
// CONNECT BUTTON
// ==========================================

document.addEventListener(
  'click',
  event => {

    const button =
      event.target.closest(
        '#connectBtn'
      );


    if (!button) return;


    if (account) {

      toggleProfileMenu();

    } else {

      openWalletPicker();

    }
  }
);


// ==========================================
// CLOSE PROFILE WHEN CLICKING OUTSIDE
// ==========================================

document.addEventListener(
  'click',
  event => {

    const wrapper =
      document.getElementById(
        'profileWrapper'
      );


    if (!wrapper) return;


    if (
      !wrapper.contains(
        event.target
      )
    ) {

      const dropdown =
        document.getElementById(
          'profileDropdown'
        );


      if (dropdown) {

        dropdown.classList.remove(
          'open'
        );
      }


      profileOpen =
        false;
    }
  }
);


// ==========================================
// DYNAMIC CSS
// ==========================================

const style =
  document.createElement(
    'style'
  );


style.textContent = `

/* ========================================
   WALLET MODAL
======================================== */

#walletModal {

  position: fixed;

  inset: 0;

  z-index: 99999;

}


.wallet-modal-backdrop {

  position: absolute;

  inset: 0;

  background:
    rgba(0, 0, 0, 0.78);

  backdrop-filter:
    blur(8px);

}


.wallet-modal-box {

  position: relative;

  z-index: 2;

  width:
    min(440px, calc(100% - 32px));

  margin:
    12vh auto 0;

  padding:
    24px;

  background:
    #111;

  border:
    1px solid
    rgba(255,255,255,.12);

  border-radius:
    18px;

  box-shadow:
    0 30px 100px
    rgba(0,0,0,.65);

}


.wallet-modal-header {

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  margin-bottom:
    20px;

}


.wallet-modal-title {

  font-size:
    20px;

  font-weight:
    800;

}


.wallet-modal-subtitle {

  margin-top:
    4px;

  opacity:
    .55;

  font-size:
    13px;

}


.wallet-modal-close {

  border:
    0;

  background:
    transparent;

  color:
    white;

  font-size:
    28px;

  cursor:
    pointer;

}


.wallet-list {

  display:
    flex;

  flex-direction:
    column;

  gap:
    10px;

}


.wallet-option {

  width:
    100%;

  display:
    flex;

  align-items:
    center;

  gap:
    14px;

  padding:
    13px 15px;

  background:
    rgba(255,255,255,.045);

  border:
    1px solid
    rgba(255,255,255,.08);

  border-radius:
    12px;

  color:
    white;

  cursor:
    pointer;

  text-align:
    left;

  transition:
    .2s ease;

}


.wallet-option:hover {

  background:
    rgba(255,255,255,.09);

  border-color:
    rgba(255,255,255,.2);

  transform:
    translateY(-1px);

}


.wallet-option-icon {

  width:
    40px;

  height:
    40px;

  border-radius:
    10px;

  overflow:
    hidden;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  background:
    rgba(255,255,255,.08);

  font-size:
    20px;

}


.wallet-option-icon img {

  width:
    100%;

  height:
    100%;

  object-fit:
    cover;

}


.wallet-option-name {

  flex:
    1;

  font-weight:
    700;

}


.wallet-option-arrow {

  opacity:
    .5;

  font-size:
    18px;

}


.wallet-empty {

  padding:
    20px;

  text-align:
    center;

  opacity:
    .65;

  line-height:
    1.6;

}


/* ========================================
   PROFILE
======================================== */

.profile-wrapper {

  position:
    relative;

  display:
    inline-flex;

}


.profile-btn {

  display:
    flex;

  align-items:
    center;

  gap:
    8px;

  padding:
    8px 12px;

  border:
    1px solid
    rgba(255,255,255,.14);

  border-radius:
    999px;

  background:
    rgba(255,255,255,.06);

  color:
    white;

  cursor:
    pointer;

}


.profile-avatar {

  width:
    28px;

  height:
    28px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  background:
    white;

  color:
    black;

  font-size:
    10px;

  font-weight:
    900;

}


.profile-arrow {

  opacity:
    .5;

}


.profile-dropdown {

  position:
    absolute;

  right:
    0;

  top:
    calc(100% + 10px);

  width:
    320px;

  padding:
    16px;

  background:
    #111;

  border:
    1px solid
    rgba(255,255,255,.12);

  border-radius:
    16px;

  box-shadow:
    0 25px 80px
    rgba(0,0,0,.6);

  opacity:
    0;

  visibility:
    hidden;

  transform:
    translateY(-6px);

  transition:
    .18s ease;

  z-index:
    9999;

}


.profile-dropdown.open {

  opacity:
    1;

  visibility:
    visible;

  transform:
    translateY(0);

}


.profile-header {

  display:
    flex;

  gap:
    12px;

  align-items:
    center;

}


.profile-avatar-large {

  width:
    46px;

  height:
    46px;

  border-radius:
    50%;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  background:
    white;

  color:
    black;

  font-weight:
    900;

}


.profile-name {

  font-weight:
    800;

  margin-bottom:
    3px;

}


.profile-address {

  max-width:
    220px;

  overflow:
    hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;

  opacity:
    .5;

  font-size:
    11px;

}


.profile-divider {

  height:
    1px;

  background:
    rgba(255,255,255,.08);

  margin:
    15px 0;

}


.profile-stat-grid {

  display:
    grid;

  grid-template-columns:
    repeat(3, 1fr);

  gap:
    8px;

}


.profile-stat {

  padding:
    10px;

  background:
    rgba(255,255,255,.04);

  border-radius:
    10px;

}


.profile-stat-label {

  font-size:
    8px;

  opacity:
    .45;

  margin-bottom:
    5px;

}


.profile-stat-value {

  font-size:
    16px;

  font-weight:
    800;

}


.profile-action {

  width:
    100%;

  padding:
    11px;

  margin-top:
    8px;

  border:
    1px solid
    rgba(255,255,255,.08);

  border-radius:
    10px;

  background:
    rgba(255,255,255,.04);

  color:
    white;

  cursor:
    pointer;

  text-align:
    left;

}


.profile-action:hover {

  background:
    rgba(255,255,255,.08);

}


.profile-action.danger {

  color:
    #ff7777;

}


@media (max-width: 600px) {

  .profile-dropdown {

    position:
      fixed;

    left:
      16px;

    right:
      16px;

    top:
      80px;

    width:
      auto;

  }

}

`;


document.head.appendChild(
  style
);


// ==========================================
// INITIALIZE
// ==========================================

if (walletChip) {

  walletChip.textContent =
    'Wallet not connected';
}


updateStats();


// Try reconnect on page load

autoReconnect();


console.log(
  'Ovine Genesis staking loaded.'
);
