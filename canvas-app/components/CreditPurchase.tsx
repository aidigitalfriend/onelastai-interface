/**
 * CREDIT PURCHASE MODAL
 * Displays credit packages and handles Stripe checkout
 */

import React, { useState, useEffect } from 'react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceDisplay: string;
  popular?: boolean;
  savings?: string;
  description: string;
}

interface CreditPurchaseProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  onCreditsPurchased?: (newBalance: number) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://maula.onelastai.co/api';

export default function CreditPurchase({ isOpen, onClose, currentCredits, onCreditsPurchased }: CreditPurchaseProps) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Fetch packages on mount
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/packages`);
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setLoading(true);
    setError(null);
    setSelectedPackage(packageId);

    try {
      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPackage(null);
    }
  };

  const handleAddFreeCredits = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/billing/add-free-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: 10 }),
      });

      const data = await res.json();

      if (data.success) {
        onCreditsPurchased?.(data.credits);
        onClose();
      } else {
        setError(data.error || 'Failed to add credits');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1a2e] rounded-xl border border-[#374151] p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Purchase Credits</h2>
            <p className="text-gray-400 mt-1">
              Current balance: <span className="text-cyan-400 font-semibold">{currentCredits} credits</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Package grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer ${
                pkg.popular 
                  ? 'border-cyan-500 bg-cyan-500/10' 
                  : 'border-[#374151] hover:border-[#4b5563] bg-[#0f0f1a]'
              }`}
              onClick={() => !loading && handlePurchase(pkg.id)}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              {/* Package content */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="text-4xl font-bold text-white mb-1">
                  {pkg.priceDisplay}
                </div>
                <div className="text-cyan-400 font-medium mb-2">
                  {pkg.credits} Credits
                </div>
                {pkg.savings && (
                  <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full mb-2">
                    {pkg.savings}
                  </span>
                )}
                <p className="text-gray-400 text-sm">{pkg.description}</p>
              </div>

              {/* Buy button */}
              <button
                disabled={loading}
                className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-all ${
                  loading && selectedPackage === pkg.id
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : pkg.popular
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      : 'bg-[#374151] hover:bg-[#4b5563] text-white'
                }`}
              >
                {loading && selectedPackage === pkg.id ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Purchase'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Demo credits button */}
        <div className="border-t border-[#374151] pt-4">
          <button
            onClick={handleAddFreeCredits}
            disabled={loading}
            className="w-full py-2 px-4 border border-dashed border-[#4b5563] rounded-lg text-gray-400 hover:text-white hover:border-[#6b7280] transition-colors"
          >
            🎁 Get 10 Free Demo Credits
          </button>
          <p className="text-center text-gray-500 text-xs mt-2">
            For testing purposes only. Limited to 50 free credits per account.
          </p>
        </div>

        {/* Stripe badge */}
        <div className="flex items-center justify-center mt-6 text-gray-500 text-sm">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
          Secure payment powered by Stripe
        </div>
      </div>
    </div>
  );
}
