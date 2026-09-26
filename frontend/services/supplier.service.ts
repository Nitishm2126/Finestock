const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Supplier {
  id: string;
  organization_id?: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time_days: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const DEMO_STORAGE_KEY = 'fs_demo_suppliers';

const DEFAULT_DEMO_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-demo-01',
    name: 'Apex Semiconductor Corp',
    code: 'SUP-APEX',
    email: 'orders@apexsemi.com',
    phone: '+1 555-019-2831',
    address: '450 Silicon Way, San Jose, CA',
    lead_time_days: 7,
    is_active: true,
    notes: 'Primary component vendor for SoC and microcontrollers',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'sup-demo-02',
    name: 'Global Display Solutions',
    code: 'SUP-GDS',
    email: 'supply@globaldisplays.com',
    phone: '+1 555-082-1922',
    address: '102 Industrial Blvd, Austin, TX',
    lead_time_days: 12,
    is_active: true,
    notes: 'OLED panels and display controllers',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'sup-demo-03',
    name: 'Precision Packaging Ltd',
    code: 'SUP-PPL',
    email: 'sales@precisionpack.com',
    phone: '+1 555-034-7711',
    address: '88 Logistics Parkway, Chicago, IL',
    lead_time_days: 3,
    is_active: true,
    notes: 'Anti-static boxes and thermal buffer material',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

function getDemoSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_SUPPLIERS));
      return DEFAULT_DEMO_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_SUPPLIERS;
  }
}

function saveDemoSuppliers(suppliers: Supplier[]) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(suppliers));
  } catch {}
}

export async function fetchSuppliers(
  token?: string,
  params?: { search?: string; is_active?: boolean }
): Promise<Supplier[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    let list = getDemoSuppliers();
    if (params?.search) {
      const s = params.search.toLowerCase();
      list = list.filter(
        sup =>
          sup.name.toLowerCase().includes(s) ||
          sup.code.toLowerCase().includes(s) ||
          (sup.email && sup.email.toLowerCase().includes(s))
      );
    }
    if (params?.is_active !== undefined) {
      list = list.filter(sup => sup.is_active === params.is_active);
    }
    return list;
  }

  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.is_active !== undefined) queryParams.set('is_active', String(params.is_active));

  const res = await fetch(`${API_BASE_URL}/suppliers/?${queryParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  const data = await res.json();
  return data.suppliers;
}

export async function createSupplier(
  arg1?: any,
  arg2?: any
): Promise<Supplier> {
  const token = (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) ? arg1 : (typeof arg2 === 'string' ? arg2 : undefined);
  const payload = typeof arg1 === 'object' ? arg1 : arg2;

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoSuppliers();
    const newSup: Supplier = {
      ...payload,
      id: `sup-demo-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveDemoSuppliers([...list, newSup]);
    return newSup;
  }

  const res = await fetch(`${API_BASE_URL}/suppliers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create supplier');
  }
  return res.json();
}

export async function updateSupplier(
  arg1?: any,
  arg2?: any,
  arg3?: any
): Promise<Supplier> {
  let token: string | undefined;
  let supplierId: string;
  let payload: Partial<Supplier>;

  if (typeof arg1 === 'string' && (arg1.startsWith('eyJ') || arg1.length > 50)) {
    token = arg1;
    supplierId = arg2;
    payload = arg3;
  } else {
    supplierId = arg1;
    payload = arg2;
    token = arg3;
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !token) {
    const list = getDemoSuppliers();
    const updated = list.map(s =>
      s.id === supplierId ? { ...s, ...payload, updated_at: new Date().toISOString() } : s
    );
    saveDemoSuppliers(updated);
    const found = updated.find(s => s.id === supplierId);
    if (!found) throw new Error('Supplier not found');
    return found;
  }

  const res = await fetch(`${API_BASE_URL}/suppliers/${supplierId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update supplier');
  }
  return res.json();
}

export async function toggleSupplierStatus(
  supplierId: string,
  is_active: boolean,
  token?: string
): Promise<Supplier> {
  return updateSupplier(supplierId, { is_active }, token);
}


