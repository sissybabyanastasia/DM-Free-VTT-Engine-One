import { UserAccountProfile, HeroCharacter } from '../types/schema';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'blood_debt_user_account_v1';

const DEFAULT_PROFILE: UserAccountProfile = {
  email: 'guest@tabletop.local',
  createdAt: new Date().toISOString(),
  blood_debt: 0,
  narrative_flags: [],
  permanent_upgrades: [],
  memory_items: []
};

class UserAccountManager {
  private currentProfile: UserAccountProfile = { ...DEFAULT_PROFILE };
  private listeners: Array<(profile: UserAccountProfile) => void> = [];

  constructor() {
    this.loadFromLocalStorage();
    // Listen to Firebase Auth state changes
    if (typeof window !== 'undefined') {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          await this.syncWithFirestore(user.uid, user.email || 'adventurer@tabletop.local');
        } else {
          this.loadFromLocalStorage();
        }
      });
    }
  }

  public subscribe(listener: (profile: UserAccountProfile) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentProfile);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l({ ...this.currentProfile }));
  }

  private loadFromLocalStorage(): UserAccountProfile {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.currentProfile = {
          ...DEFAULT_PROFILE,
          ...parsed,
          blood_debt: typeof parsed.blood_debt === 'number' ? parsed.blood_debt : 0,
          narrative_flags: Array.isArray(parsed.narrative_flags) ? parsed.narrative_flags : [],
          permanent_upgrades: Array.isArray(parsed.permanent_upgrades) ? parsed.permanent_upgrades : [],
          memory_items: Array.isArray(parsed.memory_items) ? parsed.memory_items : []
        };
      } else {
        this.currentProfile = { ...DEFAULT_PROFILE, createdAt: new Date().toISOString() };
        this.saveToLocalStorage();
      }
    } catch (e) {
      console.error('Error loading account from local storage', e);
      this.currentProfile = { ...DEFAULT_PROFILE };
    }
    this.notify();
    return this.currentProfile;
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.currentProfile));
    } catch (e) {
      console.error('Error saving account to local storage', e);
    }
  }

  public async syncWithFirestore(uid: string, email: string): Promise<UserAccountProfile> {
    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        // Merge with local changes (union of flags/upgrades/items and max blood_debt)
        const local = this.currentProfile;
        const merged: UserAccountProfile = {
          email: data.email || email,
          createdAt: data.createdAt || local.createdAt || new Date().toISOString(),
          blood_debt: Math.max(data.blood_debt ?? 0, local.blood_debt ?? 0),
          narrative_flags: Array.from(new Set([...(data.narrative_flags || []), ...(local.narrative_flags || [])])),
          permanent_upgrades: Array.from(new Set([...(data.permanent_upgrades || []), ...(local.permanent_upgrades || [])])),
          memory_items: Array.from(new Set([...(data.memory_items || []), ...(local.memory_items || [])]))
        };

        this.currentProfile = merged;
        this.saveToLocalStorage();

        // Update Firestore with synced state
        await setDoc(userRef, merged, { merge: true });
      } else {
        // Create initial profile in Firestore
        const newProfile: UserAccountProfile = {
          ...this.currentProfile,
          email,
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newProfile);
        this.currentProfile = newProfile;
        this.saveToLocalStorage();
      }
    } catch (err) {
      console.error('Failed to sync user account with Firestore:', err);
    }

    this.notify();
    return this.currentProfile;
  }

  public getProfile(): UserAccountProfile {
    return { ...this.currentProfile };
  }

  public async updateProfile(updates: Partial<UserAccountProfile>): Promise<UserAccountProfile> {
    this.currentProfile = {
      ...this.currentProfile,
      ...updates
    };
    this.saveToLocalStorage();

    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, updates);
      } catch (err) {
        console.error('Failed to update Firestore profile:', err);
      }
    }

    this.notify();
    return this.currentProfile;
  }

  /**
   * Enforce Death Penalty & Retention Rules:
   * When the player dies:
   * - Gold earned this run is halved
   * - blood_debt increases by 1
   * - permanent upgrades and narrative items are retained!
   */
  public async handlePlayerDeath(goldEarnedThisRun: number): Promise<{
    originalGold: number;
    halvedGold: number;
    lostGold: number;
    newBloodDebt: number;
  }> {
    const originalGold = Math.max(0, goldEarnedThisRun);
    const halvedGold = Math.floor(originalGold / 2);
    const lostGold = originalGold - halvedGold;
    const newBloodDebt = (this.currentProfile.blood_debt || 0) + 1;

    await this.updateProfile({
      blood_debt: newBloodDebt
      // Note: permanent_upgrades and memory_items are NOT wiped; they are retained!
    });

    return {
      originalGold,
      halvedGold,
      lostGold,
      newBloodDebt
    };
  }

  public async addNarrativeFlag(flag: string): Promise<void> {
    if (!this.currentProfile.narrative_flags.includes(flag)) {
      const updated = [...this.currentProfile.narrative_flags, flag];
      await this.updateProfile({ narrative_flags: updated });
    }
  }

  public async addPermanentUpgrade(upgradeId: string): Promise<void> {
    if (!this.currentProfile.permanent_upgrades.includes(upgradeId)) {
      const updated = [...this.currentProfile.permanent_upgrades, upgradeId];
      await this.updateProfile({ permanent_upgrades: updated });
    }
  }

  public async addMemoryItem(itemId: string): Promise<void> {
    if (!this.currentProfile.memory_items.includes(itemId)) {
      const updated = [...this.currentProfile.memory_items, itemId];
      await this.updateProfile({ memory_items: updated });
    }
  }

  public hasNarrativeFlag(flag: string): boolean {
    return this.currentProfile.narrative_flags.includes(flag);
  }

  public hasPermanentUpgrade(upgradeId: string): boolean {
    return this.currentProfile.permanent_upgrades.includes(upgradeId);
  }

  public hasMemoryItem(itemId: string): boolean {
    return this.currentProfile.memory_items.includes(itemId);
  }

  /**
   * Applies all purchased permanent upgrades to hero stats
   */
  public applyPermanentUpgrades(heroes: HeroCharacter[]): void {
    const upgrades = this.currentProfile.permanent_upgrades || [];
    if (upgrades.length === 0) return;

    heroes.forEach(hero => {
      if (upgrades.includes('perm_blood_plating')) {
        hero.ac += 2;
      }
      if (upgrades.includes('perm_ancient_vitality')) {
        hero.maxHp += 10;
        hero.hp = Math.min(hero.maxHp, hero.hp + 10);
      }
      if (upgrades.includes('perm_fleetfoot_boon')) {
        hero.speed += 1;
      }
      if (upgrades.includes('perm_battle_focus')) {
        hero.weapons.forEach(w => {
          w.attackBonus += 1;
        });
      }
    });
  }
}

export const userAccountManager = new UserAccountManager();
