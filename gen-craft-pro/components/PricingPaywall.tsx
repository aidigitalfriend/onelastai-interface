/**
 * GenCraft Pro - Credit Purchase Paywall
 * Uses the shared /api/billing/* credit system
 */

import React, { useState, useEffect } from 'react';
import { Zap, Crown, Sparkles, Check, Loader2, ArrowRight, X, Shield, CreditCard, Coins } from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceDisplay: string;
  description: string;
  savings?: string;
  popular?: boolean;
}

interface PricingPaywallProps {
  userId: string | null;
  userEmail: string | null;
  onClose?: () => void;
  isOverlay?: boolean;
}

const PricingPaywall: React.FC<PricingPaywallProps> = ({ userId, userEmail, onClose, isOverlay = true }) => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/billing/packages/gen-craft-pro', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.packages) {
          setPackages(data.packages);
          const pop = data.packages.find((p: CreditPackage) => p.popular);
          setSelectedPkg(pop?.id || data.packages[0]?.id || '');
        }
      } catch {
        setPackages([
          { id: 'gp-50', name: '50 Credits', credits: 50, price: 500, priceDisplay: '$5.00', description: 'Starter pack' },
          { id: 'gp-100', name: '100 Credits', credits: 100, price: 999, priceDisplay: '$9.99', description: 'Regular usage', savings: '5% off' },
          { id: 'gp-350', name: '350 Credits', credits: 350, price: 2999, priceDisplay: '$29.99', description: 'Best value', savings: '15% off', popular: true },
        ]);
        setSelectedPkg('gp-350');
      } finally {
        setIsFetching(false);
      }
    })();
  }, []);

  const handlePurchase = async (pkgId: string) => {
    if (!userId || !userEmail) {
      window.location.href = '/';
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/billing/checkout/gen-craft-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId: pkgId }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to create checkout session');
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="relative w-full max-w-3xl mx-auto px-4 py-8">
      {isOverlay && onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all z-10">
          <X className="w-5 h-5" />
        </button>
      )}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/20 text-violet-300 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          GenCraft Pro
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Purchase AI Credits</h2>
        <p className="text-white/60 text-lg max-w-xl mx-auto">
          Credits are used for AI code generation, chat, and deployments. Buy once, use anytime.
        </p>
      </div>
      <div className="flex items-center justify-center gap-6 mb-8">
        <div className="flex items-center gap-1.5 text-white/40 text-xs"><Shield className="w-3.5 h-3.5" /><span>Secure Payment</span></div>
        <div className="flex items-center gap-1.5 text-white/40 text-xs"><CreditCard className="w-3.5 h-3.5" /><span>Powered by Stripe</span></div>
        <div className="flex items-center gap-1.5 text-white/40 text-xs"><Coins className="w-3.5 h-3.5" /><span>No Expiry</span></div>
      </div>
      {isFetching ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {packages.map((pkg) => (
            <div key={pkg.id}
              className={`relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${selectedPkg === pkg.id ? 'border-violet-500 ring-2 ring-violet-500/30 scale-[1.02]' : 'border-white/10 hover:border-white/20'} ${pkg.popular ? 'md:-translate-y-1' : ''}`}
              onClick={() => setSelectedPkg(pkg.id)}>
              {pkg.popular && (<div className="absolute top-0 left-0 right-0 py-1 text-center text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-blue-500">Most Popular</div>)}
              {pkg.savings && !pkg.popular && (<div className="absolute top-0 left-0 right-0 py-1 text-center text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500">Save {pkg.savings}</div>)}
              <div className={`p-5 ${(pkg.popular || pkg.savings) ? 'pt-9' : ''}`} style={{ background: 'rgba(15, 15, 25, 0.8)' }}>
                <div className="flex items-center gap-2 mb-3">
                  {pkg.popular ? <Crown className="w-5 h-5 text-violet-400" /> : <Zap className="w-5 h-5 text-blue-400" />}
                  <h3 className="text-white font-semibold">{pkg.name}</h3>
                </div>
                <div className="mb-3"><span className="text-3xl font-bold text-white">{pkg.priceDisplay}</span></div>
                <p className="text-white/40 text-xs mb-4">{pkg.description}</p>
                <button onClick={(e) => { e.stopPropagation(); handlePurchase(pkg.id); }} disabled={isLoading}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${selectedPkg === pkg.id ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<>{!userId ? 'Sign in to Purchase' : 'Buy Credits'}<ArrowRight className="w-4 h-4" /></>)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && (<div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>)}
      <div className="text-center"><p className="text-white/30 text-xs">Powered by Stripe • SSL encrypted • Credits never expire • GenCraft Pro by One Last AI</p></div>
    </div>
  );

  if (!isOverlay) return content;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-4">
      {content}
    </div>
  );
};

export default PricingPaywall;
