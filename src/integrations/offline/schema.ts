/** Relationship + default-value metadata used by the offline query engine. */

type FkMap = Record<string, { column: string; target: string }[]>;

export const FOREIGN_KEYS: FkMap = {
  inventory: [
    { column: 'product_id', target: 'products' },
    { column: 'location_id', target: 'locations' },
    { column: 'status_id', target: 'inventory_statuses' },
  ],
  movements: [
    { column: 'product_id', target: 'products' },
    { column: 'from_location_id', target: 'locations' },
    { column: 'to_location_id', target: 'locations' },
  ],
  nonconformities: [
    { column: 'product_id', target: 'products' },
    { column: 'location_id', target: 'locations' },
  ],
  count_items: [
    { column: 'count_id', target: 'inventory_counts' },
    { column: 'product_id', target: 'products' },
    { column: 'location_id', target: 'locations' },
  ],
  damages: [{ column: 'product_id', target: 'products' }],
  damage_photos: [{ column: 'damage_id', target: 'damages' }],
  tasks: [{ column: 'status_id', target: 'task_statuses' }],
};

/** Column used as the join key on the target table (defaults to `id`). */
export const TARGET_KEY: Record<string, string> = {
  profiles: 'user_id',
};

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

/** Column defaults mirroring the cloud schema so inserts never miss NOT NULL data. */
export const DEFAULTS: Record<string, () => Record<string, any>> = {
  profiles: () => ({ full_name: 'Usuário', approved: false, is_admin: false, role: 'user', created_at: now(), updated_at: now() }),
  user_roles: () => ({ created_at: now() }),
  products: () => ({ active: true, created_at: now(), updated_at: now() }),
  locations: () => ({ active: true, created_at: now() }),
  inventory: () => ({ quantity: 0, received_at: now(), updated_at: now() }),
  inventory_statuses: () => ({ color: '#6b7280', active: true, position: 0, created_at: now() }),
  movements: () => ({ quantity: 0, created_at: now() }),
  nonconformities: () => ({ status: 'aberta', created_at: now(), updated_at: now() }),
  inventory_counts: () => ({ count_date: today(), count_type: 'diario', created_at: now() }),
  count_items: () => ({ quantity: 0, created_at: now() }),
  tasks: () => ({ priority: 'media', position: 0, created_at: now(), updated_at: now() }),
  task_statuses: () => ({ color: '#6b7280', position: 0, created_at: now() }),
  damages: () => ({ quantity: 0, material_type: 'PAV', damage_date: today(), sold: false, created_at: now(), updated_at: now() }),
  damage_photos: () => ({ created_at: now() }),
};

export const defaultsFor = (table: string): Record<string, any> =>
  DEFAULTS[table] ? DEFAULTS[table]() : { created_at: now() };
