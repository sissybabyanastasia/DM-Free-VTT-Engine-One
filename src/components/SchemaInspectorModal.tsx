import React, { useState } from 'react';
import { DMFREE_DD_ENGINE_SCHEMA } from '../data/jsonSchema';
import { MODULE_1_CORE_SET, MODULE_2_ADVANCED_SET, MODULE_3_EPIC_EXPANSION } from '../data/modulesData';
import { X, Copy, Download, Check, Code, FileJson, Layers, ShieldCheck } from 'lucide-react';

interface SchemaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaInspectorModal: React.FC<SchemaInspectorModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'mod1' | 'mod2' | 'mod3' | 'overview'>('schema');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let activeData: any = DMFREE_DD_ENGINE_SCHEMA;
  let filename = 'dm-free-dnd-schema.json';

  if (activeTab === 'schema') {
    activeData = DMFREE_DD_ENGINE_SCHEMA;
    filename = 'dm-free-dnd-schema.json';
  } else if (activeTab === 'mod1') {
    activeData = MODULE_1_CORE_SET;
    filename = 'module-1-core-set.json';
  } else if (activeTab === 'mod2') {
    activeData = MODULE_2_ADVANCED_SET;
    filename = 'module-2-advanced-set.json';
  } else if (activeTab === 'mod3') {
    activeData = MODULE_3_EPIC_EXPANSION;
    filename = 'module-3-epic-expansion.json';
  }

  const jsonString = JSON.stringify(activeData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl h-[85vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-serif">
                Engine JSON Schema & Data Packages
              </h2>
              <p className="text-xs text-stone-400">
                Specification for DM-Free Turn-Based D&D Tabletop Applet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono transition-all"
              title="Copy formatted JSON to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono transition-all"
              title="Download .json file"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-all ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-stone-950/60 border-b border-stone-800 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Architecture Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'schema' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>JSON Schema Standard</span>
          </button>

          <button
            onClick={() => setActiveTab('mod1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'mod1' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Module 1 (5-Room Core Set)</span>
          </button>

          <button
            onClick={() => setActiveTab('mod2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'mod2' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Module 2 (Advanced + Mini-Boss)</span>
          </button>

          <button
            onClick={() => setActiveTab('mod3')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'mod3' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Module 3 (Epic + Arch-Lich)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs">
          {activeTab === 'overview' ? (
            <div className="space-y-6 text-stone-300 font-sans text-sm leading-relaxed max-w-4xl">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                <h3 className="text-base font-bold text-amber-400 mb-2 font-serif">
                  1. Spawning Map Rule & Exploration Trigger
                </h3>
                <p className="text-stone-300 mb-2">
                  <strong className="text-amber-300 font-mono">Governing Law:</strong> "Every time a hero occupies an 'Edge Coordinate', a new, room data block initializes."
                </p>
                <ul className="list-disc pl-5 space-y-1 text-stone-400 text-xs">
                  <li>Rooms have defined gateway coordinates flagged as <code className="text-amber-400 font-mono">edge</code>.</li>
                  <li>When a character steps on an edge coordinate, the engine instantiates either the sequential authored room or procedurally calculates origin, dimensions, monsters, hazards, and traps.</li>
                  <li>Fog of war dynamically lifts and adds newly revealed tiles to the unified navigation mesh.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                <h3 className="text-base font-bold text-amber-400 mb-2 font-serif">
                  2. Character Turn Definition
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                    <strong className="text-blue-400 block mb-1">Move Allotment</strong>
                    Discrete square-based speed pool (e.g., 6 squares = 30ft). Can be split before and after attack or doubled with Cunning Dash.
                  </div>
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                    <strong className="text-purple-400 block mb-1">Attack & Abilities</strong>
                    1 standard Action pool per round. Standard weapon attacks (d20 + bonus vs AC) or class spells (Firebolt, Magic Missile, Burning Hands).
                  </div>
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                    <strong className="text-emerald-400 block mb-1">Interact Pool</strong>
                    Dedicated free/standard object interaction for opening loot chests, disarming traps (DEX check), and smashing boss Crypt Pillars.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                <h3 className="text-base font-bold text-amber-400 mb-2 font-serif">
                  3. Deterministic Monster AI Mechanics
                </h3>
                <p className="text-stone-400 text-xs mb-3">
                  No DM required. Monsters follow predictable, transparent decision trees that players can anticipate and counter-strat:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                    <span className="text-red-400 font-bold block mb-1">Chase (Skeletons)</span>
                    Targeting rule: strictly targets players with lowest HP. Minimizes distance relentlessly; strikes adjacent foes.
                  </div>
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                    <span className="text-amber-400 font-bold block mb-1">Ambush (Goblins & Spiders)</span>
                    Starts stealthed. Leaps out within reveal distance, applies surprise damage, then uses Nimble Escape to retreat 2 squares behind cover.
                  </div>
                  <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
                    <span className="text-blue-400 font-bold block mb-1">Patrol (Sentinels)</span>
                    Follows waypoint circuit until player approaches within 4 squares, then shifts into Chase mode.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                <h3 className="text-base font-bold text-amber-400 mb-2 font-serif">
                  4. Unique Hazards & Boss Mechanics
                </h3>
                <div className="space-y-2 text-xs text-stone-300">
                  <p><strong>Crumbling Floor:</strong> Flagstones support exactly 2 footsteps. On the 2nd step, the floor cracks; subsequent steps cause a complete collapse into a 10ft spiked pit (DC 12 DEX save or 1d6 bludgeoning).</p>
                  <p><strong>Crypt Lord Malakor:</strong> Immune to all damage while his 2 Crypt Pillars are empowered. Heroes must coordinate adjacent Interact actions to smash pillars before defeating him.</p>
                </div>
              </div>
            </div>
          ) : (
            <pre className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-emerald-400 overflow-x-auto leading-relaxed select-text">
              {jsonString}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
