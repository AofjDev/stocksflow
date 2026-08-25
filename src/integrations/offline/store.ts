/**
 * Local persistent store for the offline WMS.
 *
 * - In Electron the whole database is written to a JSON file inside the user data
 *   folder (via the `wmsLocal` bridge exposed by the preload script), so every
 *   transaction survives closing the app, restarting the PC, etc.
 * - In a plain browser it falls back to IndexedDB (with localStorage as a last
 *   resort), which is also persistent.
 */

export type Row = Record<string, any>;
export type Database = Record<string, Row[]>;

export const TABLES = [
  'profiles',
  'user_roles',
  'products',
  'locations',
  'inventory',
  'inventory_statuses',
  'movements',
  'nonconformities',
  'inventory_counts',
  'count_items',
  'tasks',
  'task_statuses',
  'damages',
  'damage_photos',
  // internal
  '_users',
  '_storage',
] as const;

declare global {
  interface Window {
    wmsLocal?: {
      load: () => Promise<string | null>;
      save: (json: string) => Promise<void>;
      dataPath: () => Promise<string>;
    };
  }
}

const IDB_NAME = 'stockflow-offline';
const IDB_STORE = 'kv';
const IDB_KEY = 'database';
const LS_KEY = 'stockflow-offline-db';

const emptyDb = (): Database => {
  const db: Database = {};
  for (const t of TABLES) db[t] = [];
  return db;
};

function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet(): Promise<string | null> {
  const d = await idb();
  if (!d) return null;
  return new Promise((resolve) => {
    const tx = d.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet(json: string): Promise<boolean> {
  const d = await idb();
  if (!d) return false;
  return new Promise((resolve) => {
    const tx = d.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(json, IDB_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

class LocalStore {
  db: Database = emptyDb();
  private loaded = false;
  private loading: Promise<void> | null = null;
  private saveTimer: any = null;
  private saving: Promise<void> = Promise.resolve();

  ready(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (!this.loading) this.loading = this.load();
    return this.loading;
  }

  private async load() {
    let raw: string | null = null;
    try {
      if (window.wmsLocal) raw = await window.wmsLocal.load();
      else raw = (await idbGet()) ?? localStorage.getItem(LS_KEY);
    } catch (e) {
      console.error('[offline] falha ao carregar banco local', e);
    }

    const base = emptyDb();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Database;
        for (const t of TABLES) if (Array.isArray(parsed[t])) base[t] = parsed[t];
      } catch (e) {
        console.error('[offline] banco local corrompido, iniciando vazio', e);
      }
    }
    this.db = base;
    this.loaded = true;
    this.seed();
  }

  /** Default statuses so the app is usable on a fresh install. */
  private seed() {
    let changed = false;
    if (this.db.task_statuses.length === 0) {
      const defaults = [
        { name: 'A Fazer', color: '#6b7280' },
        { name: 'Em Andamento', color: '#f59e0b' },
        { name: 'Concluído', color: '#22c55e' },
      ];
      defaults.forEach((s, i) => {
        this.db.task_statuses.push({
          id: uuid(),
          name: s.name,
          color: s.color,
          position: i,
          created_at: new Date().toISOString(),
        });
      });
      changed = true;
    }
    if (this.db.inventory_statuses.length === 0) {
      const defaults = [
        { name: 'Disponível', color: '#22c55e' },
        { name: 'Carregando', color: '#f59e0b' },
        { name: 'Bloqueado', color: '#ef4444' },
      ];
      defaults.forEach((s, i) => {
        this.db.inventory_statuses.push({
          id: uuid(),
          name: s.name,
          color: s.color,
          active: true,
          position: i,
          created_at: new Date().toISOString(),
        });
      });
      changed = true;
    }
    if (changed) this.persist();
  }

  table(name: string): Row[] {
    if (!this.db[name]) this.db[name] = [];
    return this.db[name];
  }

  /** Debounced write-through persistence. */
  persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, 250);
  }

  async flush(): Promise<void> {
    const json = JSON.stringify(this.db);
    this.saving = this.saving.then(async () => {
      try {
        if (window.wmsLocal) await window.wmsLocal.save(json);
        else if (!(await idbSet(json))) localStorage.setItem(LS_KEY, json);
      } catch (e) {
        console.error('[offline] falha ao salvar banco local', e);
      }
    });
    return this.saving;
  }

  exportJson(): string {
    return JSON.stringify(this.db, null, 2);
  }

  async importJson(json: string) {
    const parsed = JSON.parse(json) as Database;
    const base = emptyDb();
    for (const t of TABLES) if (Array.isArray(parsed[t])) base[t] = parsed[t];
    this.db = base;
    await this.flush();
  }
}

export const uuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const store = new LocalStore();

// Best-effort flush when the window closes.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    void store.flush();
  });
}
