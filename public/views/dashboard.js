import { navigate } from '../main.js';
import { getStorage } from '../storage.js';

export async function renderDashboard(root) {
  const storage = getStorage();
  const profile = await storage.getProfile();
  const progress = await storage.getProgress();

  const nickname = profile?.nickname || 'Explorer';
  const totalGems = progress?.totalGems ?? 0;

  root.innerHTML = `
    <div class="view view-dashboard">
      <div class="dashboard-header">
        <div class="mascot">🌟</div>
        <div class="welcome-text">
          <h1>Hey ${escapeHtml(nickname)}! 👋</h1>
          <p class="buddy-intro">I'm <strong>Ziggy</strong>, your NAPLAN Study Buddy!</p>
          <p class="tagline">Let's learn something awesome today! 🚀</p>
        </div>
      </div>

      <div class="gems-display">
        <span class="gem-icon">💎</span>
        <span class="gem-count">${totalGems}</span>
        <span class="gem-label">Total Gems</span>
      </div>

      <button class="btn-primary btn-start-mission" id="startBtn">
        🎯 Start a Mission!
      </button>

      <button class="btn-secondary" id="settingsBtn">⚙️ Settings</button>
    </div>
  `;

  root.querySelector('#startBtn').addEventListener('click', () => navigate('module-select'));
  root.querySelector('#settingsBtn').addEventListener('click', () => navigate('settings'));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
