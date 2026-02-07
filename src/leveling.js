// src/leveling.js
export function clampLevel(level) {
  return Math.max(1, Math.min(5, level));
}

// Simple rule: >=80% => level up, <=50% => level down, else stay.
export function updateLevelAfterMission(currentLevel, correctCount, totalCount) {
  const total = Math.max(1, totalCount);
  const accuracy = correctCount / total;

  if (accuracy >= 0.8) return clampLevel(currentLevel + 1);
  if (accuracy <= 0.5) return clampLevel(currentLevel - 1);
  return clampLevel(currentLevel);
}
