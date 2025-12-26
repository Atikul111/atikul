
import React from 'react';
import { UserStats } from '../types';
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';

interface Props {
  stats: UserStats;
}

const Dashboard: React.FC<Props> = ({ stats }) => {
  const winRate = stats.totalSignals > 0 
    ? ((stats.todayWins / stats.totalSignals) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Today's Win Rate" 
          value={`${winRate}%`} 
          subValue={`(${stats.todayWins}/${stats.totalSignals})`}
          icon={<Target className="text-blue-500" />}
        />
        <StatCard 
          label="7-Day Avg" 
          value={`${stats.sevenDayAvg}%`} 
          icon={<BarChart3 className="text-purple-500" />}
        />
        <StatCard 
          label="Total Wins" 
          value={stats.todayWins.toString()} 
          icon={<TrendingUp className="text-green-500" />}
        />
        <StatCard 
          label="Total Losses" 
          value={stats.todayLosses.toString()} 
          icon={<TrendingDown className="text-red-500" />}
        />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Market Overview</h3>
        <div className="h-64 flex items-center justify-center text-zinc-500 italic">
          Market analysis visualization placeholder...
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subValue, icon }: { label: string, value: string, subValue?: string, icon: React.ReactNode }) => (
  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-zinc-400 text-sm font-medium">{label}</span>
      <div className="bg-zinc-800 p-2 rounded-lg">{icon}</div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold">{value}</span>
      {subValue && <span className="text-zinc-500 text-sm">{subValue}</span>}
    </div>
  </div>
);

export default Dashboard;
