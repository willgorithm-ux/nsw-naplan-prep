export function initSubskill(subskillId) {
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
}