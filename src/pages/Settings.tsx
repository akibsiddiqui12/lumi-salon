import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Store, Scissors, Users as UsersIcon, UserCog, SlidersHorizontal } from 'lucide-react';
import { get, post, put, del } from '../lib/api';
import { peso, fmtTime } from '../lib/format';
import type { Branch, Service, Staff, UserRow, SettingRow } from '../lib/types';
import { Spinner, Modal, Field, Toast, Confirm, Empty } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'branches' | 'services' | 'staff' | 'users' | 'prefs';

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('branches');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [modal, setModal] = useState<null | { kind: Tab; item?: any }>(null);
  const [delWhat, setDelWhat] = useState<null | { kind: string; id: number }>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, s, st, u, se] = await Promise.all([
        get<Branch[]>('/api/branches'), get<Service[]>('/api/services'),
        get<Staff[]>('/api/staff'), get<UserRow[]>('/api/users'), get<SettingRow[]>('/api/settings'),
      ]);
      setBranches(b); setServices(s); setStaff(st); setUsers(u); setSettings(se);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const doDelete = async () => {
    if (!delWhat) return;
    try {
      const ep = delWhat.kind === 'branches' ? '/api/branches' : delWhat.kind === 'services' ? '/api/services' : delWhat.kind === 'staff' ? '/api/staff' : '/api/users';
      await del(ep, { id: delWhat.id });
      flash('Deleted'); setDelWhat(null); fetchAll();
    } catch (e: any) { flash(e.message); }
  };

  const toggleActive = async (kind: Tab, item: any) => {
    try {
      const ep = kind === 'branches' ? '/api/branches' : kind === 'services' ? '/api/services' : kind === 'staff' ? '/api/staff' : '/api/users';
      await put(ep, { id: item.id, active: !item.active });
      flash(`${item.name} ${item.active ? 'deactivated' : 'activated'}`);
      fetchAll();
    } catch (e: any) { flash(e.message); }
  };

  if (loading) return <Spinner label="Loading settings…" />;

  const tabs: { k: Tab; label: string; icon: any }[] = [
    { k: 'branches', label: 'Branches', icon: Store },
    { k: 'services', label: 'Services', icon: Scissors },
    { k: 'staff', label: 'Stylists & Staff', icon: UsersIcon },
    { k: 'users', label: 'System Users', icon: UserCog },
    { k: 'prefs', label: 'Preferences', icon: SlidersHorizontal },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">Settings & Customization</h1>
      <p className="text-sm text-[#8a7460]">Branches · service menu · stylists · roles · business preferences</p>

      <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`btn btn-sm !rounded-full whitespace-nowrap ${tab === t.k ? 'btn-dark' : 'btn-line'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'branches' && (
        <Sec title="Branches" onAdd={() => setModal({ kind: 'branches' })} addLabel="Add branch">
          <div className="grid md:grid-cols-2 gap-3">
            {branches.map((b) => (
              <div key={b.id} className={`card p-5 ${!b.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#221512]">{b.name} {!b.active && <span className="badge b-gray ml-1">inactive</span>}</p>
                    <p className="text-sm text-[#6b5d4f]">{b.address}</p>
                    <p className="text-xs text-[#8a7460] mt-1">{b.phone} · Daily {fmtTime(b.open_time)} – {fmtTime(b.close_time)}</p>
                  </div>
                  <RowBtns onEdit={() => setModal({ kind: 'branches', item: b })} onToggle={() => toggleActive('branches', b)} onDel={() => isAdmin && setDelWhat({ kind: 'branches', id: b.id })} canDel={isAdmin} />
                </div>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {tab === 'services' && (
        <Sec title="Service menu" onAdd={() => setModal({ kind: 'services' })} addLabel="Add service">
          {[...new Set(services.map((s) => s.category))].map((cat) => (
            <div key={cat} className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8a7460] mb-2">{cat}</p>
              <div className="card overflow-hidden">
                {services.filter((s) => s.category === cat).map((s) => (
                  <div key={s.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[#f3ead9] last:border-0 ${!s.active ? 'opacity-60' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.name} {!s.active && <span className="badge b-gray ml-1">hidden</span>}</p>
                      <p className="text-xs text-[#8a7460] truncate">{s.description || `${s.duration} min`}</p>
                    </div>
                    <span className="text-xs text-[#8a7460] whitespace-nowrap">{s.duration} min</span>
                    <span className="font-bold text-sm w-24 text-right">{peso(s.price)}</span>
                    <RowBtns onEdit={() => setModal({ kind: 'services', item: s })} onToggle={() => toggleActive('services', s)} onDel={() => isAdmin && setDelWhat({ kind: 'services', id: s.id })} canDel={isAdmin} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && <div className="card"><Empty title="No services" /></div>}
        </Sec>
      )}

      {tab === 'staff' && (
        <Sec title="Stylists & staff" onAdd={() => setModal({ kind: 'staff' })} addLabel="Add staff">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staff.map((s) => (
              <div key={s.id} className={`card p-4 ${!s.active ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <img src={s.photo || '/images/stylist-1.jpg'} alt={s.name} className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-[#8a7460]">{s.role} · {branches.find((b) => b.id === s.branch_id)?.name || '—'}</p>
                  </div>
                  <RowBtns onEdit={() => setModal({ kind: 'staff', item: s })} onToggle={() => toggleActive('staff', s)} onDel={() => isAdmin && setDelWhat({ kind: 'staff', id: s.id })} canDel={isAdmin} />
                </div>
                <div className="flex gap-3 mt-2 text-xs text-[#8a7460]">
                  <span>★ {Number(s.rating).toFixed(1)}</span>
                  <span>Base {peso(s.base_salary).replace('.00', '')}</span>
                  <span>Comm {s.commission_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </Sec>
      )}

      {tab === 'users' && (
        <Sec title="System users & roles" onAdd={() => isAdmin && setModal({ kind: 'users' })} addLabel="Add user" hideAdd={!isAdmin}>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl min-w-[640px]">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-semibold">{u.name}</td>
                      <td className="text-sm">{u.email}</td>
                      <td><span className={`badge ${u.role === 'admin' ? 'b-purple' : u.role === 'manager' ? 'b-blue' : u.role === 'stylist' ? 'b-pink' : 'b-gray'}`}>{u.role}</span></td>
                      <td className="text-sm">{u.branch_id ? branches.find((b) => b.id === u.branch_id)?.name : 'All'}</td>
                      <td>{u.active ? <span className="badge b-green">active</span> : <span className="badge b-gray">inactive</span>}</td>
                      <td>
                        {isAdmin && <RowBtns onEdit={() => setModal({ kind: 'users', item: u })} onToggle={() => toggleActive('users', u)} onDel={() => setDelWhat({ kind: 'users', id: u.id })} canDel={u.email !== user?.email} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!isAdmin && <p className="text-xs text-[#8a7460] mt-2">Only admins can manage system users.</p>}
        </Sec>
      )}

      {tab === 'prefs' && <Prefs settings={settings} onSaved={(m) => { flash(m); fetchAll(); }} />}

      {modal?.kind === 'branches' && <BranchForm item={modal.item} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); flash(m); fetchAll(); }} />}
      {modal?.kind === 'services' && <ServiceForm item={modal.item} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); flash(m); fetchAll(); }} />}
      {modal?.kind === 'staff' && <StaffForm item={modal.item} branches={branches} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); flash(m); fetchAll(); }} />}
      {modal?.kind === 'users' && <UserForm item={modal.item} branches={branches} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); flash(m); fetchAll(); }} />}
      {delWhat && <Confirm text="Delete this record permanently?" onYes={doDelete} onNo={() => setDelWhat(null)} />}
      <Toast msg={toast} />
    </div>
  );
}

function Sec({ title, children, onAdd, addLabel, hideAdd }: { title: string; children: React.ReactNode; onAdd: () => void; addLabel: string; hideAdd?: boolean }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg font-semibold text-[#221512]">{title}</h3>
        {!hideAdd && <button className="btn btn-gold btn-sm" onClick={onAdd}><Plus className="w-4 h-4" /> {addLabel}</button>}
      </div>
      {children}
    </div>
  );
}

function RowBtns({ onEdit, onToggle, onDel, canDel }: { onEdit: () => void; onToggle: () => void; onDel: () => void; canDel?: boolean }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button className="p-1.5 rounded-lg hover:bg-[#f3ebdd]" title="Edit" onClick={onEdit}><Pencil className="w-4 h-4 text-[#8a7460]" /></button>
      <button className="p-1.5 rounded-lg hover:bg-[#f3ebdd] text-xs font-bold text-[#8a7460] px-1.5" title="Activate / deactivate" onClick={onToggle}>On/Off</button>
      {canDel !== false && <button className="p-1.5 rounded-lg hover:bg-red-50" title="Delete" onClick={onDel}><Trash2 className="w-4 h-4 text-red-400" /></button>}
    </div>
  );
}

/* ---- Forms ---- */
function BranchForm({ item, onClose, onSaved }: { item?: Branch; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ name: item?.name || '', address: item?.address || '', phone: item?.phone || '', open_time: item?.open_time || '09:00', close_time: item?.close_time || '21:00' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('Branch name required.');
    setSaving(true);
    try {
      if (item) { await put('/api/branches', { id: item.id, ...f }); onSaved('Branch updated'); }
      else { await post('/api/branches', { ...f, active: true }); onSaved('Branch added'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={item ? 'Edit branch' : 'Add branch'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *" span><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Lumière BGC" /></Field>
        <Field label="Address" span><input className="inp" value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
        <Field label="Phone"><input className="inp" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Opens"><input type="time" className="inp" value={f.open_time} onChange={(e) => set('open_time', e.target.value)} /></Field>
          <Field label="Closes"><input type="time" className="inp" value={f.close_time} onChange={(e) => set('close_time', e.target.value)} /></Field>
        </div>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

const SVC_CATS = ['Hair', 'Spa & Massage', 'Nails', 'Facial & Skin', 'Packages'];
function ServiceForm({ item, onClose, onSaved }: { item?: Service; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ name: item?.name || '', category: item?.category || 'Hair', price: item?.price ?? 0, duration: item?.duration ?? 60, description: item?.description || '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('Service name required.');
    setSaving(true);
    try {
      const payload = { ...f, price: Number(f.price), duration: Number(f.duration) };
      if (item) { await put('/api/services', { id: item.id, ...payload }); onSaved('Service updated'); }
      else { await post('/api/services', { ...payload, active: true }); onSaved('Service added'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={item ? 'Edit service' : 'Add service'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *" span><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Signature Balayage" /></Field>
        <Field label="Category"><select className="inp" value={f.category} onChange={(e) => set('category', e.target.value)}>{SVC_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Duration (min)"><input type="number" className="inp" value={f.duration} onChange={(e) => set('duration', e.target.value)} /></Field>
        <Field label="Price (₱)" span><input type="number" className="inp" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Description" span><textarea className="inp" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

const STAFF_ROLES = ['Senior Stylist', 'Stylist', 'Junior Stylist', 'Colorist', 'Massage Therapist', 'Nail Technician', 'Facialist', 'Receptionist', 'Manager'];
function StaffForm({ item, branches, onClose, onSaved }: { item?: Staff; branches: Branch[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({
    name: item?.name || '', role: item?.role || 'Stylist', branch_id: item?.branch_id || branches[0]?.id || 0,
    phone: item?.phone || '', email: item?.email || '', specialties: item?.specialties || '',
    rating: item?.rating ?? 5, commission_rate: item?.commission_rate ?? 10, base_salary: item?.base_salary ?? 15000, photo: item?.photo || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('Name required.');
    setSaving(true);
    try {
      const payload = { ...f, branch_id: Number(f.branch_id) || null, rating: Number(f.rating), commission_rate: Number(f.commission_rate), base_salary: Number(f.base_salary) };
      if (item) { await put('/api/staff', { id: item.id, ...payload }); onSaved('Staff updated'); }
      else { await post('/api/staff', { ...payload, active: true }); onSaved('Staff added'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={item ? 'Edit staff' : 'Add staff'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name *"><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Role"><select className="inp" value={f.role} onChange={(e) => set('role', e.target.value)}>{STAFF_ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Branch"><select className="inp" value={f.branch_id} onChange={(e) => set('branch_id', Number(e.target.value))}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Phone"><input className="inp" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input className="inp" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Rating (0-5)"><input type="number" step="0.1" min={0} max={5} className="inp" value={f.rating} onChange={(e) => set('rating', e.target.value)} /></Field>
        <Field label="Specialties" span><input className="inp" value={f.specialties} onChange={(e) => set('specialties', e.target.value)} placeholder="e.g. Balayage, Keratin" /></Field>
        <Field label="Base salary (₱)"><input type="number" className="inp" value={f.base_salary} onChange={(e) => set('base_salary', e.target.value)} /></Field>
        <Field label="Commission %"><input type="number" className="inp" value={f.commission_rate} onChange={(e) => set('commission_rate', e.target.value)} /></Field>
        <Field label="Photo URL" span><input className="inp" value={f.photo} onChange={(e) => set('photo', e.target.value)} placeholder="/images/stylist-1.jpg" /></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function UserForm({ item, branches, onClose, onSaved }: { item?: UserRow; branches: Branch[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ name: item?.name || '', email: item?.email || '', password: '', role: item?.role || 'receptionist', branch_id: item?.branch_id || 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.name.trim() || !f.email.trim()) return setErr('Name and email required.');
    if (!item && !f.password) return setErr('Password required for new users.');
    setSaving(true);
    try {
      const payload: any = { name: f.name.trim(), email: f.email.trim(), role: f.role, branch_id: f.branch_id || null };
      if (f.password) payload.password = f.password;
      if (item) { await put('/api/users', { id: item.id, ...payload }); onSaved('User updated'); }
      else { await post('/api/users', { ...payload, active: true }); onSaved('User created'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={item ? 'Edit user' : 'Add user'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *"><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Email *"><input type="email" className="inp" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label={item ? 'New password (blank = keep)' : 'Password *'}><input type="password" className="inp" value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <Field label="Role"><select className="inp" value={f.role} onChange={(e) => set('role', e.target.value)}><option value="admin">Admin</option><option value="manager">Manager</option><option value="receptionist">Receptionist</option><option value="stylist">Stylist</option></select></Field>
        <Field label="Branch scope" span><select className="inp" value={f.branch_id} onChange={(e) => set('branch_id', Number(e.target.value))}><option value={0}>All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

const PREF_DEFS = [
  { key: 'business_name', label: 'Business name', type: 'text' },
  { key: 'vat_rate', label: 'VAT rate (%)', type: 'number' },
  { key: 'slot_minutes', label: 'Booking slot interval (minutes)', type: 'number' },
  { key: 'loyalty_per_100', label: 'Loyalty points per ₱100', type: 'number' },
  { key: 'cancel_hours', label: 'Free cancellation window (hours)', type: 'number' },
  { key: 'receipt_footer', label: 'Receipt footer message', type: 'text' },
];

function Prefs({ settings, onSaved }: { settings: SettingRow[]; onSaved: (m: string) => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(settings.map((s) => [s.key, s.value])));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVals(Object.fromEntries(settings.map((s) => [s.key, s.value]))); }, [settings]);
  const save = async () => {
    setSaving(true);
    try {
      for (const d of PREF_DEFS) {
        const v = vals[d.key];
        if (v !== undefined) await post('/api/settings', { key: d.key, value: String(v) });
      }
      onSaved('Preferences saved');
    } catch (e: any) { onSaved(e.message); } finally { setSaving(false); }
  };
  return (
    <div className="card p-5 mt-4 max-w-2xl">
      <h3 className="font-display text-lg font-semibold text-[#221512]">Business preferences</h3>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        {PREF_DEFS.map((d) => (
          <Field key={d.key} label={d.label}>
            <input type={d.type} className="inp" value={vals[d.key] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [d.key]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <button className="btn btn-gold mt-4" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save preferences'}</button>
    </div>
  );
}
