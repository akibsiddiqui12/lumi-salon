import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, CalendarDays, Clock, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { get, post, put, del } from '../lib/api';
import { peso, fmtDate, fmtTime, todayISO, addDaysISO } from '../lib/format';
import type { Appointment, Branch, Service, Staff } from '../lib/types';
import { Spinner, StatusBadge, Modal, Field, Toast, Confirm, Empty } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const STATUSES = ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'];

export default function Appointments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [date, setDate] = useState(todayISO());
  const [fBranch, setFBranch] = useState('');
  const [fStaff, setFStaff] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<null | { appt?: Appointment }>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const scopedBranch = user?.role === 'stylist' || user?.role === 'receptionist' ? String(user?.branch_id || '') : fBranch;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, b, s, st] = await Promise.all([
        get<Appointment[]>('/api/appointments', { from: addDaysISO(todayISO(), -14), to: addDaysISO(todayISO(), 60) }),
        get<Branch[]>('/api/branches'),
        get<Service[]>('/api/services'),
        get<Staff[]>('/api/staff'),
      ]);
      setRows(a); setBranches(b); setServices(s.filter((x) => x.active)); setStaff(st.filter((x) => x.active));
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const filtered = useMemo(() => rows.filter((a) => {
    if (a.date !== date) return false;
    if (scopedBranch && String(a.branch_id || '') !== scopedBranch) return false;
    if (fStaff && String(a.staff_id || '') !== fStaff) return false;
    if (fStatus && a.status !== fStatus) return false;
    if (q && !(a.customer_name + a.customer_phone + a.booking_ref + (a.service_name || '')).toLowerCase().includes(q.toLowerCase())) return false;
    if (user?.role === 'stylist' && user?.email) {
      // stylists see own column highlighted but still see branch schedule
    }
    return true;
  }).sort((a, b) => a.time.localeCompare(b.time)), [rows, date, scopedBranch, fStaff, fStatus, q]);

  const changeStatus = async (a: Appointment, status: string) => {
    try {
      await put('/api/appointments', { id: a.id, status });
      flash(`${a.booking_ref} → ${status}`);
      fetchAll();
    } catch (e: any) { flash(e.message); }
  };

  const remove = async () => {
    if (!delId) return;
    try { await del('/api/appointments', { id: delId }); flash('Appointment deleted'); setDelId(null); fetchAll(); }
    catch (e: any) { flash(e.message); }
  };

  if (loading) return <Spinner label="Loading appointments…" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">Appointment Management</h1>
          <p className="text-sm text-[#8a7460]">{filtered.length} booking{filtered.length !== 1 ? 's' : ''} on {fmtDate(date)}</p>
        </div>
        <button className="btn btn-gold" onClick={() => setModal({})}><Plus className="w-4 h-4" /> Walk-in / New booking</button>
      </div>

      {/* Date navigator + filters */}
      <div className="card p-4 mt-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex items-center gap-2">
          <button className="btn btn-line btn-sm" onClick={() => setDate(addDaysISO(date, -1))}><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex items-center gap-2 bg-[#faf6ef] border border-[#e2d5c3] rounded-lg px-3 py-1.5">
            <CalendarDays className="w-4 h-4 text-[#c9963f]" />
            <input type="date" className="bg-transparent text-sm font-semibold outline-none" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn btn-line btn-sm" onClick={() => setDate(addDaysISO(date, 1))}><ChevronRight className="w-4 h-4" /></button>
          <button className="btn btn-line btn-sm" onClick={() => setDate(todayISO())}>Today</button>
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <select className="inp !w-auto !py-2 text-sm" value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select className="inp !w-auto !py-2 text-sm" value={fStaff} onChange={(e) => setFStaff(e.target.value)}>
            <option value="">All stylists</option>
            {staff.filter((s) => !scopedBranch || String(s.branch_id) === scopedBranch).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="inp !w-auto !py-2 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a08a]" />
            <input className="inp !pl-9 !py-2 !w-48" placeholder="Search client / ref…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl min-w-[900px]">
            <thead><tr><th>Time</th><th>Ref</th><th>Client</th><th>Service</th><th>Stylist</th><th>Branch</th><th>Total</th><th>Status</th><th className="no-print">Actions</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="font-bold whitespace-nowrap"><Clock className="w-3.5 h-3.5 inline mr-1 text-[#c9963f]" />{fmtTime(a.time)}</td>
                  <td className="font-mono text-xs font-bold">{a.booking_ref}</td>
                  <td><span className="font-semibold">{a.customer_name}</span><div className="text-xs text-[#8a7460] flex items-center gap-1"><Phone className="w-3 h-3" />{a.customer_phone}</div></td>
                  <td className="max-w-[200px]"><span className="block truncate">{a.service_name}</span><span className="text-xs text-[#8a7460]">{a.duration} min</span></td>
                  <td>{a.staff_name || '—'}</td>
                  <td className="text-sm">{a.branch_name || branches.find((b) => b.id === a.branch_id)?.name || '—'}</td>
                  <td className="font-bold">{peso(a.total_price)}</td>
                  <td><StatusBadge status={a.status} /><div className="mt-1"><span className={`badge ${a.payment_status === 'paid' ? 'b-green' : 'b-gray'}`}>{a.payment_status}</span></div></td>
                  <td className="no-print">
                    <div className="flex flex-wrap gap-1">
                      {a.status === 'pending' && <button className="btn btn-gold btn-sm" onClick={() => changeStatus(a, 'confirmed')}>Confirm</button>}
                      {a.status === 'confirmed' && <button className="btn btn-dark btn-sm" onClick={() => changeStatus(a, 'in-progress')}>Start</button>}
                      {a.status === 'in-progress' && <button className="btn btn-gold btn-sm" onClick={() => changeStatus(a, 'completed')}>Complete</button>}
                      {['pending', 'confirmed'].includes(a.status) && <button className="btn btn-line btn-sm" onClick={() => setModal({ appt: a })}>Edit</button>}
                      {!['completed', 'cancelled'].includes(a.status) && <button className="btn btn-line btn-sm" onClick={() => changeStatus(a, 'cancelled')}>Cancel</button>}
                      {(user?.role === 'admin' || user?.role === 'manager') && <button className="btn btn-danger btn-sm" onClick={() => setDelId(a.id)}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9}><Empty title="No bookings for this day" hint="Try another date or create a walk-in booking." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ApptForm
          appt={modal.appt}
          branches={branches} services={services} staff={staff}
          defaultBranch={scopedBranch ? Number(scopedBranch) : undefined}
          onClose={() => setModal(null)}
          onSaved={(m) => { setModal(null); flash(m); fetchAll(); }}
        />
      )}
      {delId && <Confirm text="Delete this appointment permanently?" onYes={remove} onNo={() => setDelId(null)} />}
      <Toast msg={toast} />
    </div>
  );
}

function ApptForm({ appt, branches, services, staff, defaultBranch, onClose, onSaved }: {
  appt?: Appointment; branches: Branch[]; services: Service[]; staff: Staff[]; defaultBranch?: number;
  onClose: () => void; onSaved: (m: string) => void;
}) {
  const [form, setForm] = useState({
    customer_name: appt?.customer_name || '',
    customer_phone: appt?.customer_phone || '',
    branch_id: appt?.branch_id || defaultBranch || branches[0]?.id || 0,
    service_id: appt?.service_id || 0,
    staff_id: appt?.staff_id || 0,
    date: appt?.date || todayISO(),
    time: appt?.time || '10:00',
    notes: appt?.notes || '',
  });
  const [busy, setBusy] = useState<Appointment[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const svc = services.find((s) => s.id === Number(form.service_id));
  const bStaff = staff.filter((s) => !form.branch_id || s.branch_id === Number(form.branch_id));

  useEffect(() => {
    if (!form.branch_id || !form.date) return;
    get<Appointment[]>('/api/appointments', { branch_id: form.branch_id, date: form.date })
      .then((d) => setBusy(d.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show' && a.id !== appt?.id)))
      .catch(() => setBusy([]));
  }, [form.branch_id, form.date]);

  const clash = useMemo(() => {
    if (!svc || !form.staff_id) return null;
    const m = Number(form.time.slice(0, 2)) * 60 + Number(form.time.slice(3, 5));
    const end = m + svc.duration;
    return busy.find((a) => {
      if (a.staff_id !== Number(form.staff_id)) return false;
      const s = Number(a.time.slice(0, 2)) * 60 + Number(a.time.slice(3, 5));
      const e = s + (a.duration || 30);
      return m < e && end > s;
    });
  }, [busy, form.staff_id, form.time, svc]);

  const save = async () => {
    setErr('');
    if (!form.customer_name.trim() || !form.customer_phone.trim()) return setErr('Client name and phone are required.');
    if (!form.branch_id || !form.service_id) return setErr('Branch and service are required.');
    if (clash) return setErr(`Time clash with ${clash.booking_ref} (${clash.customer_name}). Pick another slot.`);
    setSaving(true);
    try {
      const st = staff.find((s) => s.id === Number(form.staff_id));
      const br = branches.find((b) => b.id === Number(form.branch_id));
      const payload: any = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        branch_id: Number(form.branch_id),
        branch_name: br?.name,
        service_id: Number(form.service_id),
        service_name: svc?.name,
        staff_id: form.staff_id ? Number(form.staff_id) : null,
        staff_name: st?.name || 'First available',
        items: svc ? [{ service_id: svc.id, name: svc.name, price: Number(svc.price), duration: svc.duration }] : [],
        date: form.date, time: form.time, duration: svc?.duration || 30,
        total_price: svc ? Number(svc.price) : 0,
        notes: form.notes.trim(),
      };
      if (appt) { await put('/api/appointments', { id: appt.id, ...payload }); onSaved('Appointment updated'); }
      else {
        // link customer if exists
        try {
          const found: any = await get('/api/customers', { phone: payload.customer_phone });
          if (Array.isArray(found) && found.length) payload.customer_id = found[0].id;
        } catch { /* ignore */ }
        payload.status = 'confirmed';
        await post('/api/appointments', payload);
        onSaved('Booking created & confirmed');
      }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal title={appt ? `Edit ${appt.booking_ref}` : 'New booking (walk-in / phone)'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client name *"><input className="inp" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="Maria Santos" /></Field>
        <Field label="Client phone *"><input className="inp" value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} placeholder="0917…" /></Field>
        <Field label="Branch"><select className="inp" value={form.branch_id} onChange={(e) => { set('branch_id', Number(e.target.value)); set('staff_id', 0); }}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Service"><select className="inp" value={form.service_id} onChange={(e) => set('service_id', Number(e.target.value))}><option value={0}>— Select —</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name} · {peso(s.price)}</option>)}</select></Field>
        <Field label="Stylist"><select className="inp" value={form.staff_id} onChange={(e) => set('staff_id', Number(e.target.value))}><option value={0}>First available</option>{bStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date"><input type="date" className="inp" value={form.date} min={todayISO()} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Time"><input type="time" className="inp" value={form.time} onChange={(e) => set('time', e.target.value)} /></Field>
        </div>
        <Field label="Notes" span><input className="inp" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" /></Field>
      </div>
      {clash && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">⚠ Overlaps {clash.booking_ref} ({clash.customer_name}, {fmtTime(clash.time)}).</p>}
      {svc && <p className="text-sm text-[#6b5d4f] mt-3">Duration <b>{svc.duration} min</b> · Price <b className="text-[#c9963f]">{peso(svc.price)}</b></p>}
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : appt ? 'Save changes' : 'Create booking'}</button>
      </div>
    </Modal>
  );
}
