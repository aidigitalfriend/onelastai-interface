/**
 * EnvironmentVars — Manage environment variables per project
 * Secure key/value editor with masking
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, Save, AlertTriangle, Lock, RefreshCw } from 'lucide-react';

export interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

interface EnvironmentVarsProps {
  projectId: string;
  vars: EnvVar[];
  onChange: (vars: EnvVar[]) => void;
  onSave?: (vars: EnvVar[]) => Promise<void>;
  className?: string;
}

const EnvironmentVars: React.FC<EnvironmentVarsProps> = ({
  projectId,
  vars,
  onChange,
  onSave,
  className = '',
}) => {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const toggleVisibility = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCopy = useCallback((value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const handleAdd = useCallback(() => {
    if (!newKey.trim()) return;
    const updated = [...vars, { key: newKey.trim().toUpperCase(), value: newValue, isSecret: true }];
    onChange(updated);
    setNewKey('');
    setNewValue('');
    setShowAdd(false);
  }, [vars, newKey, newValue, onChange]);

  const handleUpdate = useCallback((index: number, field: 'key' | 'value', val: string) => {
    const updated = [...vars];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  }, [vars, onChange]);

  const handleDelete = useCallback((index: number) => {
    const updated = vars.filter((_, i) => i !== index);
    onChange(updated);
  }, [vars, onChange]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(vars);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, vars]);

  const maskValue = (value: string): string => {
    if (value.length <= 4) return '•'.repeat(value.length);
    return '•'.repeat(value.length - 4) + value.slice(-4);
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Key className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200">Environment Variables</h3>
            <p className="text-[10px] text-zinc-500">{vars.length} variable{vars.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-30"
            title="Save"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="mx-3 mt-2 flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
        <Lock className="w-3 h-3 text-amber-400/60 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-400/60 leading-relaxed">
          Variables are encrypted at rest and injected at build time. Never commit secrets to code.
        </p>
      </div>

      {/* Variable list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        <AnimatePresence>
          {vars.map((v, i) => (
            <motion.div
              key={`${v.key}-${i}`}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group bg-zinc-900/30 border border-zinc-800 rounded-xl p-3 hover:border-zinc-600 transition-all"
            >
              {/* Key */}
              <input
                type="text"
                value={v.key}
                onChange={(e) => handleUpdate(i, 'key', e.target.value.toUpperCase())}
                className="w-full bg-transparent text-[11px] font-mono font-bold text-blue-400 outline-none placeholder-zinc-600 mb-1.5"
                placeholder="KEY_NAME"
              />

              {/* Value + controls */}
              <div className="flex items-center gap-1.5">
                <input
                  type={v.isSecret && !visibleKeys.has(v.key) ? 'password' : 'text'}
                  value={v.value}
                  onChange={(e) => handleUpdate(i, 'value', e.target.value)}
                  className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 outline-none focus:border-violet-500/30 transition-all"
                  placeholder="value..."
                />
                <button
                  onClick={() => toggleVisibility(v.key)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                >
                  {visibleKeys.has(v.key) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleCopy(v.value, v.key)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                >
                  {copiedKey === v.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => handleDelete(i)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add new variable */}
        {showAdd ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-2"
          >
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              placeholder="KEY_NAME"
              autoFocus
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-blue-400 outline-none focus:border-violet-500/30 placeholder-zinc-600"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 outline-none focus:border-violet-500/30 placeholder-zinc-600"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newKey.trim()}
                className="flex-1 px-3 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/30 disabled:opacity-30 transition-all"
              >
                Add Variable
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewKey(''); setNewValue(''); }}
                className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full px-3 py-3 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.15] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Variable
          </button>
        )}
      </div>
    </div>
  );
};

export default EnvironmentVars;
