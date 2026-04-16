export interface Stock {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  turnover: number;
  sector?: string;
  dividendHistory?: {
    year: string;
    bonus: number;
    cash: number;
  }[];
  brokerData?: {
    topBuyers: { broker: string; quantity: number }[];
    topSellers: { broker: string; quantity: number }[];
  };
}

export interface MarketSummary {
  index: string;
  change: string;
  percentChange: string;
  turnover: string;
  volume: string;
  advancers: number;
  decliners: number;
  unchanged: number;
  status?: string;
}

export interface AnalysisResult {
  signal: "strongBuy" | "buy" | "hold" | "sell" | "strongSell";
  targetPrice: number;
  stopLoss: number;
  confidenceScore: number;
  reasoning: string;
  catalysts: string[];
  risks: string[];
  timeHorizon: "shortTerm" | "mediumTerm" | "longTerm";
  nepaleseContext: string;
  provider?: string;
}

export interface MarketSentiment {
  sentiment: "Bullish" | "Bearish" | "Neutral";
  phase: "Accumulation" | "Markup" | "Distribution" | "Decline";
  topSectorsToBuy: string[];
  topSectorsToAvoid: string[];
  keyRisks: string[];
  summary: string;
}

export interface NewsItem {
  title: string;
  link: string;
  date: string;
  source: string;
  sentiment?: "positive" | "negative" | "neutral";
  summary?: string;
}

export interface CorporateAction {
  symbol: string;
  type: "IPO" | "FPO" | "Right" | "Dividend" | "Bonus" | "AGM" | "BookClosure";
  description: string;
  date: string;
  status: "Upcoming" | "Open" | "Closed";
}

export interface HistoricalData {
  date: string;
  price: number;
  volume: number;
  rsi?: number;
  bb?: {
    upper: number;
    lower: number;
    sma: number;
  };
  ema?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
}

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: string;
  isThinking?: boolean;
}
