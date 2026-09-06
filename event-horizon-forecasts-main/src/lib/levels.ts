export const LEVELS = [
  { name: "Rookie", score: 0 },
  { name: "Sharp Thinker", score: 5 },
  { name: "Analyst", score: 18 },
  { name: "Expert", score: 40 },
  { name: "Top Predictor", score: 70 },
  { name: "Market Master", score: 120 },
] as const;

export const getScore = (totalPredictions: number, wins: number) => totalPredictions + wins * 2;

export const getTraderLevel = (totalPredictions: number, wins: number) => {
  const score = getScore(totalPredictions, wins);
  return [...LEVELS].reverse().find((level) => score >= level.score)?.name || "Rookie";
};

export const getCurrentWinStreak = (resolved: Array<{ isWinner?: boolean; resolvedAt?: string; createdAt?: string }>) => {
  const recent = [...resolved].sort((a, b) => new Date(b.resolvedAt || b.createdAt || 0).getTime() - new Date(a.resolvedAt || a.createdAt || 0).getTime());
  let streak = 0;
  for (const position of recent) {
    if (!position.isWinner) break;
    streak += 1;
  }
  return streak;
};

export const getBestWinStreak = (resolved: Array<{ isWinner?: boolean; resolvedAt?: string; createdAt?: string }>) => {
  const ordered = [...resolved].sort((a, b) => new Date(a.resolvedAt || a.createdAt || 0).getTime() - new Date(b.resolvedAt || b.createdAt || 0).getTime());
  let best = 0;
  let current = 0;
  for (const position of ordered) {
    current = position.isWinner ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
};

export const getNextLevel = (levelName: string) => {
  const index = LEVELS.findIndex((level) => level.name === levelName);
  return LEVELS[Math.min(index + 1, LEVELS.length - 1)]?.name || levelName;
};

export const getLevelProgress = (totalPredictions: number, wins: number) => {
  const score = totalPredictions + wins * 2;
  const currentIndex = Math.max(0, LEVELS.findIndex((level) => level.name === getTraderLevel(totalPredictions, wins)));
  const current = LEVELS[currentIndex] || LEVELS[0];
  const next = LEVELS[Math.min(currentIndex + 1, LEVELS.length - 1)] || current;
  if (current.name === next.name) return 100;
  return Math.max(0, Math.min(100, Math.round(((score - current.score) / (next.score - current.score)) * 100)));
};
