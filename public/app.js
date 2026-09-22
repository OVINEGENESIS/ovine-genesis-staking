const connectBtn = document.getElementById('connectBtn');
const walletChip = document.getElementById('walletChip');
const stakeButtons = document.querySelectorAll('.stake-btn');
const stakeAllBtn = document.getElementById('stakeAllBtn');
const pointsEl = document.getElementById('points');
const stakedCountEl = document.getElementById('stakedCount');
const dailyEarnEl = document.getElementById('dailyEarn');

let connected = false;
let points = 0;

function updateStats() {
  const staked = [...document.querySelectorAll('.nft-card')].filter(card => card.dataset.staked === 'true').length;
  stakedCountEl.textContent = staked;
  dailyEarnEl.textContent = `+${staked * 10}`;
  pointsEl.textContent = points.toLocaleString();
}

connectBtn.addEventListener('click', () => {
  connected = !connected;
  connectBtn.textContent = connected ? '0x8A...91F2' : 'Connect Wallet';
  walletChip.textContent = connected ? 'Connected: 0x8A...91F2' : 'Wallet not connected';
});

stakeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.nft-card');
    const isStaked = card.dataset.staked === 'true';
    card.dataset.staked = (!isStaked).toString();
    btn.textContent = isStaked ? 'Stake' : 'Unstake';
    points += isStaked ? 0 : 10;
    updateStats();
  });
});

stakeAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.nft-card').forEach(card => {
    card.dataset.staked = 'true';
    card.querySelector('.stake-btn').textContent = 'Unstake';
  });
  points += 30;
  updateStats();
});

updateStats();
