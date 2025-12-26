
import { MarketData, TechnicalIndicators } from '../types';
import { QUOTEX_PAIRS } from '../constants';

class MarketService {
  private subscribers: ((data: MarketData[]) => void)[] = [];
  private prices: Record<string, number> = {};
  private technicals: Record<string, TechnicalIndicators> = {};

  constructor() {
    QUOTEX_PAIRS.forEach(pair => {
      const startPrice = 100 + Math.random() * 1000;
      this.prices[pair] = startPrice;
      this.technicals[pair] = {
        emaFast: startPrice,
        emaSlow: startPrice,
        prevEmaFast: startPrice,
        prevEmaSlow: startPrice,
        rsi: 50,
        bbUpper: startPrice + 5,
        bbLower: startPrice - 5
      };
    });

    setInterval(() => {
      this.updatePrices();
    }, 1000);
  }

  private updatePrices() {
    const data: MarketData[] = QUOTEX_PAIRS.map(pair => {
      const volatility = 0.0008;
      const change = (Math.random() - 0.5) * 2 * volatility;
      const oldPrice = this.prices[pair];
      this.prices[pair] *= (1 + change);
      const currentPrice = this.prices[pair];
      
      // Update Technicals (Simulated)
      const tech = this.technicals[pair];
      tech.prevEmaFast = tech.emaFast;
      tech.prevEmaSlow = tech.emaSlow;
      
      // Simple smoothing for EMA simulation
      tech.emaFast = tech.emaFast * 0.9 + currentPrice * 0.1;
      tech.emaSlow = tech.emaSlow * 0.95 + currentPrice * 0.05;
      
      // RSI simulation based on price movement
      const rsiChange = (currentPrice > oldPrice ? 2 : -2) + (Math.random() - 0.5) * 4;
      tech.rsi = Math.max(10, Math.min(90, tech.rsi + rsiChange));
      
      // BB simulation
      const spread = currentPrice * 0.01;
      tech.bbUpper = tech.emaSlow + spread;
      tech.bbLower = tech.emaSlow - spread;

      return {
        pair,
        price: parseFloat(currentPrice.toFixed(4)),
        change: change * 100,
        timestamp: Date.now(),
        technicals: { ...tech }
      };
    });

    this.subscribers.forEach(cb => cb(data));
  }

  subscribe(callback: (data: MarketData[]) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  getCurrentPrice(pair: string): number {
    return this.prices[pair] || 0;
  }
}

export const marketService = new MarketService();
