import { navigate } from "../main.js";
import { getStorage } from "../storage.js";
import { updateLevelAfterMission } from "../leveling.js";

export async function renderResults(root, params = {}) {
  const storage = getStorage();
  const progress = await storage.getProgress();

  const module = params.module;
  const correct = params.correctCount ?? 0;
  const total = params.total ?? 0;
  const gems = params.gemCount ?? 0;

  const currentLevel = progress.levels?.[module] ?? 1;
  const newLevel = updateLevelAfterMission(currentLevel, correct, total);

  // Persist new level + total gems
  const updated = {
    ...progress,
    totalGems: (progress.totalGems ?? 0) + gems,
    levels: { ...(progress.levels || {}), [module]: newLevel }
  };
  await storage.setProgress(updated);

  // Mission complete; clear resumable session
  await storage.clearSession();

  root.innerHTML = `
    <div class="view">
      <h1>Mission Complete! 🌟</h1>
      <p>You got <strong>${correct}</strong> out of <strong>${total}</strong> correct.</p>
      <p>You earned <strong>${gems}</strong> gems this mission.</p>
      <p><strong>Level:</strong> ${currentLevel} → ${newLevel}</p>

      <button class="btn-primary" id="menuBtn">Back to Menu</button>
    </div>
  `;

  root.querySelector("#menuBtn").addEventListener("click", () => navigate("module-select"));
}
