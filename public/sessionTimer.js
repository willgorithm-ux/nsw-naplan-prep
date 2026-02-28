export function createTimerState(durationMinutes) {
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
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
export function isExpired(state) { return state.currentStatus === 'expired'; }
export function shouldShowWarning(state) { return state.currentStatus === 'warning' && !state.warningShownAt; }