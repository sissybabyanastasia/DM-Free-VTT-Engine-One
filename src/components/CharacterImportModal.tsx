import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, FileJson, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

interface CharacterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onCharacterImported?: (characterData: any) => void;
}

export const CharacterImportModal: React.FC<CharacterImportModalProps> = ({ isOpen, onClose, user, onCharacterImported }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/characters/template');
      if (!res.ok) throw new Error('Failed to fetch template');
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'character-template.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const fileContent = await file.text();
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid JSON file format.');
      }

      const res = await fetch('/api/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        const errorDetails = result.errors 
          ? result.errors.map((e: any) => `${e.instancePath || 'Field'} ${e.message}`).join(', ')
          : 'Validation failed';
        throw new Error(`Schema Error: ${errorDetails}`);
      }

      // Validated character data
      const characterData = result.data;

      // If user is logged in, optionally save to their user profile or a characters collection
      if (user) {
        // Here we could save it to the DB if needed. For now, just trigger success and callback
        // Example: await setDoc(doc(db, 'characters', newId), characterData);
      }

      setSuccess(`Character '${characterData.name}' imported successfully!`);
      if (onCharacterImported) {
        onCharacterImported(characterData);
      }
      
      // Reset input
      e.target.value = '';
    } catch (err: any) {
      setError(err.message);
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
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileJson className="w-6 h-6" />
            </div>
          </div>
          
          <h2 className="text-xl font-black text-purple-200 font-serif text-center mb-2">
            Import Character
          </h2>
          <p className="text-xs text-stone-400 text-center mb-6">
            Upload a character JSON file. The backend will validate it against our strict schema before allowing it in-game.
          </p>

          <div className="space-y-4">
            <button
              onClick={downloadTemplate}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-purple-300 font-bold text-sm shadow-md transition-all active:scale-95 border border-stone-700"
            >
              <Download className="w-4 h-4" />
              <span>Download Schema Template</span>
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-md transition-all border ${loading ? 'bg-stone-800 border-stone-700 text-stone-500' : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-stone-950 active:scale-95'}`}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{loading ? 'Validating on Backend...' : 'Upload JSON File'}</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-200 text-xs font-medium leading-relaxed">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-200 text-xs font-medium leading-relaxed">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
