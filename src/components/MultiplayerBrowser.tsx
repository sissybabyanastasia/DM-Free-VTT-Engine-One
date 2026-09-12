import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { subscribeToLobbies, createLobby, joinLobby, Lobby, leaveLobby, startMultiplayerGame, subscribeToLobby, syncGameState } from '../lib/multiplayer';
import { ALL_MODULES } from '../data/modulesData';
import { Users, Plus, Shield, Loader2, ArrowLeft, Swords, Skull } from 'lucide-react';
import { TabletopGameEngine } from '../engine/gameEngine';

interface MultiplayerBrowserProps {
  onJoin: (lobbyId: string) => void;
  onBack: () => void;
}

export const MultiplayerBrowser: React.FC<MultiplayerBrowserProps> = ({ onJoin, onBack }) => {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [selectedModule, setSelectedModule] = useState(ALL_MODULES[0].id);

  useEffect(() => {
    const unsubscribe = subscribeToLobbies((data) => {
      setLobbies(data);
    });
    return unsubscribe;
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lobbyName.trim()) return;
    setIsCreating(true);
    try {
      const lobbyId = await createLobby(lobbyName, selectedModule);
      onJoin(lobbyId);
    } catch (err) {
      console.error(err);
      alert('Failed to create lobby');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-stone-950 flex flex-col p-6 overflow-y-auto text-stone-200">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-8">
        <div className="flex items-center gap-4 border-b border-stone-800 pb-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-900 rounded-lg text-stone-400 hover:text-stone-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-amber-500 font-serif">Multiplayer Lobbies</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-200 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Create New Lobby
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-stone-400 mb-1">Lobby Name</label>
                  <input
                    type="text"
                    required
                    value={lobbyName}
                    onChange={e => setLobbyName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
                    placeholder="e.g. Saturday Night Crawl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-stone-400 mb-1">Select Module</label>
                  <select
                    value={selectedModule}
                    onChange={e => setSelectedModule(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none"
                  >
                    {ALL_MODULES.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg shadow-md transition-colors disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Lobby'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-stone-300 mb-4">Active Lobbies</h2>
            {lobbies.length === 0 ? (
              <div className="bg-stone-900/50 border border-stone-800 border-dashed rounded-2xl p-8 text-center text-stone-500">
                <Shield className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No waiting lobbies found. Be the first to create one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lobbies.map(lobby => (
                  <div key={lobby.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-stone-700 transition-colors">
                    <div>
                      <h3 className="font-bold text-stone-200 text-lg">{lobby.name}</h3>
                      <div className="text-xs text-stone-400 font-mono mt-1 flex items-center gap-2">
                        <span className="text-amber-500">{ALL_MODULES.find(m => m.id === lobby.moduleId)?.title}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {lobby.playerIds.length}/4
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onJoin(lobby.id)}
                      disabled={lobby.playerIds.length >= 4}
                      className="shrink-0 px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {lobby.playerIds.length >= 4 ? 'Full' : 'Join Game'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
