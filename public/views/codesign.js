import { navigate } from '../main.js';
import { getStorage } from '../storage.js';
export function renderCodesign(root) {
  root.innerHTML = `
    <div class="view view-codesign">
      <h1>Pick a Theme 🎨</h1>
      <div class="theme-buttons">
        <button onclick="saveTheme('space')">🚀 Space</button>
        <button onclick="saveTheme('jungle')">🌴 Jungle</button>
        <button onclick="saveTheme('ocean')">🌊 Ocean</button>
      </div>
    </div>
  `;
  window.saveTheme = async (theme) => {
    await getStorage().setSettings({ theme, colors: { primary: '#6366F1' }, avatar: 'astronaut-1' });
    navigate('dashboard');
  };
}