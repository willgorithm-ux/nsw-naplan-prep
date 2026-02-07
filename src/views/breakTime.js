import { navigate } from '../main.js';
export function renderBreakTime(root) {
  root.innerHTML = `
    <div class="view warning-bg">
      <h1>⏰ Break Time!</h1>
      <p>You've been learning for 20 minutes.</p>
      <button onclick="exit()">Save & Exit</button>
    </div>
  `;
  window.exit = () => navigate('dashboard');
}