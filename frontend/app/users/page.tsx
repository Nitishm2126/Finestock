'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { User, Role } from '@/types/user';
import { userService } from '@/services/user.service';
import { Loader2, Plus, Shield, X, Users, UserCheck, ShieldAlert, ShieldHalf, LayoutGrid, Search, Filter } from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role_id: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userService.getUsers(),
        userService.getRoles()
      ]);
      setUsers(usersRes.users);
      setRoles(rolesRes);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [isAuthenticated]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.createUser(formData);
      setIsAdding(false);
      setFormData({ email: '', first_name: '', last_name: '', password: '', role_id: '' });
      fetchData();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell title="User Management" activeItem="Users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Users & Roles</h1>
            <p className="text-sm text-slate-400 mt-1">Manage organization access and role-based permissions.</p>
          </div>
          {user.role === 'ADMIN' && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          )}
        </div>

        {isAdding && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create New User</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                <input
                  required
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={formData.first_name}
                  onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                <input
                  required
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={formData.last_name}
                  onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                <select
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={formData.role_id}
                  onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                >
                  <option value="">Select a role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Total Users</div>
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Users className="h-3 w-3" /> All registered accounts
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Active Users</div>
            <div className="text-2xl font-bold text-emerald-400">{users.filter(u => u.is_active).length}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Currently active
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Administrators</div>
            <div className="text-2xl font-bold text-purple-400">{users.filter(u => u.role.name === 'ADMIN').length}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Full access
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="text-sm text-slate-400 mb-2">Warehouse Staff</div>
            <div className="text-2xl font-bold text-blue-400">{users.filter(u => u.role.name.includes('WAREHOUSE')).length}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <ShieldHalf className="h-3 w-3" /> Operational staff
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-800 bg-slate-900/60 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              <LayoutGrid className="h-4 w-4" /> View
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-semibold text-sm shadow-inner">
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">{u.first_name} {u.last_name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Shield className={`h-4 w-4 ${u.role.name === 'ADMIN' ? 'text-purple-400' : 'text-emerald-500'}`} />
                          <div>
                            <div className="text-sm text-slate-200 font-medium">
                              {u.role.name.replace(/_/g, ' ')}
                            </div>
                            <div className="text-[10px] text-slate-500">{u.role.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No users found in this organization.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
