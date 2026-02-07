/**
 * InvoiceHistory — Billing invoice list and management
 * View, download, and manage past invoices
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Download, ExternalLink, ChevronRight,
  CheckCircle, Clock, XCircle, CreditCard,
  FileText, Search, Filter,
} from 'lucide-react';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  plan: string;
  period: string;
  paymentMethod?: string;
  pdfUrl?: string;
}

interface InvoiceHistoryProps {
  invoices?: Invoice[];
  onDownload?: (invoice: Invoice) => void;
  className?: string;
}

const statusConfig = {
  paid: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Paid' },
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Failed' },
  refunded: { icon: Receipt, color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Refunded' },
};

const InvoiceHistory: React.FC<InvoiceHistoryProps> = ({
  invoices: propInvoices,
  onDownload,
  className = '',
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all');

  const defaultInvoices: Invoice[] = propInvoices || [
    {
      id: 'inv_1', number: 'INV-2025-001', date: '2025-01-15', dueDate: '2025-01-15',
      amount: 19, currency: 'USD', status: 'paid', plan: 'Pro Monthly',
      period: 'Jan 2025', paymentMethod: '•••• 4242', pdfUrl: '#',
    },
    {
      id: 'inv_2', number: 'INV-2024-012', date: '2024-12-15', dueDate: '2024-12-15',
      amount: 19, currency: 'USD', status: 'paid', plan: 'Pro Monthly',
      period: 'Dec 2024', paymentMethod: '•••• 4242', pdfUrl: '#',
    },
    {
      id: 'inv_3', number: 'INV-2024-011', date: '2024-11-15', dueDate: '2024-11-15',
      amount: 19, currency: 'USD', status: 'paid', plan: 'Pro Monthly',
      period: 'Nov 2024', paymentMethod: '•••• 4242', pdfUrl: '#',
    },
    {
      id: 'inv_4', number: 'INV-2024-010', date: '2024-10-15', dueDate: '2024-10-15',
      amount: 7, currency: 'USD', status: 'paid', plan: 'Pro Weekly',
      period: 'Oct 2024 (Week 3)', paymentMethod: '•••• 4242', pdfUrl: '#',
    },
    {
      id: 'inv_5', number: 'INV-2024-009', date: '2024-10-08', dueDate: '2024-10-08',
      amount: 7, currency: 'USD', status: 'refunded', plan: 'Pro Weekly',
      period: 'Oct 2024 (Week 2)', paymentMethod: '•••• 4242', pdfUrl: '#',
    },
  ];

  const filtered = defaultInvoices
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
    .filter((inv) =>
      !searchQuery ||
      inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.plan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.period.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalPaid = defaultInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Invoice History</h3>
            <p className="text-[10px] text-zinc-500">
              {defaultInvoices.length} invoices · ${totalPaid} total
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded-lg text-[9px] font-medium transition-all ${
                statusFilter === s
                  ? s === 'all' ? 'bg-zinc-800 text-zinc-200' :
                    `${statusConfig[s as Invoice['status']].bg} ${statusConfig[s as Invoice['status']].color}`
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {s === 'all' ? 'All' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Receipt className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-xs text-zinc-500">No invoices found</p>
          </div>
        ) : (
          filtered.map((invoice) => {
            const config = statusConfig[invoice.status];
            const Icon = config.icon;
            const isExpanded = expandedId === invoice.id;

            return (
              <div key={invoice.id} className="border-b border-zinc-800/50">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/30 transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-200 font-medium">{invoice.number}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">{invoice.period}</span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-500">{invoice.plan}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-zinc-200">
                      ${invoice.amount.toFixed(2)}
                    </span>
                    <p className="text-[9px] text-zinc-600">{invoice.currency}</p>
                  </div>
                  <ChevronRight className={`w-3 h-3 text-zinc-700 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pl-14 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-zinc-600">Invoice Date</span>
                            <p className="text-zinc-300">{invoice.date}</p>
                          </div>
                          <div>
                            <span className="text-zinc-600">Due Date</span>
                            <p className="text-zinc-300">{invoice.dueDate}</p>
                          </div>
                          {invoice.paymentMethod && (
                            <div>
                              <span className="text-zinc-600">Payment Method</span>
                              <p className="text-zinc-300 flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> {invoice.paymentMethod}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="text-zinc-600">Plan</span>
                            <p className="text-zinc-300">{invoice.plan}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {invoice.pdfUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownload?.(invoice);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-all"
                            >
                              <Download className="w-3 h-3" />
                              Download PDF
                            </button>
                          )}
                          <button className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InvoiceHistory;
