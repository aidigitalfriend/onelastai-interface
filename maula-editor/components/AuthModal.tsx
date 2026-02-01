import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md p-6 bg-vscode-sidebar border border-vscode-border shadow-lg font-mono rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-white">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-vscode-textMuted mt-1 text-xs">
                {mode === 'login' 
                  ? 'Sign in to save projects' 
                  : 'Join AI Digital Friend Zone'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex border border-vscode-border rounded mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 px-4 text-sm font-semibold transition ${
                  mode === 'login'
                    ? 'bg-vscode-accent text-white'
                    : 'text-vscode-textMuted hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 px-4 text-sm font-semibold transition ${
                  mode === 'register'
                    ? 'bg-vscode-accent text-white'
                    : 'text-vscode-textMuted hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-red-500/10 border border-red-400 text-red-400 text-xs font-semibold rounded"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-semibold text-vscode-textMuted mb-1">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-vscode-bg border border-vscode-border text-white placeholder-vscode-textMuted focus:outline-none focus:border-vscode-accent transition font-mono rounded"
                    placeholder="John Doe"
                  />
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-semibold text-vscode-textMuted mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-vscode-bg border border-vscode-border text-white placeholder-vscode-textMuted focus:outline-none focus:border-vscode-accent transition font-mono rounded"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-vscode-textMuted mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-vscode-bg border border-vscode-border text-white placeholder-vscode-textMuted focus:outline-none focus:border-vscode-accent transition font-mono rounded"
                  placeholder="••••••••"
                />
                {mode === 'register' && (
                  <p className="text-[10px] text-vscode-textMuted/60 mt-1">
                    Must be at least 8 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-vscode-accent text-white font-semibold border border-vscode-accent hover:bg-vscode-accent/80 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-none rounded"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">◎</span>
                    Processing...
                  </span>
                ) : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-vscode-textMuted text-[10px]">
                By continuing, you agree to our{' '}
                <a href="#" className="text-vscode-accent hover:text-white">
                  Terms of Service
                </a>
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-vscode-textMuted hover:text-white hover:bg-white/5 transition rounded"
            >
              <span className="text-xs">✕</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
