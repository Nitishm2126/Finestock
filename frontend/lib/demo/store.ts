/**
 * FineStock Demo Persistence Layer
 * Manages demo data in localStorage for client-side state persistence.
 */

import {
  DEMO_PRODUCTS, DEMO_WAREHOUSES, DEMO_OPERATIONS, DEMO_USERS
} from './data';

const STORAGE_KEYS = {
  PRODUCTS: 'fs_demo_products',
  WAREHOUSES: 'fs_demo_warehouses',
  OPERATIONS: 'fs_demo_operations',
  USERS: 'fs_demo_users',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── Products ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoGetProducts(): any[] {
  return safeGet(STORAGE_KEYS.PRODUCTS, DEMO_PRODUCTS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoCreateProduct(data: any): any {
  const products = demoGetProducts();
  const newP = {
    ...data,
    id: `prod-demo-${Date.now()}`,
    is_active: true,
    current_stock: 0,
    status: 'Healthy',
    category: data.category || { id: 'cat-1', name: data.category_name || 'General' },
    uom: data.uom || { id: 'uom-1', name: data.uom_name || 'Piece' },
  };
  safeSet(STORAGE_KEYS.PRODUCTS, [...products, newP]);
  return newP;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoUpdateProduct(id: string, data: any): any {
  const products = demoGetProducts();
  const updated = products.map(p => p.id === id ? { ...p, ...data } : p);
  safeSet(STORAGE_KEYS.PRODUCTS, updated);
  return updated.find(p => p.id === id);
}

export function demoDeactivateProduct(id: string): void {
  demoUpdateProduct(id, { is_active: false });
}

export function demoDeleteProduct(id: string): void {
  const products = demoGetProducts().filter(p => p.id !== id);
  safeSet(STORAGE_KEYS.PRODUCTS, products);
}

// ── Warehouses ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoGetWarehouses(): any[] {
  return safeGet(STORAGE_KEYS.WAREHOUSES, DEMO_WAREHOUSES);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoCreateWarehouse(data: any): any {
  const warehouses = demoGetWarehouses();
  const newW = { ...data, id: `wh-demo-${Date.now()}`, is_active: true, locations_count: 1, stock_units: 0, utilization: 0, status: 'Healthy' };
  safeSet(STORAGE_KEYS.WAREHOUSES, [...warehouses, newW]);
  return newW;
}

export function demoDeactivateWarehouse(id: string): void {
  const warehouses = demoGetWarehouses().map(w => w.id === id ? { ...w, is_active: false } : w);
  safeSet(STORAGE_KEYS.WAREHOUSES, warehouses);
}

// ── Operations ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoGetOperations(): any[] {
  return safeGet(STORAGE_KEYS.OPERATIONS, DEMO_OPERATIONS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoCreateOperation(data: any): any {
  const ops = demoGetOperations();
  const newOp = {
    ...data,
    id: `OP-DEMO-${Date.now()}`,
    status: 'DRAFT',
    date: new Date().toISOString(),
    created_by: 'Fine Stock Admin',
  };
  safeSet(STORAGE_KEYS.OPERATIONS, [newOp, ...ops]);
  return newOp;
}

export function demoUpdateOperation(id: string, status: string): void {
  const ops = demoGetOperations().map(o => o.id === id ? { ...o, status } : o);
  safeSet(STORAGE_KEYS.OPERATIONS, ops);
}

// ── Users ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoGetUsers(): any[] {
  return safeGet(STORAGE_KEYS.USERS, DEMO_USERS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function demoCreateUser(data: any): any {
  const users = demoGetUsers();
  const newU = {
    ...data,
    id: `usr-demo-${Date.now()}`,
    is_active: true,
    created_at: new Date().toISOString(),
    role: { id: data.role_id || 'role-4', name: data.role_name || 'WAREHOUSE_STAFF', description: 'Warehouse Staff' },
  };
  safeSet(STORAGE_KEYS.USERS, [...users, newU]);
  return newU;
}

export function demoDeactivateUser(id: string): void {
  const users = demoGetUsers().map(u => u.id === id ? { ...u, is_active: false } : u);
  safeSet(STORAGE_KEYS.USERS, users);
}

// ── Reset ─────────────────────────────────────────────────

export function demoResetAll(): void {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}
