import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirs = [
  'src/views',
  'src/styles',
  'src/utils',
  'src/__tests__',
  'public'
];

// 1. Create Directories
console.log('📂 Creating directories...');
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`   Created ${dir}`);
  }
});

// 2. Define Files Content
const files = {
  // --- CORE FILES ---
  'src/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NAPLAN Mission - Year 3 Prep</title>
    <link rel="stylesheet" href="styles/main.css">
    <link rel="stylesheet" href="styles/themes.css">
    <link rel="stylesheet" href="styles/responsive.css">
</head>
<body>
    <div id="app-root" class="app-container"></div>
    <script type="module" src="main.js"></script>
</body>
</html>`,

  'src/main.js': `import { initStorage } from './storage.js';
import { renderWelcome } from './views/welcome.js';
import { renderCodesign } from './views/codesign.js';
import { renderDashboard } from './views/dashboard.js';
import { renderModuleSelect } from './views/moduleSelect.js';
import { renderQuiz } from './views/quiz.js';
import { renderResults } from './views/results.js';
import { renderBreakTime } from './views/breakTime.js';
import { renderSettings } from './views/settings.js';

let currentRoute = null;
let routeParams = {};

const routes = {
  'welcome': { render: renderWelcome },
  'codesign': { render: renderCodesign },
  'dashboard': { render: renderDashboard },
  'module-select': { render: renderModuleSelect },
  'quiz': { render: renderQuiz },
  'results': { render: renderResults },
  'break-time': { render: renderBreakTime },
  'settings': { render: renderSettings },
};

export function navigate(routeName, params = {}) {
  if (routes[routeName]) {
    currentRoute = routeName;
    routeParams = params;
    render();
  } else {
    console.error(\`Route not found: \${routeName}\`);
  }
}

function render() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';
  const route = routes[currentRoute];
  if (route) route.render(root, routeParams);
}

export async function initApp() {
  await initStorage();
  const storage = window.__NAPLAN_STORAGE__;
  const profile = await storage.getProfile();
  const startRoute = profile ? 'dashboard' : 'welcome';
  navigate(startRoute);
}

window.addEventListener('DOMContentLoaded', initApp);`,

  'src/storage.js': `class StorageInterface {
  async setProfile(profile) { localStorage.setItem('naplan:profile', JSON.stringify(profile)); }
  async getProfile() { const data = localStorage.getItem('naplan:profile'); return data ? JSON.parse(data) : null; }
  async setSettings(settings) { localStorage.setItem('naplan:settings', JSON.stringify(settings)); }
  async getSettings() { const data = localStorage.getItem('naplan:settings'); return data ? JSON.parse(data) : this._defaultSettings(); }
  async setProgress(progress) { localStorage.setItem('naplan:progress', JSON.stringify(progress)); }
  async getProgress() { const data = localStorage.getItem('naplan:progress'); return data ? JSON.parse(data) : this._defaultProgress(); }
  
  _defaultSettings() { return { theme: 'space', colors: { primary: '#6366F1', secondary: '#EC4899', accent: '#10B981' }, avatar: 'astronaut-1', soundOn: true, sessionLengthMinutes: 20 }; }
  _defaultProgress() { return { subskills: {}, dailyStreak: 0, totalGems: 0, sessionsCompleted: 0, masteredCount: 0, createdAt: new Date().toISOString() }; }
}

let storageInstance = null;
export async function initStorage() { storageInstance = new StorageInterface(); window.__NAPLAN_STORAGE__ = storageInstance; }
export function getStorage() { return storageInstance; }`,

  'src/sessionTimer.js': `export function createTimerState(durationMinutes) {
  return { startTime: Date.now(), maxDurationMs: durationMinutes * 60 * 1000, currentStatus: 'running', warningShownAt: null, elapsedMs: 0 };
}
export function updateTimerState(state, currentTime) {
  const elapsed = Math.max(0, currentTime - state.startTime);
  const updatedState = { ...state, elapsedMs: elapsed };
  if (elapsed >= state.maxDurationMs) { updatedState.currentStatus = 'expired'; return updatedState; }
  const warningThreshold = state.maxDurationMs - 60000;
  if (elapsed >= warningThreshold && state.currentStatus !== 'expired') {
    if (!state.warningShownAt) updatedState.warningShownAt = currentTime;
    updatedState.currentStatus = 'warning';
    return updatedState;
  }
  updatedState.currentStatus = 'running';
  return updatedState;
}
export function formatRemainingTime(state) {
  const remaining = Math.max(0, state.maxDurationMs - state.elapsedMs);
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return \`\${minutes}:\${secs.toString().padStart(2, '0')}\`;
}
export function isExpired(state) { return state.currentStatus === 'expired'; }
export function shouldShowWarning(state) { return state.currentStatus === 'warning' && !state.warningShownAt; }`,

  'src/mastery.js': `export function initSubskill(subskillId) {
  return { id: subskillId, status: 'unseen', streakCorrect: 0, totalAttempts: 0, correctAttempts: 0, difficulty: 1, lastSeen: null, scheduledReviewQueue: [] };
}
export function updateMasteryAfterAnswer(subskillState, correct, questionId) {
  const updated = { ...subskillState };
  updated.totalAttempts += 1;
  if (correct) {
    updated.correctAttempts += 1;
    updated.streakCorrect += 1;
    if (updated.streakCorrect >= 3 && updated.status !== 'mastered') {
      updated.status = 'mastered';
      updated.difficulty = Math.min(5, updated.difficulty + 1);
    }
  } else {
    updated.streakCorrect = 0;
    if (updated.status === 'unseen') updated.status = 'learning';
    if (!updated.scheduledReviewQueue.includes(questionId)) updated.scheduledReviewQueue.push(questionId);
  }
  updated.lastSeen = new Date().toISOString();
  return updated;
}`,

  'src/curriculum.js': `export const QUESTIONS = [
  { id: 'q-num-1', domain: 'numeracy', prompt: 'What comes after 25?', choices: ['24', '25', '26', '27'], correctAnswer: '26', explanation: '26 follows 25.', type: 'mcq' },
  { id: 'q-read-1', domain: 'reading', prompt: 'Which word is spelled correctly?', choices: ['teh', 'the', 'thier', 'thye'], correctAnswer: 'the', explanation: '"The" is correct.', type: 'mcq' },
  { id: 'q-conv-1', domain: 'conventions', prompt: 'Fix: "i like dogs"', choices: ['I like dogs.', 'i like dogs', 'I Like Dogs', 'I like Dogs.'], correctAnswer: 'I like dogs.', explanation: 'Start with capital I, end with period.', type: 'mcq' }
];
export function getQuestionBank() { return QUESTIONS; }`,

  // --- VIEWS ---
  'src/views/welcome.js': `import { navigate } from '../main.js';
import { getStorage } from '../storage.js';
export function renderWelcome(root) {
  root.innerHTML = \`
    <div class="view view-welcome">
      <h1>Welcome to NAPLAN Mission! 🚀</h1>
      <p>Let's get ready!</p>
      <input type="text" id="nickname" placeholder="Enter your name" class="input-primary">
      <button class="btn-primary" onclick="handleNameSubmit()">Let's Go! →</button>
    </div>
  \`;
  window.handleNameSubmit = async () => {
    const name = document.getElementById('nickname').value;
    if(name) {
      await getStorage().setProfile({ nickname: name });
      navigate('codesign');
    } else alert('Please enter a name!');
  };
}`,

  'src/views/codesign.js': `import { navigate } from '../main.js';
import { getStorage } from '../storage.js';
export function renderCodesign(root) {
  root.innerHTML = \`
    <div class="view view-codesign">
      <h1>Pick a Theme 🎨</h1>
      <div class="theme-buttons">
        <button onclick="saveTheme('space')">🚀 Space</button>
        <button onclick="saveTheme('jungle')">🌴 Jungle</button>
        <button onclick="saveTheme('ocean')">🌊 Ocean</button>
      </div>
    </div>
  \`;
  window.saveTheme = async (theme) => {
    await getStorage().setSettings({ theme, colors: { primary: '#6366F1' }, avatar: 'astronaut-1' });
    navigate('dashboard');
  };
}`,

  'src/views/dashboard.js': `import { navigate } from '../main.js';
export function renderDashboard(root) {
  root.innerHTML = \`
    <div class="view view-dashboard">
      <h1>Mission Control 🛰️</h1>
      <button class="btn-primary btn-large" onclick="startMission()">Start 20-min Mission</button>
    </div>
  \`;
  window.startMission = () => navigate('module-select');
}`,

  'src/views/moduleSelect.js': `import { navigate } from '../main.js';
export function renderModuleSelect(root) {
  root.innerHTML = \`
    <div class="view view-module">
      <h1>Select Training Module</h1>
      <button onclick="startQuiz('numeracy')">123 Numeracy</button>
      <button onclick="startQuiz('reading')">📖 Reading</button>
      <button onclick="startQuiz('conventions')">✍️ Grammar</button>
    </div>
  \`;
  window.startQuiz = (module) => navigate('quiz', { module });
}`,

  'src/views/quiz.js': `import { navigate } from '../main.js';
import { createTimerState, updateTimerState, formatRemainingTime, isExpired } from '../sessionTimer.js';
import { getQuestionBank } from '../curriculum.js';

export function renderQuiz(root, params) {
  let timer = createTimerState(20); // 20 mins
  let qIndex = 0;
  const questions = getQuestionBank().filter(q => params.module ? q.domain === params.module : true);

  function render() {
    if (qIndex >= questions.length) return navigate('results');
    const q = questions[qIndex];
    root.innerHTML = \`
      <div class="view view-quiz">
        <div class="timer-bar">⏱️ <span id="time">20:00</span></div>
        <h2>\${q.prompt}</h2>
        <div class="options">
          \${q.choices.map(c => \`<button onclick="submit('\${c}')">\${c}</button>\`).join('')}
        </div>
      </div>
    \`;
  }

  window.submit = (ans) => {
    qIndex++;
    render();
  };

  const interval = setInterval(() => {
    timer = updateTimerState(timer, Date.now());
    const el = document.getElementById('time');
    if(el) el.innerText = formatRemainingTime(timer);
    if(isExpired(timer)) {
      clearInterval(interval);
      navigate('break-time');
    }
  }, 1000);
  
  render();
}`,

  'src/views/results.js': `import { navigate } from '../main.js';
export function renderResults(root) {
  root.innerHTML = \`
    <div class="view">
      <h1>Mission Complete! 🌟</h1>
      <p>Great job!</p>
      <button onclick="finish()">Back to Base</button>
    </div>
  \`;
  window.finish = () => navigate('dashboard');
}`,

  'src/views/breakTime.js': `import { navigate } from '../main.js';
export function renderBreakTime(root) {
  root.innerHTML = \`
    <div class="view warning-bg">
      <h1>⏰ Break Time!</h1>
      <p>You've been learning for 20 minutes.</p>
      <button onclick="exit()">Save & Exit</button>
    </div>
  \`;
  window.exit = () => navigate('dashboard');
}`,
  
  'src/views/settings.js': `export function renderSettings(root) { root.innerHTML = '<h1>Settings</h1>'; }`,

  // --- STYLES ---
  'src/styles/main.css': `
    body { font-family: system-ui, sans-serif; margin: 0; background: #f0f4f8; color: #333; }
    .app-container { max-width: 800px; margin: 0 auto; min-height: 100vh; background: white; padding: 20px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
    .view { text-align: center; padding: 40px 20px; }
    h1 { color: #4f46e5; margin-bottom: 30px; }
    button { background: #4f46e5; color: white; border: none; padding: 15px 30px; font-size: 1.1rem; border-radius: 12px; cursor: pointer; margin: 10px; transition: transform 0.1s; }
    button:hover { transform: scale(1.05); background: #4338ca; }
    .input-primary { padding: 15px; font-size: 1.2rem; border: 2px solid #e5e7eb; border-radius: 12px; width: 80%; max-width: 300px; margin-bottom: 20px; display: block; margin: 0 auto 20px; }
    .timer-bar { font-size: 1.5rem; font-weight: bold; color: #dc2626; margin-bottom: 20px; }
    .options { display: flex; flex-direction: column; gap: 10px; max-width: 400px; margin: 0 auto; }
    .warning-bg { background: #fef2f2; border: 4px solid #ef4444; border-radius: 20px; }
  `,
  'src/styles/themes.css': ``,
  'src/styles/responsive.css': ``
};

// 3. Write Files
console.log('📝 Writing files...');
Object.entries(files).forEach(([filePath, content]) => {
  fs.writeFileSync(path.join(__dirname, filePath), content);
  console.log(`   Written ${filePath}`);
});

console.log('✅ Installation complete! Run "npm run dev" to start.');
