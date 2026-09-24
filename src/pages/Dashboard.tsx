import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, Wallet, Users, Package, TrendingUp, AlertTriangle, Clock, ArrowRight, Scissors,
} from 'lucide-react';
import { get } from '../lib/api';
import { peso, fmtTime, todayISO } from '../lib/format';
import type { Appointment, Transaction, Product, Customer, Branch } from '../lib/types';
import { Spinner, StatusBadge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('');

  const scopedBranch = user?.role === 'stylist' || user?.role === 'receptionist' ? String(user?.branch_id || '') : branchFilter;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      get<Appointment[]>('/api/appointments', { from: addDays(-30), to: todayISO() }),
      get<Transaction[]>('/api/transactions', { from: new Date(Date.now() - 60 * 864e5).toISOString() }),
      get<Product[]>('/api/products'),
      get<Customer[]>('/api/customers'),
      get<Branch[]>('/api/branches'),
    ])
      .then(([a, t, p, c, b]) => { setAppts(a); setTxns(t); setProducts(p); setCustomers(c); setBranches(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const inScope = <T extends { branch_id?: number | null }>(rows: T[]) =>
    scopedBranch ? rows.filter((r) => String(r.branch_id || '') === scopedBranch) : rows;

  const today = todayISO();
  const todayAppts = useMemo(() => inScope(appts).filter((a) => a.date === today), [appts, scopedBranch]);
  const todaySales = useMemo(
    () => inScope(txns).filter((t) => (t.created_at || '').slice(0, 10) === today).reduce((a, t) => a + Number(t.total), 0),
    [txns, scopedBranch]
  );
  const monthSales = useMemo(
    () => inScope(txns).filter((t) => (t.created_at || '').slice(0, 7) === today.slice(0, 7)).reduce((a, t) => a + Number(t.total), 0),
    [txns, scopedBranch]
  );
  const pendingCount = useMemo(() => inScope(appts).filter((a) => a.status === 'pending' && a.date >= today).length, [appts, scopedBranch]);
  const lowStock = useMemo(() => {
    const ps = scopedBranch ? products.filter((p) => String(p.branch_id || '') === scopedBranch || !p.branch_id) : products;
    return ps.filter((p) => p.stock <= p.reorder_level);
  }, [products, scopedBranch]);
  const newCustomers = useMemo(
    () => customers.filter((c) => (c.created_at || '').slice(0, 7) === today.slice(0, 7)).length,
    [customers]
  );

  const weekRevenue = useMemo(() => {
    const days: { d: string; v: number; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const iso = addDays(-i);
      const v = inScope(txns).filter((t) => (t.created_at || '').slice(0, 10) === iso).reduce((a, t) => a + Number(t.total), 0);
      days.push({ d: iso, v, label: new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short' }) });
    }
    return days;
  }, [txns, scopedBranch]);
  const maxRev = Math.max(1, ...weekRevenue.map((w) => w.v));

  const topServices = useMemo(() => {
    const map = new Map<string, { n: number; rev: number }>();
    inScope(txns).forEach((t) =>
      (t.items || []).forEach((it: any) => {
        if (it.kind === 'service' || !it.kind) {
          const k = it.name || 'Service';
          const cur = map.get(k) || { n: 0, rev: 0 };
          cur.n += Number(it.qty || 1);
          cur.rev += Number(it.price || 0) * Number(it.qty || 1);
          map.set(k, cur);
        }
      })
    );
    return [...map.entries()].sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
  }, [txns, scopedBranch]);

  if (loading) return <Spinner label="Loading dashboard…" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">
            Good {daypart()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-[#8a7460] capitalize">{user?.role} · {user?.branch_name || 'All branches'} · {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <select className="inp !w-auto" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-5">
        <Kpi icon={<Wallet className="w-5 h-5" />} label="Today's Sales" value={peso(todaySales)} sub={`${todayISO().slice(5)} · all payments`} color="bg-[#221512] text-[#e8c987]" />
        <Kpi icon={<CalendarCheck className="w-5 h-5" />} label="Today's Appointments" value={String(todayAppts.length)} sub={`${pendingCount} pending confirmation`} color="bg-[#c9963f] text-white" />
        <Kpi icon={<Users className="w-5 h-5" />} label="Customers" value={String(customers.length)} sub={`+${newCustomers} this month`} color="bg-[#e8c987] text-[#221512]" />
        <Kpi icon={<TrendingUp className="w-5 h-5" />} label="Month Revenue" value={peso(monthSales)} sub={new Date().toLocaleDateString('en-PH', { month: 'long' })} color="bg-[#f3ebdd] text-[#221512]" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* Revenue chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#221512]">Revenue — last 7 days</h3>
            <Link to="/finance" className="text-sm font-semibold text-[#c9963f] flex items-center gap-1">Finance <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="flex items-end gap-2 h-44 mt-4">
            {weekRevenue.map((w) => (
              <div key={w.d} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end" title={`${w.d}: ${peso(w.v)}`}>
                <span className="text-[10px] font-bold text-[#8a7460]">{w.v >= 1000 ? `${(w.v / 1000).toFixed(1)}k` : w.v ? Math.round(w.v) : ''}</span>
                <div className={`w-full rounded-t-lg transition-all ${w.d === today ? 'bg-gradient-to-t from-[#b9862f] to-[#e8c987]' : 'bg-[#eee2cf] hover:bg-[#e2d5c3]'}`} style={{ height: `${Math.max(4, (w.v / maxRev) * 100)}%` }} />
                <span className="text-[11px] font-semibold text-[#8a7460]">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-5">
          <h3 className="font-display text-lg font-semibold text-[#221512] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Needs attention
          </h3>
          <div className="mt-3 space-y-2.5">
            {pendingCount > 0 && (
              <Link to="/appointments" className="block bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                <span className="font-bold text-amber-800">{pendingCount} booking{pendingCount > 1 ? 's' : ''} awaiting confirmation</span>
                <span className="block text-amber-700 text-xs mt-0.5">Review in Appointment Management →</span>
              </Link>
            )}
            {lowStock.slice(0, 4).map((p) => (
              <Link key={p.id} to="/inventory" className="block bg-red-50 border border-red-100 rounded-xl p-3 text-sm">
                <span className="font-bold text-red-800">{p.name}</span>
                <span className="block text-red-600 text-xs">Only {p.stock} left (reorder at {p.reorder_level}) →</span>
              </Link>
            ))}
            {pendingCount === 0 && lowStock.length === 0 && (
              <p className="text-sm text-[#8a7460]">All clear! No pending bookings or low-stock items. ✨</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        {/* Today's schedule */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[#221512]">Today's schedule</h3>
            <Link to="/appointments" className="text-sm font-semibold text-[#c9963f] flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Time</th><th>Client</th><th>Service</th><th>Stylist</th><th>Status</th></tr></thead>
              <tbody>
                {todayAppts.slice(0, 8).map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold whitespace-nowrap"><Clock className="w-3.5 h-3.5 inline mr-1 text-[#c9963f]" />{fmtTime(a.time)}</td>
                    <td>{a.customer_name}<div className="text-xs text-[#8a7460]">{a.booking_ref}</div></td>
                    <td className="max-w-[180px] truncate">{a.service_name}</td>
                    <td>{a.staff_name || '—'}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
                {todayAppts.length === 0 && <tr><td colSpan={5} className="text-center text-[#8a7460] py-6">No appointments today.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top services + quick actions */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display text-lg font-semibold text-[#221512] flex items-center gap-2"><Scissors className="w-5 h-5 text-[#c9963f]" /> Top services</h3>
            <div className="mt-3 space-y-2.5">
              {topServices.map(([name, s], i) => (
                <div key={name}>
                  <div className="flex justify-between text-sm"><span className="font-medium text-[#221512] truncate mr-2">{i + 1}. {name}</span><span className="font-bold text-[#c9963f] whitespace-nowrap">{peso(s.rev)}</span></div>
                  <div className="h-1.5 bg-[#f3ebdd] rounded-full mt-1"><div className="h-full bg-gradient-to-r from-[#b9862f] to-[#e8c987] rounded-full" style={{ width: `${(s.rev / Math.max(1, topServices[0][1].rev)) * 100}%` }} /></div>
                </div>
              ))}
              {topServices.length === 0 && <p className="text-sm text-[#8a7460]">No sales yet.</p>}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-display text-lg font-semibold text-[#221512]">Quick actions</h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link to="/appointments" className="btn btn-line btn-sm"><CalendarCheck className="w-4 h-4" /> New booking</Link>
              <Link to="/pos" className="btn btn-line btn-sm"><Wallet className="w-4 h-4" /> Open POS</Link>
              <Link to="/customers" className="btn btn-line btn-sm"><Users className="w-4 h-4" /> Add client</Link>
              <Link to="/inventory" className="btn btn-line btn-sm"><Package className="w-4 h-4" /> Stock in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card p-4 md:p-5 flex items-start gap-3">
      <span className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-[#8a7460]">{label}</p>
        <p className="font-display text-xl md:text-2xl font-bold text-[#221512] truncate">{value}</p>
        <p className="text-[11px] md:text-xs text-[#8a7460] truncate">{sub}</p>
      </div>
    </div>
  );
}

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
