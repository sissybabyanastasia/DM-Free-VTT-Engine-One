import { GameEngineState, SavedSessionMetadata, ExportedSessionFile, GridTile } from '../types/schema';
import { auth, db } from '../lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, orderBy } from 'firebase/firestore';

const REGISTRY_KEY = 'dnd_tabletop_sessions_registry_v1';
const DATA_PREFIX = 'dnd_tabletop_session_data_';

/**
 * Serializes GameEngineState for storage, safely converting the allTiles Map to entries array.
 */
export function serializeGameState(state: GameEngineState): any {
  return {
    ...state,
    allTiles: Array.from(state.allTiles.entries()), // [string, GridTile][]
  };
}

/**
 * Restores GameEngineState from serialized JSON, reconstructing the allTiles Map.
 */
export function deserializeGameState(serialized: any): GameEngineState {
  const allTiles = new Map<string, GridTile>(serialized.allTiles || []);
  return {
    ...serialized,
    allTiles,
  };
}

/**
 * Generates metadata summary from the current game state.
 */
export function buildSessionMetadata(name: string, state: GameEngineState, id?: string): SavedSessionMetadata {
  const sessionId = id || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const maxRooms = state.currentModule?.rooms?.length || 5;

  return {
    id: sessionId,
    name: name.trim() || `${state.currentModule.title.split(':')[0]} - Round ${state.currentRound}`,
    createdAt: now,
    updatedAt: now,
    moduleId: state.currentModuleId,
    moduleTitle: state.currentModule.title,
    currentRound: state.currentRound,
    roomsExplored: state.gameStats.roomsExplored,
    maxRooms,
    monstersSlain: state.gameStats.monstersSlain,
    bossDefeated: !!state.isVictory || !!state.bossDefeated,
    partyGold: state.partyGold,
    heroes: state.heroes.map(h => ({
      id: h.id,
      name: h.name,
      portrait: h.portrait,
      classType: h.classType,
      hp: h.hp,
      maxHp: h.maxHp,
      isAlive: h.hp > 0
    }))
  };
}

/**
 * Helper to sync session to Firestore if user is logged in
 */
async function syncSessionToFirestore(metadata: SavedSessionMetadata, serializedState: any) {
  const user = auth.currentUser;
  if (!user) return; // Only sync if logged in

  try {
    const sessionDocRef = doc(db, `users/${user.uid}/sessions`, metadata.id);
    await setDoc(sessionDocRef, {
      metadata,
      state: serializedState,
      updatedAt: metadata.updatedAt
    });
  } catch (err) {
    console.error('Failed to sync session to Firestore', err);
  }
}

/**
 * Syncs all sessions from Firestore to local storage for the given user.
 */
export async function syncSessionsFromFirestore(): Promise<SavedSessionMetadata[]> {
  const user = auth.currentUser;
  if (!user) return getAllSavedSessions();

  try {
    const sessionsRef = collection(db, `users/${user.uid}/sessions`);
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    const registry: SavedSessionMetadata[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.metadata && data.state) {
        registry.push(data.metadata);
        localStorage.setItem(DATA_PREFIX + data.metadata.id, JSON.stringify(data.state));
      }
    });

    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    return registry;
  } catch (err) {
    console.error('Failed to fetch sessions from Firestore', err);
    return getAllSavedSessions();
  }
}

/**
 * Retrieves the list of all saved sessions from the local registry.
 */
export function getAllSavedSessions(): SavedSessionMetadata[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed: SavedSessionMetadata[] = JSON.parse(raw);
    return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error('Failed to load session registry:', err);
    return [];
  }
}

/**
 * Saves a game session locally under an independent slot and syncs to Firestore if authenticated.
 */
export function saveGameSession(name: string, state: GameEngineState, existingId?: string): SavedSessionMetadata {
  const registry = getAllSavedSessions();
  const existingMeta = existingId ? registry.find(s => s.id === existingId) : null;
  
  const metadata = buildSessionMetadata(name, state, existingId);
  if (existingMeta) {
    metadata.createdAt = existingMeta.createdAt; // Preserve original creation time
  }

  // Serialize and store state data
  const serialized = serializeGameState(state);
  localStorage.setItem(DATA_PREFIX + metadata.id, JSON.stringify(serialized));

  // Update registry
  const updatedRegistry = registry.filter(s => s.id !== metadata.id);
  updatedRegistry.unshift(metadata);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(updatedRegistry));

  // Sync to firestore in background
  syncSessionToFirestore(metadata, serialized);

  return metadata;
}

/**
 * Loads and reconstructs a game session from local storage.
 */
export function loadGameSession(id: string): GameEngineState | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + id);
    if (!raw) {
      console.warn(`Session data not found for id: ${id}`);
      return null;
    }
    const parsed = JSON.parse(raw);
    return deserializeGameState(parsed);
  } catch (err) {
    console.error(`Failed to deserialize session ${id}:`, err);
    return null;
  }
}

/**
 * Deletes a session from local storage and the registry, and from Firestore if authenticated.
 */
export function deleteGameSession(id: string): boolean {
  try {
    localStorage.removeItem(DATA_PREFIX + id);
    const registry = getAllSavedSessions().filter(s => s.id !== id);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

    const user = auth.currentUser;
    if (user) {
      deleteDoc(doc(db, `users/${user.uid}/sessions`, id)).catch(err => {
        console.error('Failed to delete session from Firestore', err);
      });
    }

    return true;
  } catch (err) {
    console.error(`Failed to delete session ${id}:`, err);
    return false;
  }
}

/**
 * Exports a session as a downloadable JSON file.
 */
export function exportSessionToFile(id: string): boolean {
  try {
    const registry = getAllSavedSessions();
    const meta = registry.find(s => s.id === id);
    if (!meta) return false;

    const raw = localStorage.getItem(DATA_PREFIX + id);
    if (!raw) return false;

    const sessionFile: ExportedSessionFile = {
      version: 1,
      appName: 'D&D Tabletop Module Engine',
      exportDate: new Date().toISOString(),
      metadata: meta,
      state: JSON.parse(raw)
    };

    const blob = new Blob([JSON.stringify(sessionFile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const sanitizedName = meta.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `session_${sanitizedName}_${Date.now()}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export session to file:', err);
    return false;
  }
}

/**
 * Imports a session from a user-provided JSON file.
 */
export function importSessionFromFile(file: File): Promise<SavedSessionMetadata> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Check format: either direct ExportedSessionFile or state object
        let meta: SavedSessionMetadata;
        let stateData: any;

        if (parsed.version && parsed.metadata && parsed.state) {
          stateData = parsed.state;
          // Generate a fresh unique ID to prevent collisions
          const newId = `session_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          meta = {
            ...parsed.metadata,
            id: newId,
            name: `${parsed.metadata.name} (Imported)`,
            updatedAt: new Date().toISOString()
          };
        } else if (parsed.currentModule && parsed.heroes && parsed.allTiles) {
          // Direct serialized state
          const newId = `session_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          stateData = parsed;
          const dummyState = deserializeGameState(parsed);
          meta = buildSessionMetadata(file.name.replace('.json', ''), dummyState, newId);
        } else {
          throw new Error('Invalid session save file format.');
        }

        // Store session
        localStorage.setItem(DATA_PREFIX + meta.id, JSON.stringify(stateData));
        const registry = getAllSavedSessions().filter(s => s.id !== meta.id);
        registry.unshift(meta);
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

        resolve(meta);
      } catch (err: any) {
        reject(new Error(err?.message || 'Failed to parse session file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

/**
 * Automatically creates an autosave slot so players never lose progress.
 */
export function autoSaveSession(state: GameEngineState): void {
  try {
    const autoSaveId = 'session_autosave_slot';
    const autoSaveName = `[Autosave] ${state.currentModule.title.split(':')[0]} (Rnd ${state.currentRound})`;
    saveGameSession(autoSaveName, state, autoSaveId);
  } catch (e) {
    // Fail silently on quota or privacy mode errors
  }
}
