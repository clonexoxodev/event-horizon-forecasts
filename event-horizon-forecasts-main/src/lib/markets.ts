export type Market = {
  id: string;
  question: string;
  category: string;
  yesPercent: number;
  pool: number;
  closesIn: string;
  description: string;
  source: string;
  icon: string;
};

export const markets: Market[] = [
  {
    id: "btc-100k",
    question: "Will Bitcoin close above $100,000 by end of May 2026?",
    category: "Finance",
    yesPercent: 64,
    pool: 1240000,
    closesIn: "5h 20m",
    description: "This market resolves YES if the BTC/USD price on Coinbase closes above $100,000 on May 31, 2026 (UTC).",
    source: "Coinbase BTC/USD daily close",
    icon: "₿",
  },
  {
    id: "election-adc",
    question: "Will ADC win the 2027 Presidential Election?",
    category: "Politics",
    yesPercent: 38,
    pool: 845000,
    closesIn: "2d 11h",
    description: "Resolves YES if the ADC candidate is officially declared winner by INEC.",
    source: "INEC official announcement",
    icon: "🏛",
  },
  {
    id: "arsenal-trophy",
    question: "Will Arsenal finish the season trophyless?",
    category: "Trending",
    yesPercent: 54,
    pool: 412000,
    closesIn: "12d 4h",
    description: "Resolves YES if Arsenal does not win Premier League, FA Cup, EFL Cup, or UCL.",
    source: "Official league/cup results",
    icon: "⚽",
  },
  {
    id: "asake-streams",
    question: "Will Asake's new album hit 7M+ second-day streams?",
    category: "Entertainment",
    yesPercent: 36,
    pool: 137000,
    closesIn: "1d 6h",
    description: "Resolves YES if reported global second-day streams exceed 7,000,000.",
    source: "Spotify + Apple Music public data",
    icon: "🎵",
  },
  {
    id: "cbn-rates",
    question: "Will CBN maintain interest rates this MPC?",
    category: "Economy",
    yesPercent: 51,
    pool: 522000,
    closesIn: "3d 22h",
    description: "Resolves YES if the Monetary Policy Rate is unchanged after the next MPC meeting.",
    source: "CBN official communiqué",
    icon: "🏦",
  },
  {
    id: "ai-launch",
    question: "Will OpenAI release GPT-6 before August 2026?",
    category: "Technology",
    yesPercent: 22,
    pool: 298000,
    closesIn: "30d+",
    description: "Resolves YES upon official public release of a model branded GPT-6.",
    source: "OpenAI official announcement",
    icon: "🤖",
  },
];

export const formatNaira = (n: number) =>
  "₦" + (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : n.toString());
