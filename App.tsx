
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SignalType, 
  Outcome, 
  TradeSignal, 
  MarketData, 
  UserStats, 
  IndicatorConfig,
  Pattern
} from './types';
import { 
  NAV_ITEMS, 
  INITIAL_INDICATORS, 
  QUOTEX_PAIRS 
} from './constants';
import { marketService } from './services/marketService';
import { analyzeSignalOutcome, generateMarketInsight } from './services/geminiService';
import Dashboard from './components/Dashboard';
import SignalList from './components/SignalList';
import { Bell, ShieldCheck, Timer, Zap, Settings, X, Trophy, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [indicators, setIndicators] = useState<IndicatorConfig>(INITIAL_INDICATORS);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [stats, setStats] = useState<UserStats>({
    todayWins: 0,
    todayLosses: 0,
    totalSignals: 0,
    sevenDayAvg: 74.5
  });

  const [sessionStats, setSessionStats] = useState({
    wins: 0,
    losses: 0,
    total: 0
  });

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const lastSignalTime = useRef<number>(0);
  const activeSignalsPairs = useRef<Set<string>>(new Set());

  // Check trading session (12AM - 12PM)
  useEffect(() => {
    const checkSession = () => {
      const now = new Date();
      const hour = now.getHours();
      const active = hour >= 0 && hour < 12;
      
      setIsSessionActive(prev => {
        if (prev && !active && sessionStats.total > 0) {
          setShowSummary(true);
        }
        if (!prev && active) {
          setSessionStats({ wins: 0, losses: 0, total: 0 });
        }
        return active;
      });
    };
    checkSession();
    const timer = setInterval(checkSession, 10000);
    return () => clearInterval(timer);
  }, [sessionStats.total]);

  // Market data subscription and Signal Rule Engine
  useEffect(() => {
    const unsubscribe = marketService.subscribe((data) => {
      setMarketData(data);
      
      if (!isSessionActive) return;

      const now = Date.now();
      // Enforce global 90s gap between ANY new signal to prevent overlap
      if (now - lastSignalTime.current < 90000) return;

      data.forEach(item => {
        // Check if we are already monitoring this pair for an active signal
        if (activeSignalsPairs.current.has(item.pair)) return;

        const { technicals } = item;
        let signalTriggered = false;
        let signalType: SignalType = SignalType.UP;
        let reason = "";

        // Rule 1: EMA Fast crosses EMA Slow UP + RSI < 35 (Oversold/Momentum)
        const bullCross = technicals.prevEmaFast <= technicals.prevEmaSlow && technicals.emaFast > technicals.emaSlow;
        if (bullCross && technicals.rsi < 35) {
          signalTriggered = true;
          signalType = SignalType.UP;
          // Fix: Use 'technicals' instead of 'tech'
          reason = `EMA ${indicators.emaFast} crossed above EMA ${indicators.emaSlow} with RSI at ${technicals.rsi.toFixed(0)} (Bullish Momentum)`;
        }

        // Rule 2: EMA Fast crosses EMA Slow DOWN + RSI > 65 (Overbought/Momentum)
        const bearCross = technicals.prevEmaFast >= technicals.prevEmaSlow && technicals.emaFast < technicals.emaSlow;
        if (bearCross && technicals.rsi > 65) {
          signalTriggered = true;
          signalType = SignalType.DOWN;
          // Fix: Use 'technicals' instead of 'tech'
          reason = `EMA ${indicators.emaFast} crossed below EMA ${indicators.emaSlow} with RSI at ${technicals.rsi.toFixed(0)} (Bearish Momentum)`;
        }

        // Rule 3: Bollinger Band Rejection + RSI Extremes
        if (!signalTriggered) {
          if (item.price <= technicals.bbLower && technicals.rsi < 25) {
            signalTriggered = true;
            signalType = SignalType.UP;
            // Fix: Use 'technicals' instead of 'tech'
            reason = `Price rejected BB Lower with oversold RSI (${technicals.rsi.toFixed(0)})`;
          } else if (item.price >= technicals.bbUpper && technicals.rsi > 75) {
            signalTriggered = true;
            signalType = SignalType.DOWN;
            // Fix: Use 'technicals' instead of 'tech'
            reason = `Price rejected BB Upper with overbought RSI (${technicals.rsi.toFixed(0)})`;
          }
        }

        if (signalTriggered) {
          createSignal(item.pair, signalType, item.price, reason);
        }
      });
    });
    return unsubscribe;
  }, [isSessionActive, indicators]);

  const createSignal = (pair: string, type: SignalType, entryPrice: number, reason: string) => {
    const now = Date.now();
    lastSignalTime.current = now;
    activeSignalsPairs.current.add(pair);

    const newSignal: TradeSignal = {
      id: Math.random().toString(36).substr(2, 9),
      pair,
      type,
      entryPrice,
      timestamp: now,
      expiryTime: now + 60000,
      amount: 1.0,
      outcome: Outcome.PENDING,
      reason
    };

    setSignals(prev => [newSignal, ...prev]);
    setStats(prev => ({ ...prev, totalSignals: prev.totalSignals + 1 }));
    setSessionStats(prev => ({ ...prev, total: prev.total + 1 }));

    // Auto-resolve after 1 minute
    setTimeout(async () => {
      const closePrice = marketService.getCurrentPrice(pair);
      const isWin = type === SignalType.UP 
        ? closePrice > entryPrice 
        : closePrice < entryPrice;

      const aiReason = await analyzeSignalOutcome(pair, type, entryPrice, closePrice, reason);

      setSignals(prev => prev.map(s => s.id === newSignal.id ? {
        ...s,
        closePrice,
        outcome: isWin ? Outcome.WIN : Outcome.LOSS,
        reason: aiReason
      } : s));

      setStats(prev => ({
        ...prev,
        todayWins: isWin ? prev.todayWins + 1 : prev.todayWins,
        todayLosses: isWin ? prev.todayLosses : prev.todayLosses + 1
      }));

      setSessionStats(prev => ({
        ...prev,
        wins: isWin ? prev.wins + 1 : prev.wins,
        losses: isWin ? prev.losses : prev.losses + 1
      }));

      // Cleanup pair from active set so it can receive signals again
      activeSignalsPairs.current.delete(pair);
    }, 60000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={stats} />;
      case 'signals':
        return <SignalList signals={signals.filter(s => s.outcome === Outcome.PENDING)} />;
      case 'history':
        return <SignalList signals={signals.filter(s => s.outcome !== Outcome.PENDING)} />;
      case 'patterns':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Custom Patterns</h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Add New Pattern
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
                <img src="https://picsum.photos/400/200?random=1" className="rounded-lg object-cover w-full h-32" alt="Pattern" />
                <h4 className="font-bold">Bullish Rejection</h4>
                <p className="text-zinc-400 text-sm">Wait for strong wick rejection at Support level with EMA support.</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
                <img src="https://picsum.photos/400/200?random=2" className="rounded-lg object-cover w-full h-32" alt="Pattern" />
                <h4 className="font-bold">3 Green Soldiers</h4>
                <p className="text-zinc-400 text-sm">Momentum play after a consolidation breakout.</p>
              </div>
            </div>
          </div>
        );
      case 'indicators':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Indicator Configuration</h2>
            <div className="grid gap-6">
              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <h3 className="text-blue-400 font-semibold mb-4">Moving Averages (EMA)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">Fast Period</label>
                    <input 
                      type="number" 
                      value={indicators.emaFast}
                      onChange={(e) => setIndicators({...indicators, emaFast: parseInt(e.target.value)})}
                      className="w-full bg-zinc-800 border-none rounded-lg p-2 mt-1 focus:ring-1 ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">Slow Period</label>
                    <input 
                      type="number"
                      value={indicators.emaSlow}
                      onChange={(e) => setIndicators({...indicators, emaSlow: parseInt(e.target.value)})}
                      className="w-full bg-zinc-800 border-none rounded-lg p-2 mt-1 focus:ring-1 ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <h3 className="text-purple-400 font-semibold mb-4">RSI Settings</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase">Period</label>
                    <input 
                      type="number"
                      value={indicators.rsiPeriod}
                      onChange={(e) => setIndicators({...indicators, rsiPeriod: parseInt(e.target.value)})}
                      className="w-full bg-zinc-800 border-none rounded-lg p-2 mt-1 focus:ring-1 ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">App Settings</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-medium">Demo Mode</p>
                  <p className="text-xs text-zinc-500">Virtual balance only, no real trades.</p>
                </div>
                <div className="w-10 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="font-medium">Signal Notifications</p>
                  <p className="text-xs text-zinc-500">Get alerted for high-probability setups.</p>
                </div>
                <div className="w-10 h-6 bg-zinc-700 rounded-full flex items-center justify-start px-1">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard stats={stats} />;
    }
  };

  const sessionWinRate = sessionStats.total > 0 
    ? ((sessionStats.wins / sessionStats.total) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64">
      {/* Session Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="text-white" size={28} />
                <h2 className="text-xl font-bold text-white">Session Summary</h2>
              </div>
              <button 
                onClick={() => setShowSummary(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <p className="text-zinc-500 text-sm uppercase tracking-widest font-semibold mb-2">Final Win Rate</p>
                <h3 className={`text-6xl font-black ${Number(sessionWinRate) >= 70 ? 'text-green-500' : 'text-blue-500'}`}>
                  {sessionWinRate}%
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-zinc-800/50 p-4 rounded-xl text-center">
                  <span className="block text-zinc-500 text-[10px] uppercase font-bold mb-1">Total</span>
                  <span className="text-xl font-bold">{sessionStats.total}</span>
                </div>
                <div className="bg-green-500/10 p-4 rounded-xl text-center">
                  <span className="block text-green-500/80 text-[10px] uppercase font-bold mb-1">Wins</span>
                  <span className="text-xl font-bold text-green-500">{sessionStats.wins}</span>
                </div>
                <div className="bg-red-500/10 p-4 rounded-xl text-center">
                  <span className="block text-red-500/80 text-[10px] uppercase font-bold mb-1">Losses</span>
                  <span className="text-xl font-bold text-red-400">{sessionStats.losses}</span>
                </div>
              </div>

              <div className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-xl mb-8 flex items-start gap-3">
                <AlertCircle className="text-zinc-400 shrink-0" size={18} />
                <p className="text-sm text-zinc-400">
                  Great work today! These results are stored in your 7-day performance history.
                </p>
              </div>

              <button 
                onClick={() => setShowSummary(false)}
                className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-4 rounded-xl transition-all active:scale-95"
              >
                Dismiss Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 flex-col p-6 z-50">
        <div className="flex items-center gap-2 mb-10">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">TradeMaster</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-500 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-zinc-950 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2 mb-1 text-sm text-zinc-400">
            <ShieldCheck size={16} className="text-green-500" />
            <span>Secure Connection</span>
          </div>
          <p className="text-[10px] text-zinc-600 uppercase">Quotex API Linked</p>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Zap className="text-blue-500" size={24} />
          <span className="font-bold text-lg text-white">TradeMaster Pro</span>
        </div>
        <Bell className="text-zinc-500" size={20} />
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 lg:p-8">
        {/* Session Banner */}
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-lg transition-colors ${
          isSessionActive ? 'bg-green-600/10 border border-green-500/20' : 'bg-zinc-800/50 border border-zinc-700'
        }`}>
          <div className="flex items-center gap-3">
            <Timer className={isSessionActive ? 'text-green-500 animate-pulse' : 'text-zinc-500'} />
            <div>
              <p className="font-bold text-sm text-white">
                {isSessionActive ? 'Active Trading Session' : 'Trading Session Closed'}
              </p>
              <p className="text-xs text-zinc-400">Next Session: 12:00 AM - 12:00 PM</p>
            </div>
          </div>
          {isSessionActive && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Session Win Rate</p>
                <p className="text-sm font-bold text-green-500">{sessionWinRate}%</p>
              </div>
              <span className="bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                Live
              </span>
            </div>
          )}
        </div>

        {renderContent()}
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 px-2 py-3 z-50">
        <div className="flex justify-around items-center">
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-blue-500' : 'text-zinc-500'
              }`}
            >
              <div className={`${activeTab === item.id ? 'bg-blue-500/10 p-2 rounded-xl' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <div className={`${activeTab === 'settings' ? 'bg-blue-500/10 p-2 rounded-xl' : ''}`}>
              <Settings size={20} />
            </div>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
