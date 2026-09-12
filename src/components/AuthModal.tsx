import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { X, Lock, Mail, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString()
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error('Error signing out', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 py-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {user ? <UserIcon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
          </div>

          <h2 className="text-xl font-black text-amber-200 font-serif text-center mb-2">
            {user ? 'Account Management' : (isLogin ? 'Adventurer Login' : 'Register Account')}
          </h2>
          <p className="text-xs text-stone-400 text-center mb-6">
            {user 
              ? `Logged in as ${user.email}` 
              : 'Sign in to sync your campaigns and party gold across devices.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {user ? (
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 border border-stone-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Sign Out</span>
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-stone-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="hero@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-mono text-stone-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="text-xs text-amber-500 hover:text-amber-400 font-semibold"
                >
                  {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
