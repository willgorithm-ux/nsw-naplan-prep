import { initStorage } from './storage.js';
import { renderWelcome } from './views/welcome.js';
import { renderCodesign } from './views/codesign.js';
import { renderDashboard } from './views/dashboard.js';
import { renderModuleSelect } from './views/moduleSelect.js';
import { renderMissionSetup } from './views/missionSetup.js';
import { renderQuiz } from './views/quiz.js';
import { renderResults } from './views/results.js';
import { renderBreakTime } from './views/breakTime.js';
import { renderSettings } from './views/settings.js';

let currentRoute = null;
let routeParams = {};

const routes = {
  welcome: { render: renderWelcome },
  codesign: { render: renderCodesign },
  dashboard: { render: renderDashboard },
  'module-select': { render: renderModuleSelect },
  'mission-setup': { render: renderMissionSetup },
  quiz: { render: renderQuiz },
  results: { render: renderResults },
  'break-time': { render: renderBreakTime },
  settings: { render: renderSettings }
};

export function navigate(routeName, params = {}) {
  currentRoute = routeName;
  routeParams = params;
  render();
}

function render() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';
  routes[currentRoute].render(root, routeParams);
}

export async function initApp() {
  await initStorage();
  const storage = globalThis.__NAPLAN_STORAGE__;
  const profile = await storage.getProfile();
  navigate(profile ? 'dashboard' : 'welcome');
}

window.addEventListener('DOMContentLoaded', initApp);
