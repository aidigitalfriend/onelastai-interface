import React, { useState, useEffect } from 'react';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  priceDisplay: string;
  savings?: string;
  popular?: boolean;
}

interface BillingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const API_BASE = 'https://maula.onelastai.co/api';
const APP_ID = 'neural-chat';

export const BillingPanel: React.FC<BillingPanelProps> = ({ isOpen, onClose, userId }) => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      fetchCredits();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/packages/${APP_ID}`);
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/billing/credits?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  };

  const handlePurchase = async (packageId: string) => {
    if (!userId) {
      alert('Please sign in to purchase credits');
      return;
    }

    setProcessing(packageId);
    try {
      const res = await fetch(`${API_BASE}/billing/checkout/${APP_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          packageId,
          email: localStorage.getItem('userEmail') || undefined
        })
      });
      
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to process checkout');
    } finally {
      setProcessing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Add Credits</h2>
            <p className="text-gray-400 text-sm mt-1">Power your Neural Chat conversations</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Balance */}
        {userId && (
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-4 mb-6 border border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Current Balance</p>
                <p className="text-2xl font-bold text-white">{credits.toLocaleString()} <span className="text-cyan-400 text-lg">credits</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Packages Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-xl p-4 border transition-all duration-300 hover:scale-105 cursor-pointer ${
                  pkg.popular
                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'bg-gray-800/50 border-gray-700 hover:border-cyan-500/50'
                }`}
                onClick={() => handlePurchase(pkg.id)}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ⭐ BEST VALUE
                  </div>
                )}
                
                <div className="text-center pt-2">
                  <p className="text-3xl font-bold text-white">{pkg.credits}</p>
                  <p className="text-cyan-400 text-sm mb-3">credits</p>
                  
                  <p className="text-2xl font-bold text-white mb-1">{pkg.priceDisplay}</p>
                  {pkg.savings && (
                    <p className="text-green-400 text-sm font-medium">{pkg.savings}</p>
                  )}
                  
                  <button
                    disabled={processing === pkg.id}
                    className={`mt-4 w-full py-2 px-4 rounded-lg font-medium transition-all ${
                      processing === pkg.id
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : pkg.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {processing === pkg.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      'Purchase'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
          <p className="text-center text-gray-600 text-xs mt-2">
            Test mode - Use card 4242 4242 4242 4242
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillingPanel;
