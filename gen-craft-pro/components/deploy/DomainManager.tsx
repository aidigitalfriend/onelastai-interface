/**
 * DomainManager — Custom domain configuration & DNS management
 * Add/verify custom domains for deployed projects
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Plus, Trash2, Shield, CheckCircle, Clock,
  AlertTriangle, Copy, Check, RefreshCw, ExternalLink,
  Lock, XCircle,
} from 'lucide-react';
import { useDeployStore, CustomDomain } from '../../stores/deployStore';

interface DomainManagerProps {
  projectId: string;
  className?: string;
}

const DomainManager: React.FC<DomainManagerProps> = ({ projectId, className = '' }) => {
  const { domains, addDomain, removeDomain, updateDomainStatus } = useDeployStore();
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const projectDomains = domains.filter((d) => d.projectId === projectId);

  const handleAdd = useCallback(async () => {
    if (!newDomain.trim()) return;
    setAdding(true);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${API_BASE}/api/deploy/domains`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, domain: newDomain.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        addDomain({
          domain: newDomain.trim(),
          projectId,
          status: 'pending',
          sslStatus: 'none',
          dnsRecords: data.domain?.dnsRecords || [
            { type: 'CNAME', name: newDomain.trim(), value: `${projectId}.maula.ai` },
            { type: 'TXT', name: `_verify.${newDomain.trim()}`, value: `maula-verify=${Date.now().toString(36)}` },
          ],
        });
      } else {
        // Fallback: add locally
        addDomain({
          domain: newDomain.trim(),
          projectId,
          status: 'pending',
          sslStatus: 'none',
          dnsRecords: [
            { type: 'CNAME', name: newDomain.trim(), value: `${projectId}.maula.ai` },
            { type: 'TXT', name: `_verify.${newDomain.trim()}`, value: `maula-verify=${Date.now().toString(36)}` },
          ],
        });
      }
    } catch {
      // Offline fallback
      addDomain({
        domain: newDomain.trim(),
        projectId,
        status: 'pending',
        sslStatus: 'none',
        dnsRecords: [
          { type: 'CNAME', name: newDomain.trim(), value: `${projectId}.maula.ai` },
          { type: 'TXT', name: `_verify.${newDomain.trim()}`, value: `maula-verify=${Date.now().toString(36)}` },
        ],
      });
    }

    setNewDomain('');
    setAdding(false);
  }, [newDomain, projectId, addDomain]);

  const handleVerify = useCallback(async (domain: CustomDomain) => {
    setVerifying(domain.id);
    updateDomainStatus(domain.id, 'verifying');

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${API_BASE}/api/deploy/domains/${domain.id}/verify`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.domain?.dnsVerified) {
          updateDomainStatus(domain.id, 'active', 'provisioning');
          // Poll for SSL status
          const pollSSL = setInterval(async () => {
            try {
              const sslRes = await fetch(`${API_BASE}/api/deploy/domains/${domain.id}`, { credentials: 'include' });
              const sslData = await sslRes.json();
              if (sslData.domain?.sslStatus === 'active') {
                updateDomainStatus(domain.id, 'active', 'active');
                clearInterval(pollSSL);
              }
            } catch { clearInterval(pollSSL); }
          }, 3000);
          setTimeout(() => clearInterval(pollSSL), 30000);
        } else {
          updateDomainStatus(domain.id, 'failed');
        }
      } else {
        updateDomainStatus(domain.id, 'failed');
      }
    } catch {
      updateDomainStatus(domain.id, 'failed');
    }

    setVerifying(null);
  }, [updateDomainStatus]);

  const copyRecord = (value: string, recordId: string) => {
    navigator.clipboard.writeText(value);
    setCopiedRecord(recordId);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const statusBadge = (domain: CustomDomain) => {
    switch (domain.status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
            <CheckCircle className="w-2.5 h-2.5" /> Active
          </span>
        );
      case 'verifying':
        return (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
            <Clock className="w-2.5 h-2.5 animate-spin" /> Verifying
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
            <Clock className="w-2.5 h-2.5" /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
            <XCircle className="w-2.5 h-2.5" /> Failed
          </span>
        );
    }
  };

  const sslBadge = (domain: CustomDomain) => {
    switch (domain.sslStatus) {
      case 'active':
        return <Lock className="w-3 h-3 text-emerald-400" />;
      case 'provisioning':
        return <Lock className="w-3 h-3 text-amber-400 animate-pulse" />;
      default:
        return <Lock className="w-3 h-3 text-zinc-600" />;
    }
  };

  return (
    <div className={`flex flex-col bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Custom Domains</h3>
            <p className="text-[10px] text-zinc-500">{projectDomains.length} domain{projectDomains.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
      </div>

      {/* Add domain */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="example.com"
          className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newDomain.trim() || adding}
          className="px-3 py-2 bg-violet-500/20 border border-violet-500/30 rounded-lg text-xs font-semibold text-violet-400 hover:bg-violet-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Domain list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {projectDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Globe className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No custom domains</p>
            <p className="text-[10px] mt-1">Add a domain to get started</p>
          </div>
        ) : (
          <AnimatePresence>
            {projectDomains.map((domain) => (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b border-zinc-800/50"
              >
                {/* Domain header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {sslBadge(domain)}
                    <span className="text-xs font-medium text-zinc-200 truncate">{domain.domain}</span>
                    {statusBadge(domain)}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {domain.status === 'pending' || domain.status === 'failed' ? (
                      <button
                        onClick={() => handleVerify(domain)}
                        disabled={verifying === domain.id}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all disabled:opacity-40"
                        title="Verify DNS"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${verifying === domain.id ? 'animate-spin' : ''}`} />
                      </button>
                    ) : null}
                    {domain.status === 'active' && (
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => removeDomain(domain.id)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* DNS Records (show when pending/failed) */}
                {(domain.status === 'pending' || domain.status === 'failed') && (
                  <div className="px-4 pb-3 space-y-2">
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Add these DNS records at your domain registrar:
                    </p>
                    {domain.dnsRecords.map((record, i) => {
                      const recordKey = `${domain.id}-${i}`;
                      return (
                        <div
                          key={recordKey}
                          className="bg-zinc-900/30 rounded-lg p-2 border border-zinc-800/50"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-blue-400">{record.type}</span>
                            <button
                              onClick={() => copyRecord(record.value, recordKey)}
                              className="p-1 text-zinc-600 hover:text-zinc-300"
                            >
                              {copiedRecord === recordKey ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] font-mono">
                            <span className="text-zinc-500">Name: </span>
                            <span className="text-zinc-300">{record.name}</span>
                          </div>
                          <div className="text-[10px] font-mono">
                            <span className="text-zinc-500">Value: </span>
                            <span className="text-zinc-300 break-all">{record.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SSL info (show when active) */}
                {domain.status === 'active' && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 text-[10px]">
                      <Shield className={`w-3 h-3 ${domain.sslStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="text-zinc-500">
                        SSL: {domain.sslStatus === 'active' ? 'Active' : domain.sslStatus === 'provisioning' ? 'Provisioning...' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default DomainManager;
