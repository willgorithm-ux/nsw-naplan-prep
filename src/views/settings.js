import { navigate } from '../main.js';
import { getStorage } from '../storage.js';

export async function renderSettings(root) {
  const storage = getStorage();
  const settings = await storage.getSettings();
  const profile = await storage.getProfile();
  const childName = profile?.nickname || settings?.childName || 'Student';

  root.innerHTML = `
    <div class="view view-settings">
      <button class="btn-secondary" id="backBtn" style="margin-bottom: 16px;">← Back to Home</button>
      <h1>⚙️ Settings</h1>
      
      <div class="settings-section">
        <h2>Profile</h2>
        <div class="form-group">
          <label for="childName">Your Name</label>
          <input type="text" id="childName" value="${escapeHtml(childName)}" maxlength="20" placeholder="Enter your name">
        </div>
      </div>
      
      <div class="settings-section">
        <h2>Preferences</h2>
        
        <div class="form-group">
          <label>Sound Effects</label>
          <label class="toggle">
            <input type="checkbox" id="soundOn" ${settings?.soundOn !== false ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="form-group">
          <label>Mission Length</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="missionSize" value="5" ${settings?.defaultMissionSize === 5 ? 'checked' : ''}>
              <span>Quick (5)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="missionSize" value="10" ${(!settings?.defaultMissionSize || settings?.defaultMissionSize === 10) ? 'checked' : ''}>
              <span>Standard (10)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="missionSize" value="15" ${settings?.defaultMissionSize === 15 ? 'checked' : ''}>
              <span>Challenge (15)</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="settings-section danger-zone">
        <h2>⚠️ Danger Zone</h2>
        <p>Start fresh with a new profile. This will delete all your levels and gems!</p>
        <button class="btn-danger" id="resetBtn">Start New Profile (Reset All)</button>
      </div>
    </div>
  `;

  // Back button
  root.querySelector('#backBtn').addEventListener('click', () => {
    saveSettings();
    navigate('dashboard');
  });

  // Reset button
  root.querySelector('#resetBtn').addEventListener('click', async () => {
    const currentName = root.querySelector('#childName').value || 'Student';
    const confirmed = confirm(`Are you sure? This will delete all levels and gems for ${currentName}. You cannot undo this.`);
    
    if (confirmed) {
      await storage.resetProgress();
      await storage.setSettings({
        ...await storage.getSettings(),
        childName: 'Student'
      });
      navigate('dashboard');
    }
  });

  async function saveSettings() {
    const newName = root.querySelector('#childName').value.trim().substring(0, 20) || 'Student';
    const soundOn = root.querySelector('#soundOn').checked;
    const missionSize = parseInt(root.querySelector('input[name="missionSize"]:checked').value, 10);

    // Update profile nickname
    await storage.setProfile({
      ...profile,
      nickname: newName
    });

    // Update settings
    await storage.setSettings({
      ...settings,
      childName: newName,
      soundOn,
      defaultMissionSize: missionSize
    });
  }

  // Auto-save on changes (optional - also saves on back button)
  root.querySelector('#childName').addEventListener('blur', saveSettings);
  root.querySelector('#soundOn').addEventListener('change', saveSettings);
  root.querySelectorAll('input[name="missionSize"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}
