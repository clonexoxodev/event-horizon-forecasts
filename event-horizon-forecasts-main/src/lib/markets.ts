import apiService, { type ApiMarket } from "./api";
import { getCategoryLabel, normalizeCategory } from "./categories";
import { calculateMarketPrices } from "./market-pricing";

export type Market = ApiMarket;

export const calculatePrices = (yesPool: number, noPool: number) => {
  return calculateMarketPrices(yesPool, noPool);
};

/**
 * Local price projection helper for read-only previews. Authoritative market
 * pool updates happen on the backend through placePrediction.
 */
export const updateMarketPricing = (
  market: Market,
  side: "YES" | "NO",
  amount: number,
  isNewParticipant: boolean = false
): Market => {
  const newParticipants = isNewParticipant ? market.participants + 1 : market.participants;
  const nextYesVolume = Number(market.yesVolume ?? market.yesPool ?? 0) + (side === "YES" ? amount : 0);
  const nextNoVolume = Number(market.noVolume ?? market.noPool ?? 0) + (side === "NO" ? amount : 0);
  const nextTotalVolume = nextYesVolume + nextNoVolume;
  const startingYes = Number(market.startingYesPrice ?? market.yesPrice ?? 50);
  const activityWeight = nextTotalVolume > 0 ? Math.min(0.95, nextTotalVolume / (nextTotalVolume + 5000)) : 0;
  const activityYes = nextTotalVolume > 0 ? (nextYesVolume / nextTotalVolume) * 100 : startingYes;
  const yesPrice = Math.max(1, Math.min(99, Math.round((startingYes * (1 - activityWeight) + activityYes * activityWeight) * 10) / 10));
  const noPrice = Math.round((100 - yesPrice) * 10) / 10;
  const sidePrice = side === "YES" ? market.yesPrice : market.noPrice;
  const sharesReceived = sidePrice > 0 ? amount / sidePrice : 0;

  return {
    ...market,
    yesPool: nextYesVolume,
    noPool: nextNoVolume,
    yesVolume: nextYesVolume,
    noVolume: nextNoVolume,
    totalPool: nextTotalVolume,
    totalVolume: Number(market.totalVolume || 0) + amount,
    totalYesShares: Number(market.totalYesShares || 0) + (side === "YES" ? sharesReceived : 0),
    totalNoShares: Number(market.totalNoShares || 0) + (side === "NO" ? sharesReceived : 0),
    participants: newParticipants,
    yesPrice,
    noPrice,
    yesPercent: yesPrice,
    pool: nextTotalVolume,
  };
};

export const markets: Market[] = [];

export const fetchMarkets = async (): Promise<Market[]> => {
  const response = await apiService.getMarkets();
  return response.markets;
};

export const placePosition = async (
  _userId: string,
  marketId: string,
  side: "YES" | "NO",
  stake: number
): Promise<{ error: string | null }> => {
  try {
    await apiService.placePrediction(marketId, { side, amount: stake, currency: "NGN" });
    return { error: null };
  } catch (error: any) {
    return { error: error.message || "Failed to place prediction" };
  }
};

export const fetchPositions = async (_userId: string) => {
  const response = await apiService.getPositions();
  return response.positions;
};

const categoryImages: Record<string, string> = {
  Sports: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=1300&q=80",
  Music: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1300&q=80",
  Entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1300&q=80",
  Crypto: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?auto=format&fit=crop&w=1300&q=80",
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1300&q=80",
  Economy: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1300&q=80",
  Business: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1300&q=80",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1300&q=80",
  Global: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1300&q=80",
  Other: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1300&q=80",
};

export const getMarketCommentCount = (market: Market) =>
  Number((market as any).commentCount ?? (market as any).comment_count ?? 0);

export const getMarketActivityCount = (market: Market) =>
  Number((market as any).activityCount ?? (market as any).activity_count ?? market.priceHistory?.length ?? 0);

export const getTrendingScore = (market: Market) => {
  const volume = Number(market.totalPool || market.pool || 0);
  const participants = Number(market.participants || 0);
  const comments = getMarketCommentCount(market);
  const activity = getMarketActivityCount(market);
  const manualBoost = market.isTrending || market.is_trending ? 2500 : 0;

  return volume + participants * 1000 + comments * 1500 + activity * 500 + manualBoost;
};

export const getMarketMedia = (market: Market) => {
  const videoUrl = market.videoUrl || market.video_url || "";
  const uploadedImage = market.imageUrl || market.image_url || "";
  const aiImage = (market as any).aiImageUrl || (market as any).ai_image_url || "";
  const fallback =
    categoryImages[normalizeCategory(market.category)] ||
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1300&q=80";
  const imageUrl = uploadedImage || aiImage || fallback;

  return videoUrl
    ? { type: "video" as const, src: videoUrl, poster: imageUrl, imageUrl }
    : { type: "image" as const, src: imageUrl, poster: imageUrl, imageUrl };
};

export const getMarketCategoryLabel = (market: Pick<Market, "category">) => getCategoryLabel(market.category);

const parseMarketTime = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const isMarketPredictable = (
  market: Pick<Market, "status" | "closeTime" | "tradingCloseTime"> & {
    close_date?: string | null;
    trading_close_at?: string | null;
    closes_at?: string | null;
  },
  now = Date.now()
) => {
  const status = String(market.status || "").toLowerCase();
  if (!["active", "live", "open"].includes(status)) return false;

  const tradingCloseTime = parseMarketTime(market.tradingCloseTime || market.trading_close_at);
  if (tradingCloseTime !== null && tradingCloseTime <= now) return false;

  const closeTime = parseMarketTime(market.closeTime || market.close_date || market.closes_at);
  if (closeTime !== null && closeTime <= now) return false;

  return true;
};

export const formatCountdown = (closeTime?: string, closesIn?: string) => {
  if (closeTime) {
    const closeDate = new Date(closeTime);
    const diff = closeDate.getTime() - Date.now();

    if (!Number.isNaN(closeDate.getTime())) {
      if (diff <= 0) return "Ended";

      const totalSeconds = Math.ceil(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, "0")}s left`;

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (hours < 24) return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s left`;

      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h left`;
    }
  }

  if (closesIn && closesIn.toLowerCase() !== "soon") return closesIn;
  return "No deadline";
};

export const formatNairaPrice = (n: number) => `₦${Math.round(Number(n) || 0)}`;

export const formatNaira = (n: number) =>
  "₦" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : Math.round(n).toString());
