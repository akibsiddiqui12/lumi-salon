import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Wallet, TrendingDown, TrendingUp, Users, Calculator, BadgeCheck } from 'lucide-react';
import { get, post, put, del } from '../lib/api';
import { peso, fmtDate, todayISO, monthName } from '../lib/format';
import type { Expense, Transaction, Staff, PayrollRow, Branch } from '../lib/types';
import { Spinner, Modal, Field, Toast, Confirm, Empty, StatusBadge } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export default function Finance() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'pnl' | 'expenses' | 'payroll'>('pnl');
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [expModal, setExpModal] = useState<null | { e?: Expense }>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [e, t, s, p, b] = await Promise.all([
        get<Expense[]>('/api/expenses'), get<Transaction[]>('/api/transactions'),
        get<Staff[]>('/api/staff'), get<PayrollRow[]>('/api/payroll'), get<Branch[]>('/api/branches'),
      ]);
      setExpenses(e); setTxns(t); setStaff(s.filter((x) => x.active)); setPayroll(p); setBranches(b);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const mTxns = useMemo(() => txns.filter((t) => (t.created_at || '').slice(0, 7) === month), [txns, month]);
  const mExp = useMemo(() => expenses.filter((e) => (e.date || '').slice(0, 7) === month), [expenses, month]);
  const revenue = mTxns.reduce((a, t) => a + Number(t.total), 0);
  const svcRev = mTxns.reduce((a, t) => a + (t.items || []).filter((i: any) => i.kind === 'service' || !i.kind).reduce((x: number, i: any) => x + Number(i.price) * Number(i.qty || 1), 0), 0);
  const retailRev = mTxns.reduce((a, t) => a + (t.items || []).filter((i: any) => i.kind === 'product').reduce((x: number, i: any) => x + Number(i.price) * Number(i.qty || 1), 0), 0);
  const expTotal = mExp.reduce((a, e) => a + Number(e.amount), 0);
  const payrollCost = payroll.filter((p) => p.month === month).reduce((a, p) => a + Number(p.net_pay), 0);
  const profit = revenue - expTotal - payrollCost;

  const expByCat = useMemo(() => {
    const m = new Map<string, number>();
    mExp.forEach((e) => m.set(e.category, (m.get(e.category) || 0) + Number(e.amount)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [mExp]);

  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    mTxns.forEach((t) => m.set(t.payment_method, (m.get(t.payment_method) || 0) + Number(t.total)));
    return [...m.entries()];
  }, [mTxns]);

  const staffPerf = useMemo(() => {
    const m = new Map<number, { name: string; sales: number; n: number }>();
    mTxns.forEach((t) => {
      if (!t.staff_id) return;
      const cur = m.get(t.staff_id) || { name: t.staff_name || '—', sales: 0, n: 0 };
      cur.sales += Number(t.total); cur.n += 1;
      m.set(t.staff_id, cur);
    });
    return [...m.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.sales - a.sales);
  }, [mTxns]);

  const computePayroll = async () => {
    setComputing(true);
    try {
      for (const s of staff) {
        const perf = staffPerf.find((p) => p.id === s.id);
        const sales = perf?.sales || 0;
        const commission = Math.round(sales * (Number(s.commission_rate) || 0) / 100);
        const exists = payroll.find((p) => p.month === month && p.staff_id === s.id);
        const br = branches.find((b) => b.id === s.branch_id);
        const payload = {
          month, staff_id: s.id, staff_name: s.name, branch_name: br?.name || '',
          base_salary: Number(s.base_salary) || 0, commission,
          deductions: exists ? Number(exists.deductions) : 0,
          net_pay: (Number(s.base_salary) || 0) + commission - (exists ? Number(exists.deductions) : 0),
          status: exists?.status || 'draft',
        };
        if (exists) await put('/api/payroll', { id: exists.id, ...payload });
        else await post('/api/payroll', payload);
      }
      flash(`Payroll computed for ${monthName(month)}`);
      fetchAll();
    } catch (e: any) { flash(e.message); } finally { setComputing(false); }
  };

  const markPaid = async (p: PayrollRow) => {
    try { await put('/api/payroll', { id: p.id, status: 'paid', paid_at: new Date().toISOString() }); flash(`${p.staff_name} marked paid`); fetchAll(); }
    catch (e: any) { flash(e.message); }
  };

  const removeExp = async () => {
    if (!delId) return;
    try { await del('/api/expenses', { id: delId }); flash('Expense deleted'); setDelId(null); fetchAll(); }
    catch (e: any) { flash(e.message); }
  };

  if (loading) return <Spinner label="Loading finance…" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">Financials & Payroll</h1>
          <p className="text-sm text-[#8a7460]">P&L · expenses · commissions · payouts</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" className="inp !w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
          <div className="flex bg-[#f3ebdd] rounded-xl p-1">
            <button className={`tabbtn ${tab === 'pnl' ? 'on' : ''}`} onClick={() => setTab('pnl')}>P&L</button>
            <button className={`tabbtn ${tab === 'expenses' ? 'on' : ''}`} onClick={() => setTab('expenses')}>Expenses</button>
            <button className={`tabbtn ${tab === 'payroll' ? 'on' : ''}`} onClick={() => setTab('payroll')}>Payroll</button>
          </div>
        </div>
      </div>

      {tab === 'pnl' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <Kpi icon={<TrendingUp className="w-5 h-5" />} label={`Revenue · ${monthName(month)}`} value={peso(revenue)} color="bg-green-100 text-green-700" />
            <Kpi icon={<TrendingDown className="w-5 h-5" />} label="Expenses" value={peso(expTotal)} color="bg-red-100 text-red-600" />
            <Kpi icon={<Users className="w-5 h-5" />} label="Payroll cost" value={peso(payrollCost)} color="bg-[#f3ebdd] text-[#221512]" />
            <Kpi icon={<Wallet className="w-5 h-5" />} label="Net profit" value={peso(profit)} color={profit >= 0 ? 'bg-[#221512] text-[#e8c987]' : 'bg-red-600 text-white'} />
          </div>
          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <div className="card p-5">
              <h3 className="font-display text-lg font-semibold">Revenue mix</h3>
              <div className="mt-3 space-y-3 text-sm">
                <Bar label="Services" v={svcRev} max={Math.max(1, revenue)} color="from-[#b9862f] to-[#e8c987]" />
                <Bar label="Retail" v={retailRev} max={Math.max(1, revenue)} color="from-[#7c5a3a] to-[#c9a05e]" />
              </div>
              <h3 className="font-display text-lg font-semibold mt-6">By payment method</h3>
              <div className="mt-2 space-y-1.5 text-sm">
                {byMethod.map(([m, v]) => (
                  <div key={m} className="flex justify-between"><span className="text-[#6b5d4f]">{m}</span><span className="font-bold">{peso(v)}</span></div>
                ))}
                {byMethod.length === 0 && <p className="text-sm text-[#8a7460]">No sales this month.</p>}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-display text-lg font-semibold">Expenses by category</h3>
              <div className="mt-3 space-y-3 text-sm">
                {expByCat.map(([c, v]) => <Bar key={c} label={c} v={v} max={Math.max(1, expTotal)} color="from-red-400 to-red-300" />)}
                {expByCat.length === 0 && <p className="text-sm text-[#8a7460]">No expenses this month.</p>}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-display text-lg font-semibold">Stylist leaderboard</h3>
              <div className="mt-3 space-y-2.5">
                {staffPerf.slice(0, 6).map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#c9963f] text-white' : 'bg-[#f3ebdd] text-[#8a7460]'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{s.name}</p><p className="text-xs text-[#8a7460]">{s.n} sales</p></div>
                    <span className="text-sm font-bold">{peso(s.sales)}</span>
                  </div>
                ))}
                {staffPerf.length === 0 && <p className="text-sm text-[#8a7460]">No sales yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'expenses' && (
        <>
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-[#8a7460]">{mExp.length} expenses in {monthName(month)} · total <b className="text-red-600">{peso(expTotal)}</b></p>
            <button className="btn btn-gold btn-sm" onClick={() => setExpModal({})}><Plus className="w-4 h-4" /> Add expense</button>
          </div>
          <div className="card mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl min-w-[760px]">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Branch</th><th>Method</th><th>Amount</th><th></th></tr></thead>
                <tbody>
                  {mExp.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td><span className="badge b-gray">{e.category}</span></td>
                      <td>{e.description}<div className="text-xs text-[#8a7460]">{e.receipt_no || ''}</div></td>
                      <td className="text-sm">{e.branch_name || '—'}</td>
                      <td className="text-sm">{e.payment_method || '—'}</td>
                      <td className="font-bold text-red-600">{peso(e.amount)}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-line btn-sm" onClick={() => setExpModal({ e })}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDelId(e.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {mExp.length === 0 && <tr><td colSpan={7}><Empty title="No expenses this month" /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'payroll' && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-2 mt-4">
            <p className="text-sm text-[#8a7460]">{monthName(month)} · base + commission ({`%`} of personal sales) − deductions</p>
            <div className="flex gap-2">
              {user?.role === 'admin' && <button className="btn btn-dark btn-sm" disabled={computing} onClick={computePayroll}><Calculator className="w-4 h-4" /> {computing ? 'Computing…' : 'Compute payroll'}</button>}
            </div>
          </div>
          <div className="card mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl min-w-[860px]">
                <thead><tr><th>Staff</th><th>Branch</th><th>Base</th><th>Sales</th><th>Commission</th><th>Deductions</th><th>Net pay</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {payroll.filter((p) => p.month === month).map((p) => {
                    const perf = staffPerf.find((s) => s.id === p.staff_id);
                    return (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.staff_name}</td>
                        <td className="text-sm">{p.branch_name || '—'}</td>
                        <td>{peso(p.base_salary)}</td>
                        <td className="text-sm">{perf ? peso(perf.sales) : '—'}</td>
                        <td className="font-semibold text-green-600">+{peso(p.commission)}</td>
                        <td><DeductCell p={p} onSaved={() => fetchAll()} /></td>
                        <td className="font-bold">{peso(p.net_pay)}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>{p.status !== 'paid' && user?.role === 'admin' && <button className="btn btn-gold btn-sm" onClick={() => markPaid(p)}><BadgeCheck className="w-3.5 h-3.5" /> Pay</button>}</td>
                      </tr>
                    );
                  })}
                  {payroll.filter((p) => p.month === month).length === 0 && <tr><td colSpan={9}><Empty title="No payroll rows yet" hint="Click “Compute payroll” to generate from sales & commissions." /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {expModal && <ExpForm e={expModal.e} branches={branches} userName={user?.name || ''} onClose={() => setExpModal(null)} onSaved={(m) => { setExpModal(null); flash(m); fetchAll(); }} />}
      {delId && <Confirm text="Delete this expense?" onYes={removeExp} onNo={() => setDelId(null)} />}
      <Toast msg={toast} />
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</span>
      <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-[#8a7460]">{label}</p><p className="font-display text-xl font-bold truncate">{value}</p></div>
    </div>
  );
}

function Bar({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between"><span className="text-[#4a3a30]">{label}</span><span className="font-bold">{peso(v)}</span></div>
      <div className="h-2 bg-[#f3ebdd] rounded-full mt-1"><div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${Math.max(2, (v / max) * 100)}%` }} /></div>
    </div>
  );
}

function DeductCell({ p, onSaved }: { p: PayrollRow; onSaved: () => void }) {
  const [v, setV] = useState(p.deductions);
  const save = async () => {
    if (Number(v) === Number(p.deductions)) return;
    try {
      const d = Number(v) || 0;
      await put('/api/payroll', { id: p.id, deductions: d, net_pay: Number(p.base_salary) + Number(p.commission) - d });
      onSaved();
    } catch { /* ignore */ }
  };
  return <input type="number" className="inp !w-24 !py-1" value={v} onChange={(e) => setV(Number(e.target.value))} onBlur={save} />;
}

const EXP_CATS = ['Rent', 'Salaries', 'Supplies', 'Utilities', 'Marketing', 'Maintenance', 'Taxes', 'Misc'];

function ExpForm({ e, branches, userName, onClose, onSaved }: { e?: Expense; branches: Branch[]; userName: string; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({
    date: e?.date || todayISO(), category: e?.category || 'Supplies', description: e?.description || '',
    amount: e?.amount ?? 0, branch_id: e?.branch_id || branches[0]?.id || 0,
    payment_method: e?.payment_method || 'Cash', receipt_no: e?.receipt_no || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.description.trim() || !Number(f.amount)) return setErr('Description and amount required.');
    setSaving(true);
    try {
      const br = branches.find((b) => b.id === Number(f.branch_id));
      const payload = { ...f, amount: Number(f.amount), branch_id: Number(f.branch_id), branch_name: br?.name, created_by: userName };
      if (e) { await put('/api/expenses', { id: e.id, ...payload }); onSaved('Expense updated'); }
      else { await post('/api/expenses', payload); onSaved('Expense recorded'); }
    } catch (er: any) { setErr(er.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={e ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><input type="date" className="inp" value={f.date} onChange={(e2) => set('date', e2.target.value)} /></Field>
        <Field label="Category"><select className="inp" value={f.category} onChange={(e2) => set('category', e2.target.value)}>{EXP_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Description *" span><input className="inp" value={f.description} onChange={(e2) => set('description', e2.target.value)} placeholder="e.g. L'Oréal color tubes" /></Field>
        <Field label="Amount (₱) *"><input type="number" className="inp" value={f.amount} onChange={(e2) => set('amount', e2.target.value)} /></Field>
        <Field label="Branch"><select className="inp" value={f.branch_id} onChange={(e2) => set('branch_id', Number(e2.target.value))}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Paid via"><select className="inp" value={f.payment_method} onChange={(e2) => set('payment_method', e2.target.value)}><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>GCash</option></select></Field>
        <Field label="Receipt no."><input className="inp" value={f.receipt_no} onChange={(e2) => set('receipt_no', e2.target.value)} /></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}
