
import React from 'react';
import { TradeSignal, SignalType, Outcome } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Clock, DollarSign, Loader2 } from 'lucide-react';

interface Props {
  signals: TradeSignal[];
}

const SignalList: React.FC<Props> = ({ signals }) => {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Scanning markets for high-probability signals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signals.map((signal) => (
        <div 
          key={signal.id} 
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all shadow-lg"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {signal.type === SignalType.UP ? (
                <div className="bg-green-500/10 p-2 rounded-full">
                  <ArrowUpCircle className="text-green-500" size={24} />
                </div>
              ) : (
                <div className="bg-red-500/10 p-2 rounded-full">
                  <ArrowDownCircle className="text-red-500" size={24} />
                </div>
              )}
              <div>
                <h4 className="font-bold text-lg">{signal.pair}</h4>
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  <Clock size={12} />
                  <span>{new Date(signal.timestamp).toLocaleTimeString()}</span>
                  <span className="mx-1">•</span>
                  <span>1 Min Expiry</span>
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              signal.outcome === Outcome.WIN ? 'bg-green-500/20 text-green-500' :
              signal.outcome === Outcome.LOSS ? 'bg-red-500/20 text-red-500' :
              'bg-blue-500/20 text-blue-500'
            }`}>
              {signal.outcome}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="bg-zinc-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Entry</span>
              <span className="font-mono font-bold">{signal.entryPrice}</span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Type</span>
              <span className={`font-bold ${signal.type === SignalType.UP ? 'text-green-400' : 'text-red-400'}`}>
                {signal.type}
              </span>
            </div>
            <div className="bg-zinc-800/50 p-2 rounded-lg text-center">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Amount</span>
              <span className="font-bold text-yellow-500">${signal.amount}</span>
            </div>
          </div>

          <div className="text-xs text-zinc-400 italic">
            <strong>Reason:</strong> {signal.reason}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SignalList;
