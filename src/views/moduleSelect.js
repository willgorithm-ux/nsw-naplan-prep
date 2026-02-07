import { navigate } from '../main.js';
import { getStorage } from '../storage.js';

export async function renderModuleSelect(root) {
  const storage = getStorage();
  const session = await storage.getSession();
  const progress = await storage.getProgress();

  root.innerHTML = `
    <div class="view view-module">
      <h1>🎯 Pick Your Mission!</h1>
      <p style="margin-bottom: 24px; font-size: 16px; color: #64748b;">
        Choose what you want to practice with Ziggy today!
      </p>

      ${session ? `<button class="btn-secondary" id="resumeBtn">▶️ Resume Last Mission</button>` : ''}

      <button id="numBtn">🔢 Numeracy <span style="font-size:14px; color:#64748b;">(Level ${progress?.levels?.numeracy ?? 1})</span></button>
      <button id="readBtn">📖 Reading <span style="font-size:14px; color:#64748b;">(Level ${progress?.levels?.reading ?? 1})</span></button>
      <button id="convBtn">✍️ Grammar <span style="font-size:14px; color:#64748b;">(Level ${progress?.levels?.conventions ?? 1})</span></button>
      <button id="writeBtn">📝 Writing <span style="font-size:14px; color:#64748b;">(Level ${progress?.levels?.writing ?? 1})</span></button>
    </div>
  `;

  if (session) {
    root.querySelector('#resumeBtn').addEventListener('click', () => {
      navigate('quiz', { resume: true });
    });
  }

  root.querySelector('#numBtn').addEventListener('click', () => navigate('mission-setup', { module: 'numeracy' }));
  root.querySelector('#readBtn').addEventListener('click', () => navigate('mission-setup', { module: 'reading' }));
  root.querySelector('#convBtn').addEventListener('click', () => navigate('mission-setup', { module: 'conventions' }));
  root.querySelector('#writeBtn').addEventListener('click', () => navigate('mission-setup', { module: 'writing' }));
}