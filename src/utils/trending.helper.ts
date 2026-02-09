import { TRENDING_WEIGHTS } from "../constants/trendingWeights";

/**
 * We want to calculate base score with the help of weights. Weights can be adjusted later accordingly.
 * Decay factor makes sure new content gets the boost by implementing exponential decay.
 * At last we combine those two.
 * Base score: we measure the engagement and decay factor:Adjusts this score based on time
 * @param views We accept view count.
 * @param likes like count.
 * @param shares share count.
 * @param createdAt post date.
 * @returns {number} trending score for a stream.
 */
export const calculateTrendingScore = async (
  views: number,
  likes: number,
  shares: number,
  createdAt: Date
): Promise<number> => {
  const baseScore =
    TRENDING_WEIGHTS.VIEWS * views +
    TRENDING_WEIGHTS.LIKES * likes +
    TRENDING_WEIGHTS.SHARES * shares;
  const timeSincePosted =
    (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const decayFactor = Math.exp(
    -timeSincePosted / TRENDING_WEIGHTS.DECAY_PERIOD
  );
  const trendingScore = baseScore * decayFactor;
  return trendingScore;
};
