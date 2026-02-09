/**
 * Weights to calculate trending scores.
 * Decay_period is in hours and can be adjusted as well.
 */
export const TRENDING_WEIGHTS = Object.freeze({
  VIEWS: 0.5,
  LIKES: 0.3,
  SHARES: 0.2,
  DECAY_PERIOD: 24,
});
