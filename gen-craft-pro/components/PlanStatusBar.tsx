/**
 * GenCraft Pro Credit Status Bar
 * Shows current credit balance
 */

import React from 'react';
import { Coins, Zap, AlertTriangle } from 'lucide-react';

export interface CreditInfo {
  balance: number;
  lifetimeSpent: number;
}

interface CreditStatusBarProps {
  credits: CreditInfo | null;
  onBuyCredits?: () => void;
}

const CreditStatusBar: React.FC<CreditStatusBarProps> = ({ credits, onBuyCredits }) => {
  if (!credits || credits.balance <= 0) {
    return (
      <button onClick={onBuyCredits}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors cursor-pointer">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        <span className="text-red-300 text-xs font-medium">No Credits</span>
        <span className="text-white/30 text-xs">•</span>
        <span className="text-red-400 text-xs font-medium">Buy Now</span>
      </button>
    );
  }

  const isLow = credits.balance < 10;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLow ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-violet-500/10 border border-violet-500/20'}`}>
      {isLow ? <Zap className="w-3.5 h-3.5 text-amber-400" /> : <Coins className="w-3.5 h-3.5 text-violet-400" />}
      <span className={`text-xs font-semibold ${isLow ? 'text-amber-300' : 'text-violet-300'}`}>{credits.balance} Credits</span>
      {isLow && onBuyCredits && (
        <>
          <span className="text-white/30 text-xs">•</span>
          <button onClick={onBuyCredits} className="text-amber-400 text-xs font-medium hover:text-amber-300 transition-colors">Top Up</button>
        </>
      )}
    </div>
  );
};

export default CreditStatusBar;
