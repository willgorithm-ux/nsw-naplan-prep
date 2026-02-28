// src/storage.js
class StorageInterface {
  async setProfile(profile) {
    localStorage.setItem('naplan:profile', JSON.stringify(profile));
  }
  async getProfile() {
    const data = localStorage.getItem('naplan:profile');
    return data ? JSON.parse(data) : null;
  }

  async setSettings(settings) {
    localStorage.setItem('naplan:settings', JSON.stringify(settings));
  }
  async getSettings() {
    const data = localStorage.getItem('naplan:settings');
    return data ? JSON.parse(data) : this._defaultSettings();
  }

  async setProgress(progress) {
    localStorage.setItem('naplan:progress', JSON.stringify(progress));
  }
  async getProgress() {
    const data = localStorage.getItem('naplan:progress');
    return data ? JSON.parse(data) : this._defaultProgress();
  }

  async setSession(session) {
    localStorage.setItem('naplan:session', JSON.stringify(session));
  }
  async getSession() {
    const data = localStorage.getItem('naplan:session');
    return data ? JSON.parse(data) : null;
  }
  async clearSession() {
    localStorage.removeItem('naplan:session');
  }

  _defaultSettings() {
    return {
      theme: 'space',
      colors: { primary: '#6366F1', secondary: '#EC4899', accent: '#10B981' },
      avatar: 'astronaut-1',
      soundOn: true,
      childName: 'Student',
      defaultMissionSize: 10,
      autoAdvanceSpeed: 5
    };
  }

  async resetProgress() {
    localStorage.removeItem('naplan:progress');
    localStorage.removeItem('naplan:session');
    return this._defaultProgress();
  }

  _defaultProgress() {
    return {
      // Levels per domain (1..5)
      levels: {
        numeracy: 1,
        reading: 1,
        conventions: 1,
        writing: 1
      },
      totalGems: 0,
      createdAt: new Date().toISOString()
    };
  }
}

let storageInstance = null;

export async function initStorage() {
  storageInstance = new StorageInterface();
  globalThis.__NAPLAN_STORAGE__ = storageInstance;
}

export function getStorage() {
  return storageInstance;
}
