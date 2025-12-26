
import React from 'react';
import { 
  TrendingUp, 
  History, 
  Settings, 
  LayoutDashboard, 
  BookOpen, 
  Activity 
} from 'lucide-react';

export const QUOTEX_PAIRS = [
  "Volatility 75 Index (OTC)",
  "Volatility 100 Index (OTC)",
  "Volatility 10 Index (OTC)",
  "Boom 1000 Index",
  "Crash 1000 Index",
  "EUR/USD (OTC)",
  "GBP/JPY (OTC)",
  "USD/INR (OTC)",
  "AUD/CAD (OTC)",
  "Crypto IDX"
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'signals', label: 'Signals', icon: <Activity size={20} /> },
  { id: 'history', label: 'History', icon: <History size={20} /> },
  { id: 'patterns', label: 'Patterns', icon: <BookOpen size={20} /> },
  { id: 'indicators', label: 'Indicators', icon: <TrendingUp size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export const INITIAL_INDICATORS = {
  emaFast: 9,
  emaSlow: 21,
  rsiPeriod: 14,
  bbPeriod: 20,
  bbStdDev: 2
};
