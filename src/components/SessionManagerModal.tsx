import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderArchive, 
  Save, 
  Download, 
  Upload, 
  Play, 
  Trash2, 
  Plus, 
  X, 
  Check, 
  Clock, 
  Shield, 
  Heart, 
  Coins, 
  AlertCircle,
  FileText,
  Sparkles,
  Trophy,
  ChevronRight,
  Compass,
  RefreshCw
} from 'lucide-react';
import { GameEngineState, SavedSessionMetadata } from '../types/schema';
import { 
  getAllSavedSessions, 
  saveGameSession, 
  loadGameSession, 
  deleteGameSession, 
  exportSessionToFile, 
  importSessionFromFile,
  syncSessionsFromFirestore
} from '../engine/sessionManager';
import { ALL_MODULES } from '../data/modulesData';
import { auth } from '../lib/firebase';

interface SessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: GameEngineState;
  onRestoreSession: (loadedState: GameEngineState, sessionName: string) => void;
  onStartNewCampaign: (moduleId: string) => void;
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onRestoreSession,
  onStartNewCampaign
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'save_current' | 'new_campaign'>('sessions');
  const [sessions, setSessions] = useState<SavedSessionMetadata[]>([]);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh sessions on open or change
  const refreshSessions = async () => {
    // Show local first to prevent UI delay
    setSessions(getAllSavedSessions());
    
    // Sync from cloud if user is logged in
    if (auth.currentUser) {
      setIsSyncing(true);
      const synced = await syncSessionsFromFirestore();
      setSessions(synced);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSessions();
      // Generate default suggested save name
      const moduleName = currentState.currentModule?.title?.split(':')[0] || 'Module';
      setNewSessionName(`${moduleName} - Round ${currentState.currentRound}`);
    }
  }, [isOpen, currentState]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSaveCurrent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newSessionName.trim() || `Session ${new Date().toLocaleTimeString()}`;
    const saved = saveGameSession(name, currentState);
    setSessions(getAllSavedSessions());
    showFeedback(`Successfully saved session "${saved.name}"!`);
    setActiveTab('sessions');
  };

  const handleLoadSession = (sessionId: string) => {
    const loaded = loadGameSession(sessionId);
    const meta = sessions.find(s => s.id === sessionId);
    if (loaded && meta) {
      onRestoreSession(loaded, meta.name);
      onClose();
    } else {
      showFeedback('Could not load session data.', 'error');
    }
  };

  const handleOverwrite = (sessionId: string) => {
    const meta = sessions.find(s => s.id === sessionId);
    if (!meta) return;
    saveGameSession(meta.name, currentState, sessionId);
    setSessions(getAllSavedSessions());
    showFeedback(`Updated "${meta.name}" with current game state.`);
  };

  const handleDelete = (sessionId: string) => {
    deleteGameSession(sessionId);
    setDeleteConfirmId(null);
    setSessions(getAllSavedSessions());
    showFeedback('Session deleted.');
  };

  const handleExport = (sessionId: string) => {
    const ok = exportSessionToFile(sessionId);
    if (ok) {
      showFeedback('Downloaded session save file (.json)!');
    } else {
      showFeedback('Failed to export session file.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedMeta = await importSessionFromFile(file);
      setSessions(getAllSavedSessions());
      showFeedback(`Imported session: "${importedMeta.name}"!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showFeedback(err?.message || 'Error importing file.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-stone-950 via-amber-950/20 to-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-amber-200 font-serif tracking-wide flex items-center gap-2">
                Session Saver & Campaign Manager
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Store, restore, export, and manage independent game modules and campaign sessions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Actions Bar */}
        <div className="px-5 py-2.5 bg-stone-900/50 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                activeTab === 'sessions'
                  ? 'bg-amber-950 text-amber-200 border-amber-500/80 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderArchive className="w-3.5 h-3.5" />}
              <span>Saved Sessions ({sessions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('save_current')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                activeTab === 'save_current'
                  ? 'bg-amber-950 text-amber-200 border-amber-500/80 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Current Session</span>
            </button>

            <button
              onClick={() => setActiveTab('new_campaign')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                activeTab === 'new_campaign'
                  ? 'bg-amber-950 text-amber-200 border-amber-500/80 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Start New Module Set</span>
            </button>
          </div>

          {/* Import file trigger */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-700 text-xs font-medium cursor-pointer transition-colors shadow-sm"
              title="Import session from a .json save file on your computer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import File (.json)</span>
            </button>
          </div>
        </div>

        {/* Notification banner */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-5 py-2 text-xs font-medium border-b flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/70 border-red-500/40 text-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span>{statusMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: SAVED SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-stone-800 bg-stone-900/30">
                  <FolderArchive className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-stone-300">No Saved Sessions Found</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                    Save your current run to create an independent restore slot, or import a previously saved session file (.json).
                  </p>
                  <button
                    onClick={() => setActiveTab('save_current')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer inline-flex items-center gap-2 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    Save Current Run Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {sessions.map((sess) => {
                    const isAutosave = sess.id === 'session_autosave_slot';
                    const isDeleting = deleteConfirmId === sess.id;

                    return (
                      <div
                        key={sess.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isAutosave
                            ? 'bg-stone-900/40 border-stone-800/80 hover:border-stone-700'
                            : 'bg-stone-900/70 border-stone-800 hover:border-amber-500/50 shadow-md'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/60">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                                {isAutosave && <Clock className="w-3.5 h-3.5 text-stone-400" />}
                                {sess.name}
                              </h3>
                              {sess.bossDefeated ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-emerald-400" />
                                  Boss Slayed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 text-amber-300 text-[10px] font-medium">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400 font-mono">
                              <span className="text-stone-300 font-medium">{sess.moduleTitle}</span>
                              <span>•</span>
                              <span>Round {sess.currentRound}</span>
                              <span>•</span>
                              <span>{sess.roomsExplored}/{sess.maxRooms || 5} Rooms Explored</span>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">{sess.partyGold} GP</span>
                            </div>
                          </div>

                          {/* Action Buttons for this session */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              onClick={() => handleLoadSession(sess.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
                              title="Restore and continue this session"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Restore</span>
                            </button>

                            <button
                              onClick={() => handleOverwrite(sess.id)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs cursor-pointer transition-colors"
                              title="Overwrite this slot with current game state"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleExport(sess.id)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs cursor-pointer transition-colors"
                              title="Download session save file to your computer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {isDeleting ? (
                              <div className="flex items-center gap-1 bg-red-950 p-1 rounded-lg border border-red-700">
                                <button
                                  onClick={() => handleDelete(sess.id)}
                                  className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(sess.id)}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-300 border border-stone-700 hover:border-red-700 text-xs cursor-pointer transition-colors"
                                title="Delete this session slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Heroes HP Overview */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Party Roster:</span>
                          <div className="flex items-center gap-2">
                            {sess.heroes.map(h => (
                              <div
                                key={h.id}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] ${
                                  h.hp > 0
                                    ? 'bg-stone-950 border-stone-800 text-stone-300'
                                    : 'bg-stone-950/60 border-stone-900 text-stone-600 line-through'
                                }`}
                              >
                                <span>{h.portrait}</span>
                                <span className="font-semibold text-xs">{h.name.split(' ')[0]}</span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {h.hp}/{h.maxHp}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="ml-auto text-[10px] text-stone-500 font-mono">
                            Saved: {new Date(sess.updatedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVE CURRENT SESSION */}
          {activeTab === 'save_current' && (
            <div className="max-w-xl mx-auto space-y-4 py-3">
              <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Create New Independent Session Slot</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Saving will record the exact current dungeon grid, revealed rooms, monster positions and hit points, hero inventory, gold, and initiative queue.
                </p>

                <form onSubmit={handleSaveCurrent} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-mono text-stone-300 mb-1">
                      Session Name / Label
                    </label>
                    <input
                      type="text"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="e.g., Crypt Exploration - Room 4 Before Boss"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Current Run Snapshot */}
                  <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-xs space-y-1 font-mono text-stone-300">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Current Module:</span>
                      <span className="text-amber-200 font-semibold">{currentState.currentModule.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Round Number:</span>
                      <span>Round {currentState.currentRound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Rooms Revealed:</span>
                      <span>{currentState.activeRooms.length}/{currentState.currentModule.rooms.length} Rooms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Party Gold:</span>
                      <span className="text-amber-400 font-bold">{currentState.partyGold} GP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Boss Mandate:</span>
                      <span>{currentState.isVictory ? '🏆 Slain (Shop Open)' : '⚔️ Incomplete (Must Defeat)'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('sessions')}
                      className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Session Slot
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: START NEW CAMPAIGN / MODULE SET */}
          {activeTab === 'new_campaign' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-stone-900/40 border border-stone-800">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Start a New Independent Module Campaign</span>
                </div>
                <p className="text-xs text-stone-400">
                  Select an adventure module below to launch a pristine new run. Your existing saved sessions remain completely safe in the archive.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_MODULES.map((mod) => {
                  const isCurrent = currentState.currentModuleId === mod.id;

                  return (
                    <div
                      key={mod.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                          : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-stone-400 uppercase font-bold">
                            Module {mod.moduleNumber}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 text-[9px] font-black uppercase">
                              Active
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-stone-200 font-serif leading-snug">
                          {mod.title}
                        </h4>
                        <p className="text-[11px] text-stone-400 line-clamp-3">
                          {mod.description}
                        </p>

                        <div className="pt-2 text-[10px] font-mono text-stone-500 space-y-0.5">
                          <div>Rooms: {mod.rooms.length} Authored Rooms</div>
                          <div>Target: Slay the Module Boss</div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onStartNewCampaign(mod.id);
                          onClose();
                        }}
                        className="mt-4 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch New Session</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span>Sessions are saved locally in your browser storage and exportable to JSON files.</span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
