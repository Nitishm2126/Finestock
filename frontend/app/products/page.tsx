'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge, MetricCard, EmptyState } from '@/components/ui/UI';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { useToast } from '@/lib/ui/ToastProvider';
import { Package, Plus, Search, Filter, Upload, Download, X, ChevronDown } from 'lucide-react';
import { demoGetProducts, demoCreateProduct, demoDeactivateProduct, demoDeleteProduct } from '@/lib/demo/store';
import { fetchProducts } from '@/services/product.service';
import { DEMO_CATEGORIES, DEMO_UOMS } from '@/lib/demo/data';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Product = any;

export default function ProductsPage() {
  const router = useRouter();
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category_id: 'cat-1', uom_id: 'uom-1', reorder_point: 10, reorder_quantity: 50 });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo) {
        setProducts(demoGetProducts());
      } else {
        const data = await fetchProducts(token!);
        setProducts(data);
      }
    } catch {
      toast.error('Unable to load products', 'Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { if (isAuthenticated) loadProducts(); }, [isAuthenticated, loadProducts]);

  const filtered = products.filter(p => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter || (statusFilter === 'Active' && p.is_active);
    return matchSearch && matchStatus;
  });

  const handleCreate = async () => {
    setFormLoading(true);
    try {
      const cat = DEMO_CATEGORIES.find(c => c.id === form.category_id);
      const uom = DEMO_UOMS.find(u => u.id === form.uom_id);
      if (isDemo) {
        demoCreateProduct({ ...form, category: cat, uom, category_name: cat?.name, uom_name: uom?.name });
        toast.success('Product created', `${form.name} added to catalog.`);
        setCreateOpen(false);
        setForm({ name: '', sku: '', category_id: 'cat-1', uom_id: 'uom-1', reorder_point: 10, reorder_quantity: 50 });
        loadProducts();
      }
    } catch {
      toast.error('Failed to create product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeactivate = (p: Product) => {
    if (isDemo) {
      demoDeactivateProduct(p.id);
      toast.success('Product deactivated', `${p.name} has been deactivated.`);
      loadProducts();
    }
  };

  const handleDelete = (p: Product) => {
    if (isDemo) {
      demoDeleteProduct(p.id);
      toast.success('Product deleted', `${p.name} has been removed.`);
      setConfirmDelete(null);
      loadProducts();
    }
  };

  const exportCSV = () => {
    const rows = [['SKU', 'Name', 'Category', 'UOM', 'Current Stock', 'Reorder Point', 'Status']];
    filtered.forEach(p => rows.push([p.sku, p.name, p.category?.name, p.uom?.name, p.current_stock ?? '', p.reorder_point, p.status || (p.is_active ? 'Active' : 'Inactive')]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete', 'products.csv downloaded.');
  };

  const statusOptions = ['All', 'Healthy', 'Low Stock', 'Critical'];

  if (authLoading) return null;

  return (
    <AppShell title="Products">
      <div className="fs-page-inner space-y-6">

        {/* Page Header */}
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Inventory / Products</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Product Catalog</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage SKUs, stock thresholds and inventory classification.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="fs-btn-secondary" onClick={exportCSV}><Download className="h-4 w-4" /> Export</button>
              <button className="fs-btn-secondary"><Upload className="h-4 w-4" /> Import</button>
              <button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Product</button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Products" value={products.length} subValue="In catalog" />
          <MetricCard label="Active" value={products.filter(p => p.is_active).length} color="success" />
          <MetricCard label="Low Stock" value={products.filter(p => p.status === 'Low Stock').length} color="warning" />
          <MetricCard label="Critical" value={products.filter(p => p.status === 'Critical').length} color="danger" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name or SKU…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="fs-input pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="fs-btn-secondary"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter className="h-4 w-4" />
                {statusFilter !== 'All' && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primary)', color: '#fff' }}>1</span>}
                <span>Filters</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {filterOpen && (
                <div className="fs-dropdown" style={{ right: 0, left: 'auto' }}>
                  <p className="text-xs font-semibold px-3 py-1.5" style={{ color: 'var(--text-muted)' }}>Status</p>
                  {statusOptions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setStatusFilter(s); setFilterOpen(false); }}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${statusFilter === s ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]'}`}
                    >
                      {s}
                    </button>
                  ))}
                  <div className="border-t mt-1 pt-1" style={{ borderColor: 'var(--border)' }}>
                    <button onClick={() => { setStatusFilter('All'); setFilterOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]">
                      <X className="h-3.5 w-3.5" /> Clear filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="fs-surface overflow-hidden">
          {loading ? (
            <div className="p-12 text-center" style={{ color: 'var(--text-muted)' }}>Loading products…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Package className="h-10 w-10" />} title="No products found" description="Add your first product to get started." action={<button className="fs-btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Product</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>UOM</th>
                    <th className="text-right">Stock</th>
                    <th className="text-right">Reorder</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id}>
                      <td>
                        <button className="text-left" onClick={() => { setSelectedProduct(p); setDrawerOpen(true); }}>
                          <p className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.category?.name}</p>
                        </button>
                      </td>
                      <td><span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>{p.sku}</span></td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--surface-muted)', color: 'var(--text-secondary)' }}>
                          {p.category?.name || 'N/A'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.uom?.name || 'N/A'}</td>
                      <td className="text-right">
                        <span className="font-semibold" style={{ color: (p.current_stock ?? 0) <= p.reorder_point ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {p.current_stock ?? 0}
                        </span>
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-secondary)' }}>{p.reorder_point}</td>
                      <td><StatusBadge status={p.status || (p.is_active ? 'Active' : 'Inactive')} size="sm" /></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { setSelectedProduct(p); setDrawerOpen(true); }}>View</button>
                          {p.is_active && <button className="fs-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDeactivate(p)}>Deactivate</button>}
                          <button className="fs-btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setConfirmDelete(p)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedProduct?.name || ''} subtitle={selectedProduct?.sku}>
        {selectedProduct && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'SKU', value: selectedProduct.sku },
                { label: 'Status', value: selectedProduct.status || 'Active' },
                { label: 'Category', value: selectedProduct.category?.name },
                { label: 'UOM', value: selectedProduct.uom?.name },
                { label: 'Current Stock', value: selectedProduct.current_stock ?? 0 },
                { label: 'Reorder Point', value: selectedProduct.reorder_point },
                { label: 'Reorder Quantity', value: selectedProduct.reorder_quantity },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-muted)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2">
                <button className="fs-btn-primary flex-1" onClick={() => router.push('/operations')}>Create Operation</button>
                <button className="fs-btn-secondary flex-1" onClick={() => router.push('/inventory')}>View Inventory</button>
              </div>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface-muted)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Stock Health</p>
              <StatusBadge status={selectedProduct.status || 'Healthy'} />
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Product Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Product" subtitle="Create a new product in the catalog">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Product Name *</label>
              <input className="fs-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Keyboard" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>SKU *</label>
              <input className="fs-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. ELEC-001" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select className="fs-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                {DEMO_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Unit of Measure</label>
              <select className="fs-select" value={form.uom_id} onChange={e => setForm({ ...form, uom_id: e.target.value })}>
                {DEMO_UOMS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Reorder Point</label>
              <input type="number" className="fs-input" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: +e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Reorder Quantity</label>
              <input type="number" className="fs-input" value={form.reorder_quantity} onChange={e => setForm({ ...form, reorder_quantity: +e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="fs-btn-secondary flex-1" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="fs-btn-primary flex-1" onClick={handleCreate} disabled={!form.name || !form.sku || formLoading}>
              {formLoading ? 'Creating…' : 'Create Product'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Product">
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button className="fs-btn-secondary flex-1" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="fs-btn-danger flex-1" onClick={() => handleDelete(confirmDelete)}>Delete Product</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
