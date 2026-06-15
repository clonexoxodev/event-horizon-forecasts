export type MarketCategoryValue =
  | "Sports"
  | "Crypto"
  | "Politics"
  | "Economy"
  | "Entertainment"
  | "Music"
  | "Technology"
  | "Business"
  | "Global"
  | "Other";

export type HomeMarketFilter = "Trending" | MarketCategoryValue;

export type MarketCategoryConfig = {
  label: MarketCategoryValue;
  value: MarketCategoryValue;
  description: string;
  home: boolean;
  admin: boolean;
};

export const MARKET_CATEGORIES: MarketCategoryConfig[] = [
  { label: "Sports", value: "Sports", description: "Football, boxing, tournaments, athlete and team outcomes.", home: true, admin: true },
  { label: "Crypto", value: "Crypto", description: "BTC, ETH, tokens, blockchain market events, and crypto milestones.", home: true, admin: true },
  { label: "Politics", value: "Politics", description: "Elections, policy decisions, public office, and political outcomes.", home: true, admin: true },
  { label: "Economy", value: "Economy", description: "FX, inflation, fuel prices, interest rates, and macroeconomic events.", home: true, admin: true },
  { label: "Entertainment", value: "Entertainment", description: "Movies, awards, celebrities, TV, culture, and creator events.", home: true, admin: true },
  { label: "Music", value: "Music", description: "Artists, albums, charts, concerts, awards, and music culture.", home: true, admin: true },
  { label: "Technology", value: "Technology", description: "Apps, AI, gadgets, software, platform changes, and product updates.", home: true, admin: true },
  { label: "Business", value: "Business", description: "Companies, startups, product launches, deals, and corporate events.", home: true, admin: true },
  { label: "Global", value: "Global", description: "International events, world affairs, and cross-country outcomes.", home: true, admin: true },
  { label: "Other", value: "Other", description: "Markets that do not fit an existing category.", home: true, admin: true },
];

export const HOME_MARKET_FILTERS: HomeMarketFilter[] = [
  "Trending",
  ...MARKET_CATEGORIES.filter((category) => category.home).map((category) => category.value),
];

export const ADMIN_MARKET_CATEGORIES = MARKET_CATEGORIES.filter((category) => category.admin);

const categoryAliases: Record<string, MarketCategoryValue> = {
  finance: "Economy",
  financial: "Economy",
  economics: "Economy",
  economy: "Economy",
  cryptocurrency: "Crypto",
  crypto: "Crypto",
  tech: "Technology",
  technology: "Technology",
  business: "Business",
  companies: "Business",
  company: "Business",
  global_events: "Global",
  world: "Global",
  international: "Global",
  general: "Other",
  others: "Other",
  other: "Other",
};

export const normalizeCategory = (category?: string | null): MarketCategoryValue => {
  const raw = String(category || "").trim();
  if (!raw) return "Other";

  const direct = MARKET_CATEGORIES.find((item) => item.value.toLowerCase() === raw.toLowerCase());
  if (direct) return direct.value;

  return categoryAliases[raw.toLowerCase()] || "Other";
};

export const getCategoryLabel = (category?: string | null) => normalizeCategory(category);

export const getCategoryDescription = (category?: string | null) =>
  MARKET_CATEGORIES.find((item) => item.value === normalizeCategory(category))?.description || MARKET_CATEGORIES[MARKET_CATEGORIES.length - 1].description;

export const categoryMatches = (marketCategory: string | undefined | null, selected: HomeMarketFilter) =>
  selected === "Trending" || normalizeCategory(marketCategory) === selected;
