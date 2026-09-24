import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Phone, Mail, Star, Trash2, Pencil, History } from 'lucide-react';
import { get, post, put, del } from '../lib/api';
import { peso, fmtDate } from '../lib/format';
import type { Customer, Appointment, Transaction } from '../lib/types';
import { Spinner, Modal, Field, Toast, Confirm, Empty, StatusBadge } from '../components/ui';

export default function Customers() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<null | { cust?: Customer }>(null);
  const [view, setView] = useState<Customer | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = async (qq = '') => {
    setLoading(true);
    try {
      const d = await get<Customer[]>('/api/customers', qq ? { q: qq } : undefined);
      setRows(d);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const stats = useMemo(() => ({
    total: rows.length,
    vips: rows.filter((c) => Number(c.total_spent) >= 20000).length,
    points: rows.reduce((a, c) => a + (c.loyalty_points || 0), 0),
  }), [rows]);

  const remove = async () => {
    if (!delId) return;
    try { await del('/api/customers', { id: delId }); flash('Customer deleted'); setDelId(null); fetchAll(q); }
    catch (e: any) { flash(e.message); }
  };

  if (loading && rows.length === 0) return <Spinner label="Loading customers…" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">Customer CRM</h1>
          <p className="text-sm text-[#8a7460]">{stats.total} clients · {stats.vips} VIPs · {stats.points.toLocaleString()} loyalty points issued</p>
        </div>
        <button className="btn btn-gold" onClick={() => setModal({})}><Plus className="w-4 h-4" /> Add customer</button>
      </div>

      <div className="card p-4 mt-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a08a]" />
          <input className="inp !pl-9" placeholder="Search name, phone, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading && <span className="text-xs text-[#8a7460]">Searching…</span>}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
        {rows.map((c) => {
          const vip = Number(c.total_spent) >= 20000;
          return (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#221512] text-[#e8c987] flex items-center justify-center font-bold text-lg shrink-0">{c.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#221512] truncate flex items-center gap-1.5">
                      {c.name}
                      {vip && <span className="badge b-purple"><Star className="w-3 h-3" /> VIP</span>}
                    </p>
                    <p className="text-xs text-[#8a7460] flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-[#f3ebdd]" title="History" onClick={() => setView(c)}><History className="w-4 h-4 text-[#8a7460]" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-[#f3ebdd]" title="Edit" onClick={() => setModal({ cust: c })}><Pencil className="w-4 h-4 text-[#8a7460]" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50" title="Delete" onClick={() => setDelId(c.id)}><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              {c.email && <p className="text-xs text-[#8a7460] flex items-center gap-1 mt-2"><Mail className="w-3 h-3" />{c.email}</p>}
              {c.tags && <div className="flex flex-wrap gap-1 mt-2">{c.tags.split(',').map((t) => <span key={t} className="badge b-pink">{t.trim()}</span>)}</div>}
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#f3ead9] text-center">
                <div><p className="font-bold text-[#221512]">{c.total_visits || 0}</p><p className="text-[10px] text-[#8a7460] uppercase">Visits</p></div>
                <div><p className="font-bold text-[#221512]">{peso(c.total_spent).replace('.00', '')}</p><p className="text-[10px] text-[#8a7460] uppercase">Spent</p></div>
                <div><p className="font-bold text-[#c9963f]">{c.loyalty_points || 0}</p><p className="text-[10px] text-[#8a7460] uppercase">Points</p></div>
                <div><p className="font-bold text-[#221512] text-xs pt-1">{c.last_visit ? fmtDate(c.last_visit) : '—'}</p><p className="text-[10px] text-[#8a7460] uppercase">Last visit</p></div>
              </div>
              <button className="btn btn-line btn-sm w-full mt-3" onClick={() => setView(c)}>View profile & history</button>
            </div>
          );
        })}
      </div>
      {rows.length === 0 && <div className="card mt-4"><Empty title="No customers found" hint="Add your first client to start building the CRM." /></div>}

      {modal && (
        <CustForm cust={modal.cust} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); flash(m); fetchAll(q); }} />
      )}
      {view && <ProfileView cust={view} onClose={() => setView(null)} />}
      {delId && <Confirm text="Delete this customer? Their history stays on past records." onYes={remove} onNo={() => setDelId(null)} />}
      <Toast msg={toast} />
    </div>
  );
}

function CustForm({ cust, onClose, onSaved }: { cust?: Customer; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({
    name: cust?.name || '', phone: cust?.phone || '', email: cust?.email || '',
    gender: cust?.gender || '', birthday: cust?.birthday || '', address: cust?.address || '',
    tags: cust?.tags || '', notes: cust?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setErr('');
    if (!f.name.trim() || !f.phone.trim()) return setErr('Name and phone are required.');
    setSaving(true);
    try {
      if (cust) { await put('/api/customers', { id: cust.id, ...f }); onSaved('Customer updated'); }
      else { await post('/api/customers', f); onSaved('Customer added'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal title={cust ? 'Edit customer' : 'Add customer'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name *"><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Phone *"><input className="inp" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input className="inp" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Gender"><select className="inp" value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="">—</option><option>Female</option><option>Male</option></select></Field>
          <Field label="Birthday"><input type="date" className="inp" value={f.birthday || ''} onChange={(e) => set('birthday', e.target.value)} /></Field>
        </div>
        <Field label="Address" span><input className="inp" value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Tags (comma separated)" span><input className="inp" value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="e.g. balayage-lover, sensitive-skin, bridal" /></Field>
        <Field label="Notes" span><textarea className="inp" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferences, allergies…" /></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function ProfileView({ cust, onClose }: { cust: Customer; onClose: () => void }) {
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      get<Appointment[]>('/api/appointments', { customer_id: cust.id }),
      get<Transaction[]>('/api/transactions', { customer_id: cust.id }),
    ]).then(([a, t]) => { setAppts(a); setTxns(t); }).catch(() => {}).finally(() => setLoading(false));
  }, [cust.id]);

  return (
    <Modal title={`${cust.name} — profile`} onClose={onClose} wide>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4 bg-[#fffdf8] h-fit">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8a7460]">Contact</p>
          <p className="text-sm mt-1">{cust.phone}</p>
          <p className="text-sm">{cust.email || '—'}</p>
          <p className="text-sm text-[#6b5d4f]">{cust.address || ''}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-[#8a7460] mt-3">Stats</p>
          <p className="text-sm mt-1">{cust.total_visits || 0} visits · <b>{peso(cust.total_spent)}</b> lifetime · <b className="text-[#c9963f]">{cust.loyalty_points || 0} pts</b></p>
          {cust.notes && <><p className="text-xs font-bold uppercase tracking-wider text-[#8a7460] mt-3">Notes</p><p className="text-sm mt-1">{cust.notes}</p></>}
        </div>
        <div className="md:col-span-2">
          {loading ? <Spinner /> : (
            <>
              <p className="font-semibold text-[#221512]">Visit history</p>
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto">
                {txns.map((t) => (
                  <div key={t.id} className="border border-[#eee2cf] rounded-xl p-3 text-sm flex justify-between gap-2">
                    <div><p className="font-semibold">{fmtDate((t.created_at || '').slice(0, 10))} · {t.invoice_no}</p><p className="text-xs text-[#8a7460]">{(t.items || []).map((i: any) => i.name).join(', ')}</p></div>
                    <p className="font-bold whitespace-nowrap">{peso(t.total)}</p>
                  </div>
                ))}
                {txns.length === 0 && <p className="text-sm text-[#8a7460]">No purchases yet.</p>}
              </div>
              <p className="font-semibold text-[#221512] mt-4">Appointments</p>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {appts.map((a) => (
                  <div key={a.id} className="border border-[#eee2cf] rounded-xl p-3 text-sm flex justify-between items-center gap-2">
                    <div><p className="font-semibold">{fmtDate(a.date)} · {a.service_name}</p><p className="text-xs text-[#8a7460]">{a.booking_ref} · {a.staff_name}</p></div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
                {appts.length === 0 && <p className="text-sm text-[#8a7460]">No appointments yet.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
