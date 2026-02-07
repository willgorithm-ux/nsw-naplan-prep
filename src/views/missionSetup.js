import { navigate } from '../main.js';
import { getStorage } from '../storage.js';

export async function renderMissionSetup(root, params) {
  const { module } = params;
  const storage = getStorage();
  const progress = await storage.getProgress();
  const level = progress.levels?.[module] ?? 1;

  const moduleEmoji = {
    numeracy: '🔢',
    reading: '📖',
    conventions: '✍️',
    writing: '📝'
  };

  root.innerHTML = `
    <div class="view">
      <h1>${moduleEmoji[module]} Mission Setup</h1>
      <p style="margin-bottom:20px;"><strong>Module:</strong> ${module}</p>
      <p style="margin-bottom:20px;"><strong>Your Level:</strong> ${level} ⭐</p>

      <h2 style="margin-top:24px; font-size:22px;">How many questions?</h2>
      <p style="font-size:14px; color:#64748b; margin-bottom:16px;">Pick a challenge level!</p>

      <div class="options">
        <button class="option-btn" data-size="10">🎯 Quick (10 questions)</button>
        <button class="option-btn" data-size="20">🚀 Medium (20 questions)</button>
        <button class="option-btn" data-size="30">🏆 Epic (30 questions)</button>
      </div>

      <div style="margin-top: 18px;">
        <button class="btn-secondary" id="backBtn">← Back</button>
      </div>
    </div>
  `;

  root.querySelector('#backBtn').addEventListener('click', () => {
    navigate('module-select');
  });

  root.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = Number(btn.dataset.size);
      navigate('quiz', { module, missionSize: size });
    });
  });
}
