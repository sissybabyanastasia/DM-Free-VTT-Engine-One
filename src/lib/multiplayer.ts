import { db, auth } from './firebase';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { GameEngineState, HeroCharacter } from '../types/schema';
import { INITIAL_HERO_PARTY } from '../engine/heroParty';

export interface LobbyPlayer {
  uid: string;
  email: string;
  heroId?: string;
}

export interface Lobby {
  id: string;
  hostId: string;
  name: string;
  moduleId: string;
  status: 'waiting' | 'playing';
  players: LobbyPlayer[];
  playerIds: string[];
  gameState: GameEngineState | null;
  createdAt: number;
  updatedAt: number;
}

const LOBBIES_COLLECTION = 'lobbies';

export async function createLobby(name: string, moduleId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in to create a lobby');

  const lobbyRef = doc(collection(db, LOBBIES_COLLECTION));
  const newLobby: Lobby = {
    id: lobbyRef.id,
    hostId: user.uid,
    name,
    moduleId,
    status: 'waiting',
    players: [{ uid: user.uid, email: user.email || 'Unknown' }],
    playerIds: [user.uid],
    gameState: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await setDoc(lobbyRef, newLobby);
  return lobbyRef.id;
}

export async function joinLobby(lobbyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in to join a lobby');

  const lobbyRef = doc(db, LOBBIES_COLLECTION, lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  
  if (!lobbySnap.exists()) throw new Error('Lobby not found');
  
  const lobbyData = lobbySnap.data() as Lobby;
  
  if (lobbyData.status !== 'waiting') throw new Error('Lobby is already playing');
  if (lobbyData.playerIds.length >= 4 && !lobbyData.playerIds.includes(user.uid)) {
    throw new Error('Lobby is full');
  }

  if (!lobbyData.playerIds.includes(user.uid)) {
    await updateDoc(lobbyRef, {
      players: arrayUnion({ uid: user.uid, email: user.email || 'Unknown' }),
      playerIds: arrayUnion(user.uid),
      updatedAt: Date.now()
    });
  }
}

export async function leaveLobby(lobbyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const lobbyRef = doc(db, LOBBIES_COLLECTION, lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  if (!lobbySnap.exists()) return;

  const lobbyData = lobbySnap.data() as Lobby;
  const player = lobbyData.players.find(p => p.uid === user.uid);
  
  if (player) {
    await updateDoc(lobbyRef, {
      players: arrayRemove(player),
      playerIds: arrayRemove(user.uid),
      updatedAt: Date.now()
    });
  }
  
  // If host left and empty, delete? Or just let it be.
  // Real app: if host leaves, reassign host or delete. We'll just delete if empty.
  const newSnap = await getDoc(lobbyRef);
  if (newSnap.exists() && newSnap.data().playerIds.length === 0) {
    await deleteDoc(lobbyRef);
  }
}

function serializeGameState(state: GameEngineState): any {
  return JSON.parse(JSON.stringify(state, (key, value) => {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  }));
}

export async function startMultiplayerGame(lobbyId: string, initialState: GameEngineState): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const lobbyRef = doc(db, LOBBIES_COLLECTION, lobbyId);
  const lobbySnap = await getDoc(lobbyRef);
  if (!lobbySnap.exists()) throw new Error('Lobby not found');

  const lobbyData = lobbySnap.data() as Lobby;
  if (lobbyData.hostId !== user.uid) throw new Error('Only the host can start the game');

  // Assign heroes to players, rest are prefabs.
  // initialState.heroes already contains INITIAL_HERO_PARTY (4 heroes).
  // We'll just map them.
  const playersWithHeroes = lobbyData.players.map((p, index) => {
    return {
      ...p,
      heroId: initialState.heroes[index]?.id // Assign them one of the heroes sequentially
    };
  });

  await updateDoc(lobbyRef, {
    status: 'playing',
    players: playersWithHeroes,
    gameState: serializeGameState(initialState),
    updatedAt: Date.now()
  });
}

export async function syncGameState(lobbyId: string, state: GameEngineState): Promise<void> {
  const lobbyRef = doc(db, LOBBIES_COLLECTION, lobbyId);
  await updateDoc(lobbyRef, {
    gameState: serializeGameState(state),
    updatedAt: Date.now()
  });
}

export async function fetchLobbyState(lobbyId: string): Promise<Lobby | null> {
  const lobbyRef = doc(db, LOBBIES_COLLECTION, lobbyId);
  const snap = await getDoc(lobbyRef);
  if (!snap.exists()) return null;
  return snap.data() as Lobby;
}

export function subscribeToLobby(lobbyId: string, callback: (lobby: Lobby | null) => void) {
  const lobbyRef = doc(db, LOBBIES_COLLECTION, lobbyId);
  return onSnapshot(lobbyRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as Lobby);
    } else {
      callback(null);
    }
  });
}

export function subscribeToLobbies(callback: (lobbies: Lobby[]) => void) {
  const lobbiesRef = collection(db, LOBBIES_COLLECTION);
  const q = query(lobbiesRef, where('status', '==', 'waiting'));
  return onSnapshot(q, (snapshot) => {
    const lobbies: Lobby[] = [];
    snapshot.forEach(doc => lobbies.push(doc.data() as Lobby));
    callback(lobbies);
  });
}
