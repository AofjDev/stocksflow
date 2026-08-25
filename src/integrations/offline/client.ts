/**
 * Offline drop-in replacement for the Supabase client.
 *
 * Exposes the same surface the app uses (`from()`, `auth`, `storage`, `rpc`,
 * `functions`) but reads and writes a persistent local database — no internet
 * required. Aliased over `@/integrations/supabase/client` when the app is built
 * with VITE_OFFLINE=true.
 */
import { store, uuid, type Row } from './store';
import { FOREIGN_KEYS, TARGET_KEY, defaultsFor } from './schema';

type Result<T> = { data: T; error: any; count?: number | null };

const ok = <T>(data: T): Result<T> => ({ data, error: null });
const fail = (message: string): Result<null> => ({ data: null, error: { message } });

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/* ------------------------------------------------------------------ */
/* select() parsing                                                    */
/* ------------------------------------------------------------------ */

type Embed = { key: string; table: string; fkHint?: string; inner: boolean; select: string };
type Parsed = { columns: string[]; all: boolean; embeds: Embed[] };

const splitTopLevel = (input: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const parseSelect = (select: string): Parsed => {
  const parsed: Parsed = { columns: [], all: false, embeds: [] };
  for (const part of splitTopLevel(select || '*')) {
    const open = part.indexOf('(');
    if (open === -1) {
      if (part === '*') parsed.all = true;
      else parsed.columns.push(part.split(':').pop()!.trim());
      continue;
    }
    const head = part.slice(0, open).trim();
    const body = part.slice(open + 1, part.lastIndexOf(')'));
    let alias: string | undefined;
    let target = head;
    if (target.includes(':')) {
      const [a, rest] = target.split(':');
      alias = a.trim();
      target = rest.trim();
    }
    let inner = false;
    if (target.includes('!')) {
      const bits = target.split('!');
      target = bits[0].trim();
      const modifiers = bits.slice(1).map((m) => m.trim());
      inner = modifiers.includes('inner');
      const hint = modifiers.find((m) => m !== 'inner' && m !== 'left');
      parsed.embeds.push({ key: alias || target, table: target, fkHint: hint, inner, select: body });
      continue;
    }
    parsed.embeds.push({ key: alias || target, table: target, inner, select: body });
  }
  return parsed;
};

const project = (row: Row, parsed: Parsed): Row => {
  if (parsed.all || parsed.columns.length === 0) return { ...row };
  const out: Row = {};
  for (const c of parsed.columns) if (c in row) out[c] = row[c];
  return out;
};

/** Resolves embedded relations (both many-to-one and one-to-many). */
const resolveEmbeds = (table: string, rows: Row[], parsed: Parsed): Row[] => {
  let result = rows;
  for (const embed of parsed.embeds) {
    const childParsed = parseSelect(embed.select);
    const fks = FOREIGN_KEYS[table] || [];
    let fkColumn: string | undefined;

    if (embed.fkHint) {
      const match = fks.find((f) => embed.fkHint!.includes(f.column));
      fkColumn = match?.column;
    }
    if (!fkColumn) {
      const candidates = fks.filter((f) => f.target === embed.table);
      if (candidates.length === 1) fkColumn = candidates[0].column;
      else if (candidates.length > 1) {
        const byKey = candidates.find((c) => c.column.startsWith(embed.key));
        fkColumn = (byKey || candidates[0]).column;
      }
    }

    if (fkColumn) {
      // many-to-one
      const targetTable = fks.find((f) => f.column === fkColumn)!.target;
      const key = TARGET_KEY[targetTable] || 'id';
      const index = new Map(store.table(targetTable).map((r) => [r[key], r]));
      const next: Row[] = [];
      for (const row of result) {
        const related = row[fkColumn] != null ? index.get(row[fkColumn]) : null;
        if (embed.inner && !related) continue;
        next.push({ ...row, [embed.key]: related ? project(related, childParsed) : null });
      }
      result = next;
    } else {
      // one-to-many (child table points back at us)
      const childFk = (FOREIGN_KEYS[embed.table] || []).find((f) => f.target === table);
      const childRows = store.table(embed.table);
      const next: Row[] = [];
      for (const row of result) {
        const children = childFk ? childRows.filter((c) => c[childFk.column] === row.id) : [];
        if (embed.inner && children.length === 0) continue;
        next.push({ ...row, [embed.key]: children.map((c) => project(c, childParsed)) });
      }
      result = next;
    }
  }
  return result;
};

/* ------------------------------------------------------------------ */
/* Query builder                                                       */
/* ------------------------------------------------------------------ */

type Filter = (row: Row) => boolean;

class QueryBuilder<T = any> implements PromiseLike<Result<T>> {
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private selectStr: string | null = null;
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Row[] = [];
  private single: false | 'one' | 'maybe' = false;

  constructor(private tableName: string) {}

  /* filters */
  eq(column: string, value: any) {
    this.filters.push((r) => r[column] === value);
    return this;
  }
  neq(column: string, value: any) {
    this.filters.push((r) => r[column] !== value);
    return this;
  }
  gt(column: string, value: any) {
    this.filters.push((r) => r[column] > value);
    return this;
  }
  gte(column: string, value: any) {
    this.filters.push((r) => r[column] >= value);
    return this;
  }
  lt(column: string, value: any) {
    this.filters.push((r) => r[column] < value);
    return this;
  }
  lte(column: string, value: any) {
    this.filters.push((r) => r[column] <= value);
    return this;
  }
  in(column: string, values: any[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }
  is(column: string, value: any) {
    this.filters.push((r) => (value === null ? r[column] == null : r[column] === value));
    return this;
  }
  not(column: string, _op: string, value: any) {
    this.filters.push((r) => (value === null ? r[column] != null : r[column] !== value));
    return this;
  }
  ilike(column: string, pattern: string) {
    const rx = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i');
    this.filters.push((r) => rx.test(String(r[column] ?? '')));
    return this;
  }
  like(column: string, pattern: string) {
    return this.ilike(column, pattern);
  }

  /* modifiers */
  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitCount = n;
    return this;
  }
  range(from: number, to: number) {
    this.limitCount = to - from + 1;
    return this;
  }
  maybeSingle() {
    this.single = 'maybe';
    return this;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returns() {
    return this as any;
  }

  /* mutations */
  select(select = '*') {
    this.selectStr = select;
    return this;
  }
  insert(values: Row | Row[]) {
    this.mode = 'insert';
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Row | Row[]) {
    this.mode = 'upsert';
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: Row) {
    this.mode = 'update';
    this.payload = [values];
    return this;
  }
  delete() {
    this.mode = 'delete';
    return this;
  }

  private matches(row: Row) {
    return this.filters.every((f) => f(row));
  }

  private finalize(rows: Row[]): Result<any> {
    const parsed = parseSelect(this.selectStr ?? '*');
    let out = resolveEmbeds(this.tableName, rows, parsed);

    for (const o of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const av = a[o.column];
        const bv = b[o.column];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av > bv ? 1 : -1;
        return o.ascending ? cmp : -cmp;
      });
    }
    if (this.limitCount != null) out = out.slice(0, this.limitCount);

    out = out.map((r) => {
      const projected = project(r, parsed);
      for (const e of parsed.embeds) projected[e.key] = r[e.key];
      return clone(projected);
    });

    if (this.single) {
      if (out.length === 0) {
        return this.single === 'one'
          ? { data: null, error: { message: 'Nenhum registro encontrado' } }
          : ok(null);
      }
      return ok(out[0]);
    }
    return { ...ok(out), count: out.length };
  }

  private async run(): Promise<Result<any>> {
    await store.ready();
    const rows = store.table(this.tableName);

    if (this.mode === 'select') return this.finalize(rows.filter((r) => this.matches(r)));

    if (this.mode === 'insert' || this.mode === 'upsert') {
      const inserted: Row[] = [];
      for (const value of this.payload) {
        const existingIdx =
          this.mode === 'upsert' && value.id ? rows.findIndex((r) => r.id === value.id) : -1;
        if (existingIdx >= 0) {
          rows[existingIdx] = { ...rows[existingIdx], ...clone(value), updated_at: new Date().toISOString() };
          inserted.push(rows[existingIdx]);
        } else {
          const row: Row = { id: value.id || uuid(), ...defaultsFor(this.tableName), ...clone(value) };
          if (!row.id) row.id = uuid();
          rows.push(row);
          inserted.push(row);
        }
      }
      store.persist();
      await store.flush();
      return this.selectStr ? this.finalize(inserted) : ok(this.single ? inserted[0] ?? null : inserted);
    }

    if (this.mode === 'update') {
      const updated: Row[] = [];
      rows.forEach((row, i) => {
        if (!this.matches(row)) return;
        rows[i] = { ...row, ...clone(this.payload[0]) };
        updated.push(rows[i]);
      });
      store.persist();
      await store.flush();
      return this.selectStr ? this.finalize(updated) : ok(this.single ? updated[0] ?? null : updated);
    }

    // delete
    const removed = rows.filter((r) => this.matches(r));
    const kept = rows.filter((r) => !this.matches(r));
    store.db[this.tableName] = kept;
    store.persist();
    await store.flush();
    return this.selectStr ? this.finalize(removed) : ok(removed);
  }

  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled as any, onrejected as any);
  }
}

// `single()` needs to keep the fluent chain; declared here to avoid TS overload noise.
(QueryBuilder.prototype as any).single = function single() {
  this.single = 'one';
  return this;
};

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

const SESSION_KEY = 'stockflow-offline-session';

const hash = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(`stockflow::${text}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

type LocalUser = { id: string; email: string; password: string; full_name: string; created_at: string };

const toAuthUser = (u: LocalUser) => ({
  id: u.id,
  email: u.email,
  created_at: u.created_at,
  app_metadata: {},
  user_metadata: { full_name: u.full_name },
  aud: 'authenticated',
});

const makeSession = (u: LocalUser) => ({
  access_token: `offline-${u.id}`,
  refresh_token: `offline-${u.id}`,
  token_type: 'bearer',
  expires_in: 315360000,
  expires_at: Math.floor(Date.now() / 1000) + 315360000,
  user: toAuthUser(u),
});

type Listener = (event: string, session: any) => void;
const listeners = new Set<Listener>();

const readSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeSession = (session: any) => {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  listeners.forEach((l) => l(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
};

/** Mirrors the cloud `handle_new_user` trigger: first account becomes admin. */
const createProfileFor = (user: LocalUser) => {
  const profiles = store.table('profiles');
  if (profiles.some((p) => p.user_id === user.id)) return;
  const first = profiles.length === 0;
  profiles.push({
    id: uuid(),
    user_id: user.id,
    full_name: user.full_name,
    approved: first,
    is_admin: first,
    role: first ? 'admin' : 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  store.table('user_roles').push({
    id: uuid(),
    user_id: user.id,
    role: first ? 'admin' : 'user',
    created_at: new Date().toISOString(),
  });
  store.persist();
};

const auth = {
  async getSession() {
    await store.ready();
    return ok({ session: readSession() });
  },
  async getUser() {
    await store.ready();
    const session = readSession();
    return ok({ user: session?.user ?? null });
  },
  onAuthStateChange(callback: Listener) {
    listeners.add(callback);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
    await store.ready();
    const normalized = String(email).trim().toLowerCase();
    const users = store.table('_users') as LocalUser[];
    if (users.some((u) => u.email === normalized)) return fail('Este e-mail já está cadastrado.');
    if (!password || password.length < 6) return fail('A senha deve ter no mínimo 6 caracteres.');

    const user: LocalUser = {
      id: uuid(),
      email: normalized,
      password: await hash(password),
      full_name: options?.data?.full_name || normalized.split('@')[0],
      created_at: new Date().toISOString(),
    };
    users.push(user);
    createProfileFor(user);
    await store.flush();

    const session = makeSession(user);
    writeSession(session);
    return ok({ user: toAuthUser(user), session });
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    await store.ready();
    const normalized = String(email).trim().toLowerCase();
    const users = store.table('_users') as LocalUser[];
    const user = users.find((u) => u.email === normalized);
    if (!user) return fail('E-mail ou senha inválidos.');
    if (user.password !== (await hash(password))) return fail('E-mail ou senha inválidos.');
    const session = makeSession(user);
    writeSession(session);
    return ok({ user: toAuthUser(user), session });
  },
  async signOut() {
    writeSession(null);
    return { error: null };
  },
  async updateUser({ password, data }: { password?: string; data?: any }) {
    await store.ready();
    const session = readSession();
    if (!session) return fail('Nenhuma sessão ativa.');
    const users = store.table('_users') as LocalUser[];
    const user = users.find((u) => u.id === session.user.id);
    if (!user) return fail('Usuário não encontrado.');
    if (password) user.password = await hash(password);
    if (data?.full_name) user.full_name = data.full_name;
    await store.flush();
    return ok({ user: toAuthUser(user) });
  },
  async resetPasswordForEmail() {
    return fail('No modo offline a senha é redefinida pelo administrador na tela de Usuários.');
  },
  async setSession(session: any) {
    writeSession(session);
    return ok({ session });
  },
  admin: {
    async deleteUser(userId: string) {
      await store.ready();
      store.db._users = store.table('_users').filter((u) => u.id !== userId);
      store.db.profiles = store.table('profiles').filter((p) => p.user_id !== userId);
      store.db.user_roles = store.table('user_roles').filter((r) => r.user_id !== userId);
      await store.flush();
      return { data: null, error: null };
    },
  },
};

/* ------------------------------------------------------------------ */
/* Storage (photos are kept as data URLs inside the local database)    */
/* ------------------------------------------------------------------ */

const fileToDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const storage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: Blob) {
        await store.ready();
        try {
          const data = await fileToDataUrl(file);
          const files = store.table('_storage');
          const key = `${bucket}/${path}`;
          const existing = files.findIndex((f) => f.key === key);
          const row = { id: uuid(), key, data, created_at: new Date().toISOString() };
          if (existing >= 0) files[existing] = row;
          else files.push(row);
          await store.flush();
          return ok({ path });
        } catch (e: any) {
          return fail(e?.message || 'Falha ao salvar a imagem localmente.');
        }
      },
      getPublicUrl(path: string) {
        const key = `${bucket}/${path}`;
        const found = store.table('_storage').find((f) => f.key === key);
        return { data: { publicUrl: found?.data || '' } };
      },
      async remove(paths: string[]) {
        await store.ready();
        const keys = paths.map((p) => `${bucket}/${p}`);
        store.db._storage = store.table('_storage').filter((f) => !keys.includes(f.key));
        await store.flush();
        return { data: null, error: null };
      },
      async download(path: string) {
        const url = this.getPublicUrl(path).data.publicUrl;
        if (!url) return fail('Arquivo não encontrado.');
        const res = await fetch(url);
        return ok(await res.blob());
      },
    };
  },
};

/* ------------------------------------------------------------------ */
/* rpc / functions                                                     */
/* ------------------------------------------------------------------ */

const rpc = async (name: string, params?: Record<string, any>) => {
  await store.ready();
  if (name === 'bootstrap_current_user') {
    const session = readSession();
    if (!session) return fail('Não autenticado');
    const users = store.table('_users') as LocalUser[];
    const user = users.find((u) => u.id === session.user.id);
    if (user) {
      if (params?._full_name) user.full_name = params._full_name;
      createProfileFor(user);
      await store.flush();
    }
    return ok(null);
  }
  if (name === 'has_role') {
    const rows = store.table('user_roles');
    return ok(rows.some((r) => r.user_id === params?._user_id && r.role === params?._role));
  }
  return fail(`Função "${name}" não está disponível no modo offline.`);
};

const functions = {
  async invoke(name: string) {
    return fail(`A função "${name}" exige internet e está desativada no modo offline.`);
  },
};

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  auth,
  storage,
  rpc,
  functions,
  /** Offline-only helpers (backup / restore). */
  local: {
    export: () => store.exportJson(),
    import: (json: string) => store.importJson(json),
    flush: () => store.flush(),
    dataPath: () => window.wmsLocal?.dataPath?.() ?? Promise.resolve('navegador (IndexedDB)'),
  },
};

export default supabase;
