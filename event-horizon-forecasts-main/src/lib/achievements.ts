import type { LucideIcon } from "lucide-react";
import { Award, BarChart3, Crown, Flame, Medal, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import type { ApiPosition, ApiProfileStats } from "./api";
import { getBestWinStreak } from "./levels";

export type AchievementInput = {
  stats: ApiProfileStats;
  positions: ApiPosition[];
};

export type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  check: (input: AchievementInput) => boolean;
  progress?: (input: AchievementInput) => { current: number; target: number };
};

const resolvedPositions = (positions: ApiPosition[]) =>
  positions.filter((p) => Boolean(p.resolvedAt) && typeof p.isWinner === "boolean");

const winRateOf = (input: AchievementInput) => {
  const resolved = resolvedPositions(input.positions);
  if (resolved.length === 0) return 0;
  const wins = resolved.filter((p) => p.isWinner).length;
  return Math.round((wins / resolved.length) * 100);
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_prediction",
    label: "First Prediction",
    description: "Placed your first position",
    icon: Zap,
    check: ({ stats }) => stats.totalPredictions >= 1,
  },
  {
    id: "ten_predictions",
    label: "Active Predictor",
    description: "Completed 10 predictions",
    icon: TrendingUp,
    check: ({ stats }) => stats.totalPredictions >= 10,
    progress: ({ stats }) => ({ current: stats.totalPredictions, target: 10 }),
  },
  {
    id: "fifty_predictions",
    label: "Market Veteran",
    description: "Completed 50 predictions",
    icon: Crown,
    check: ({ stats }) => stats.totalPredictions >= 50,
    progress: ({ stats }) => ({ current: stats.totalPredictions, target: 50 }),
  },
  {
    id: "hundred_predictions",
    label: "Market Legend",
    description: "Completed 100 predictions",
    icon: Medal,
    check: ({ stats }) => stats.totalPredictions >= 100,
    progress: ({ stats }) => ({ current: stats.totalPredictions, target: 100 }),
  },
  {
    id: "first_win",
    label: "Breakthrough",
    description: "Won your first prediction",
    icon: BarChart3,
    check: (input) => input.positions.some((p) => p.isWinner),
    progress: (input) => ({
      current: input.positions.filter((p) => p.isWinner).length,
      target: 1,
    }),
  },
  {
    id: "ten_wins",
    label: "Proven Predictor",
    description: "Won 10 predictions",
    icon: Trophy,
    check: (input) => input.positions.filter((p) => p.isWinner).length >= 10,
    progress: (input) => ({
      current: input.positions.filter((p) => p.isWinner).length,
      target: 10,
    }),
  },
  {
    id: "win_streak",
    label: "On Fire",
    description: "Achieved 70%+ win rate",
    icon: Trophy,
    check: (input) => input.stats.totalPredictions >= 5 && winRateOf(input) >= 70,
    progress: (input) => ({ current: winRateOf(input), target: 70 }),
  },
  {
    id: "streak_three",
    label: "Hot Streak",
    description: "Won 3 predictions in a row",
    icon: Flame,
    check: (input) => getBestWinStreak(resolvedPositions(input.positions)) >= 3,
    progress: (input) => ({
      current: getBestWinStreak(resolvedPositions(input.positions)),
      target: 3,
    }),
  },
  {
    id: "streak_five",
    label: "Unstoppable",
    description: "Won 5 predictions in a row",
    icon: Flame,
    check: (input) => getBestWinStreak(resolvedPositions(input.positions)) >= 5,
    progress: (input) => ({
      current: getBestWinStreak(resolvedPositions(input.positions)),
      target: 5,
    }),
  },
  {
    id: "high_earner",
    label: "Big Earner",
    description: "Earned over ₦100,000",
    icon: Award,
    check: ({ stats }) => stats.totalEarnings >= 100000,
    progress: ({ stats }) => ({ current: stats.totalEarnings, target: 100000 }),
  },
  {
    id: "top_rank",
    label: "Top Ranked",
    description: "Reached top 10 on the leaderboard",
    icon: Target,
    check: ({ stats }) => stats.rank > 0 && stats.rank <= 10,
  },
];

export const getEarnedAchievements = (input: AchievementInput) =>
  ACHIEVEMENTS.filter((a) => a.check(input));

export const getAchievementCounts = (input: AchievementInput) => {
  const earned = getEarnedAchievements(input);
  return { earned: earned.length, total: ACHIEVEMENTS.length, earnedList: earned };
};