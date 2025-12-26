
export enum SignalType {
  UP = 'UP',
  DOWN = 'DOWN'
}

export enum Outcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  PENDING = 'PENDING'
}

export interface TradeSignal {
  id: string;
  pair: string;
  type: SignalType;
  entryPrice: number;
  closePrice?: number;
  timestamp: number;
  expiryTime: number;
  amount: number;
  outcome: Outcome;
  reason: string;
}

export interface TechnicalIndicators {
  emaFast: number;
  emaSlow: number;
  rsi: number;
  bbUpper: number;
  bbLower: number;
  prevEmaFast: number;
  prevEmaSlow: number;
}

export interface MarketData {
  pair: string;
  price: number;
  change: number;
  timestamp: number;
  technicals: TechnicalIndicators;
}

export interface IndicatorConfig {
  emaFast: number;
  emaSlow: number;
  rsiPeriod: number;
  bbPeriod: number;
  bbStdDev: number;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface UserStats {
  todayWins: number;
  todayLosses: number;
  totalSignals: number;
  sevenDayAvg: number;
}
