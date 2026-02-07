/**
 * UsageDashboard — Subscription usage & quota tracking
 * Shows API calls, deployments, storage, and billing status
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Zap, Globe, HardDrive, Clock,
  TrendingUp, AlertTriangle, CreditCard, Crown,
  ArrowRight, RefreshCcw,
} from 'lucide-react';

export interface UsageQuota {
  label: string;
  used: number;
  limit: number;
  unit: string;
  icon: React.ElementType;
  color: string;
}

export interface BillingInfo {
  plan: 'free' | 'weekly' | 'monthly' | 'yearly';
  planName: string;
  price: number;
  billingCycle: string;
  nextBillingDate: string;
  status: 'active' | 'past_due' | 'cancelled';
}

interface UsageDashboardProps {
  billing?: BillingInfo;
  quotas?: UsageQuota[];
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  className?: string;
}

const planColors = {
  free: 'text-zinc-400',
  weekly: 'text-blue-400',
  monthly: 'text-violet-400',
  yearly: 'text-amber-400',
};

const UsageDashboard: React.FC<UsageDashboardProps> = ({
  billing,
  quotas,
  onUpgrade,
  onManageBilling,
  className = '',
}) => {
  const [period, setPeriod] = useState<'current' | 'previous'>('current');

  const defaultBilling: BillingInfo = billing || {
    plan: 'monthly',
    planName: 'Pro Monthly',
    price: 19,
    billingCycle: 'month',
    nextBillingDate: new Date(Date.now() + 15 * 86400000).toLocaleDateString(),
    status: 'active',
  };

  const defaultQuotas: UsageQuota[] = quotas || [
    { label: 'AI Generations', used: 847, limit: 2000, unit: 'calls', icon: Zap, color: 'violet' },
    { label: 'Deployments', used: 23, limit: 100, unit: 'deploys', icon: Globe, color: 'cyan' },
    { label: 'Storage', used: 2.4, limit: 10, unit: 'GB', icon: HardDrive, color: 'emerald' },
    { label: 'Build Minutes', used: 128, limit: 500, unit: 'min', icon: Clock, color: 'amber' },
  ];

  const getUsagePercent = (quota: UsageQuota) => Math.min((quota.used / quota.limit) * 100, 100);
  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-violet-500';
  };

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Usage & Billing</h3>
            <p className="text-[10px] text-zinc-500">Current billing period</p>
          </div>
        </div>
        {onManageBilling && (
          <button
            onClick={onManageBilling}
            className="px-2.5 py-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-all flex items-center gap-1"
          >
            <CreditCard className="w-3 h-3" />
            Manage
          </button>
        )}
      </div>

      {/* Plan card */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="bg-gradient-to-r from-violet-500/[0.06] to-blue-500/[0.04] rounded-xl p-4 border border-violet-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className={`w-4 h-4 ${planColors[defaultBilling.plan]}`} />
              <span className="text-sm font-bold text-zinc-200">{defaultBilling.planName}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              defaultBilling.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
              defaultBilling.status === 'past_due' ? 'bg-red-500/15 text-red-400' :
              'bg-zinc-500/15 text-zinc-400'
            }`}>
              {defaultBilling.status === 'active' ? 'Active' :
               defaultBilling.status === 'past_due' ? 'Past Due' : 'Cancelled'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-zinc-200">${defaultBilling.price}</span>
            <span className="text-xs text-zinc-500">/{defaultBilling.billingCycle}</span>
          </div>
          <p className="text-[10px] text-zinc-500">
            Next billing: {defaultBilling.nextBillingDate}
          </p>

          {defaultBilling.plan !== 'yearly' && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/30 transition-all"
            >
              Upgrade Plan <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Usage quotas */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">Resource Usage</span>
          <button
            onClick={() => setPeriod(period === 'current' ? 'previous' : 'current')}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            {period === 'current' ? 'Current' : 'Previous'}
          </button>
        </div>

        {defaultQuotas.map((quota, i) => {
          const percent = getUsagePercent(quota);
          const Icon = quota.icon;

          return (
            <motion.div
              key={quota.label}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 text-${quota.color}-400`} />
                  <span className="text-[11px] text-zinc-300">{quota.label}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {quota.used.toLocaleString()}{' '}
                  <span className="text-zinc-600">/ {quota.limit.toLocaleString()} {quota.unit}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`h-full rounded-full ${getUsageColor(percent)}`}
                />
              </div>
              {percent >= 80 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[9px] text-amber-400">
                    {percent >= 100 ? 'Limit reached' : `${Math.round(percent)}% used`}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900/30 rounded-lg p-2.5 border border-zinc-900/50">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
              <TrendingUp className="w-3 h-3" /> Avg Daily
            </div>
            <span className="text-sm font-bold text-zinc-200">28</span>
            <span className="text-[10px] text-zinc-500 ml-1">generations</span>
          </div>
          <div className="bg-zinc-900/30 rounded-lg p-2.5 border border-zinc-900/50">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
              <Globe className="w-3 h-3" /> Active Sites
            </div>
            <span className="text-sm font-bold text-zinc-200">5</span>
            <span className="text-[10px] text-zinc-500 ml-1">deployed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;
