import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, Truck, Pencil, Trash2, ArrowUpDown, Package } from 'lucide-react';
import { get, post, put, del } from '../lib/api';
import { peso, fmtDate } from '../lib/format';
import type { Product, Supplier, PurchaseOrder, Branch } from '../lib/types';
import { Spinner, Modal, Field, Toast, Confirm, Empty, StatusBadge } from '../components/ui';

export default function Inventory() {
  const [tab, setTab] = useState<'stock' | 'po' | 'suppliers'>('stock');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [q, setQ] = useState('');
  const [fBranch, setFBranch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [prodModal, setProdModal] = useState<null | { p?: Product }>(null);
  const [adjModal, setAdjModal] = useState<Product | null>(null);
  const [poModal, setPoModal] = useState<null | { po?: PurchaseOrder }>(null);
  const [supModal, setSupModal] = useState<null | { s?: Supplier }>(null);
  const [delWhat, setDelWhat] = useState<null | { kind: string; id: number }>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, s, o, b] = await Promise.all([
        get<Product[]>('/api/products'), get<Supplier[]>('/api/suppliers'),
        get<PurchaseOrder[]>('/api/purchase-orders'), get<Branch[]>('/api/branches'),
      ]);
      setProducts(p); setSuppliers(s); setPos(o); setBranches(b);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { fetchAll(); }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const filtered = useMemo(() => products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !(p.sku || '').toLowerCase().includes(q.toLowerCase())) return false;
    if (fBranch && String(p.branch_id || '') !== fBranch && p.branch_id) return false;
    if (lowOnly && p.stock > p.reorder_level) return false;
    return true;
  }), [products, q, fBranch, lowOnly]);

  const stats = useMemo(() => ({
    skus: products.length,
    value: products.reduce((a, p) => a + Number(p.cost) * p.stock, 0),
    low: products.filter((p) => p.stock <= p.reorder_level).length,
    openPO: pos.filter((o) => ['draft', 'ordered'].includes(o.status)).length,
  }), [products, pos]);

  const doDelete = async () => {
    if (!delWhat) return;
    try {
      const ep = delWhat.kind === 'product' ? '/api/products' : delWhat.kind === 'po' ? '/api/purchase-orders' : '/api/suppliers';
      await del(ep, { id: delWhat.id });
      flash('Deleted'); setDelWhat(null); fetchAll();
    } catch (e: any) { flash(e.message); }
  };

  const setPOStatus = async (po: PurchaseOrder, status: string) => {
    try { await put('/api/purchase-orders', { id: po.id, status }); flash(`${po.po_no} → ${status}`); fetchAll(); }
    catch (e: any) { flash(e.message); }
  };

  if (loading) return <Spinner label="Loading inventory…" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">Inventory & Purchasing</h1>
          <p className="text-sm text-[#8a7460]">{stats.skus} SKUs · {peso(stats.value)} stock value · {stats.low} low-stock · {stats.openPO} open POs</p>
        </div>
        <div className="flex bg-[#f3ebdd] rounded-xl p-1">
          <button className={`tabbtn ${tab === 'stock' ? 'on' : ''}`} onClick={() => setTab('stock')}>Stock</button>
          <button className={`tabbtn ${tab === 'po' ? 'on' : ''}`} onClick={() => setTab('po')}>Purchase Orders</button>
          <button className={`tabbtn ${tab === 'suppliers' ? 'on' : ''}`} onClick={() => setTab('suppliers')}>Suppliers</button>
        </div>
      </div>

      {tab === 'stock' && (
        <>
          <div className="card p-4 mt-4 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a08a]" />
              <input className="inp !pl-9" placeholder="Search SKU / name…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="inp !w-auto" value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button className={`btn btn-sm ${lowOnly ? 'btn-gold' : 'btn-line'}`} onClick={() => setLowOnly(!lowOnly)}>
              <AlertTriangle className="w-4 h-4" /> Low stock only
            </button>
            <button className="btn btn-gold btn-sm ml-auto" onClick={() => setProdModal({})}><Plus className="w-4 h-4" /> Add product</button>
          </div>
          <div className="card mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl min-w-[880px]">
                <thead><tr><th>Product</th><th>SKU</th><th>Branch</th><th>Cost</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((p) => {
                    const low = p.stock <= p.reorder_level;
                    return (
                      <tr key={p.id}>
                        <td><span className="font-semibold">{p.name}</span><div className="text-xs text-[#8a7460]">{p.brand || ''} {p.category || ''}</div></td>
                        <td className="font-mono text-xs">{p.sku || '—'}</td>
                        <td className="text-sm">{p.branch_id ? branches.find((b) => b.id === p.branch_id)?.name || '—' : 'All'}</td>
                        <td>{peso(p.cost)}</td>
                        <td className="font-semibold">{peso(p.price)}</td>
                        <td><span className={`font-bold ${low ? 'text-red-600' : ''}`}>{p.stock}</span><span className="text-xs text-[#8a7460]"> / rl {p.reorder_level}</span></td>
                        <td>{p.stock === 0 ? <span className="badge b-red">Out of stock</span> : low ? <span className="badge b-amber">Low stock</span> : <span className="badge b-green">OK</span>}</td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn btn-line btn-sm" title="Adjust stock" onClick={() => setAdjModal(p)}><ArrowUpDown className="w-3.5 h-3.5" /></button>
                            <button className="btn btn-line btn-sm" onClick={() => setProdModal({ p })}><Pencil className="w-3.5 h-3.5" /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDelWhat({ kind: 'product', id: p.id })}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={8}><Empty title="No products" /></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'po' && (
        <>
          <div className="flex justify-end mt-4">
            <button className="btn btn-gold btn-sm" onClick={() => setPoModal({})}><Plus className="w-4 h-4" /> New purchase order</button>
          </div>
          <div className="space-y-3 mt-3">
            {pos.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#f3ebdd] text-[#8a7460] flex items-center justify-center"><Truck className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-bold text-[#221512]">{o.po_no} <StatusBadge status={o.status} /></p>
                    <p className="text-xs text-[#8a7460]">{o.supplier_name} → {o.branch_name} · expected {o.expected_date ? fmtDate(o.expected_date) : '—'} · {(o.items || []).length} lines · <b className="text-[#221512]">{peso(o.total)}</b></p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {o.status === 'draft' && <button className="btn btn-dark btn-sm" onClick={() => setPOStatus(o, 'ordered')}>Mark ordered</button>}
                    {o.status === 'ordered' && <button className="btn btn-gold btn-sm" onClick={() => setPOStatus(o, 'received')}>Receive stock</button>}
                    {['draft', 'ordered'].includes(o.status) && <button className="btn btn-line btn-sm" onClick={() => setPoModal({ po: o })}>Edit</button>}
                    <button className="btn btn-danger btn-sm" onClick={() => setDelWhat({ kind: 'po', id: o.id })}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(o.items || []).map((it: any, i: number) => (
                    <span key={i} className="text-xs bg-[#faf6ef] border border-[#eee2cf] rounded-lg px-2 py-1">{it.qty}× {it.name} · {peso(it.cost)}</span>
                  ))}
                </div>
              </div>
            ))}
            {pos.length === 0 && <div className="card"><Empty title="No purchase orders" hint="Create one to restock from a supplier." /></div>}
          </div>
        </>
      )}

      {tab === 'suppliers' && (
        <>
          <div className="flex justify-end mt-4">
            <button className="btn btn-gold btn-sm" onClick={() => setSupModal({})}><Plus className="w-4 h-4" /> Add supplier</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {suppliers.map((s) => (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#221512]">{s.name}</p>
                    <p className="text-xs text-[#8a7460]">{s.contact_person || ''}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-[#f3ebdd]" onClick={() => setSupModal({ s })}><Pencil className="w-4 h-4 text-[#8a7460]" /></button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50" onClick={() => setDelWhat({ kind: 'supplier', id: s.id })}><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
                <p className="text-sm text-[#6b5d4f] mt-2">{s.phone || ''} {s.email ? `· ${s.email}` : ''}</p>
                <p className="text-xs text-[#8a7460]">{s.address || ''}</p>
              </div>
            ))}
            {suppliers.length === 0 && <div className="card col-span-3"><Empty title="No suppliers" /></div>}
          </div>
        </>
      )}

      {prodModal && <ProdForm p={prodModal.p} branches={branches} suppliers={suppliers} onClose={() => setProdModal(null)} onSaved={(m) => { setProdModal(null); flash(m); fetchAll(); }} />}
      {adjModal && <AdjustForm p={adjModal} onClose={() => setAdjModal(null)} onSaved={(m) => { setAdjModal(null); flash(m); fetchAll(); }} />}
      {poModal && <POForm po={poModal.po} branches={branches} suppliers={suppliers} products={products} onClose={() => setPoModal(null)} onSaved={(m) => { setPoModal(null); flash(m); fetchAll(); }} />}
      {supModal && <SupForm s={supModal.s} onClose={() => setSupModal(null)} onSaved={(m) => { setSupModal(null); flash(m); fetchAll(); }} />}
      {delWhat && <Confirm text="Delete this record?" onYes={doDelete} onNo={() => setDelWhat(null)} />}
      <Toast msg={toast} />
    </div>
  );
}

function ProdForm({ p, branches, suppliers, onClose, onSaved }: { p?: Product; branches: Branch[]; suppliers: Supplier[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({
    name: p?.name || '', sku: p?.sku || '', category: p?.category || 'Retail', brand: p?.brand || '',
    price: p?.price ?? 0, cost: p?.cost ?? 0, stock: p?.stock ?? 0, reorder_level: p?.reorder_level ?? 5,
    branch_id: p?.branch_id || 0, supplier_id: p?.supplier_id || 0, active: p?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('Product name required.');
    setSaving(true);
    try {
      const payload = { ...f, price: Number(f.price), cost: Number(f.cost), stock: Number(f.stock), reorder_level: Number(f.reorder_level), branch_id: f.branch_id || null, supplier_id: f.supplier_id || null };
      if (p) { await put('/api/products', { id: p.id, ...payload }); onSaved('Product updated'); }
      else { await post('/api/products', payload); onSaved('Product added'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={p ? 'Edit product' : 'Add product'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *" span><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="SKU"><input className="inp" value={f.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. LUM-001" /></Field>
        <Field label="Category"><select className="inp" value={f.category} onChange={(e) => set('category', e.target.value)}><option>Retail</option><option>Hair Care</option><option>Skin Care</option><option>Nail Care</option><option>Salon Use</option><option>Equipment</option></select></Field>
        <Field label="Brand"><input className="inp" value={f.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        <Field label="Branch"><select className="inp" value={f.branch_id} onChange={(e) => set('branch_id', Number(e.target.value))}><option value={0}>All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Supplier"><select className="inp" value={f.supplier_id} onChange={(e) => set('supplier_id', Number(e.target.value))}><option value={0}>—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Cost (₱)"><input type="number" className="inp" value={f.cost} onChange={(e) => set('cost', e.target.value)} /></Field>
        <Field label="SRP (₱)"><input type="number" className="inp" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
        <Field label="Stock"><input type="number" className="inp" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
        <Field label="Reorder level"><input type="number" className="inp" value={f.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} /></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function AdjustForm({ p, onClose, onSaved }: { p: Product; onClose: () => void; onSaved: (m: string) => void }) {
  const [qty, setQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!qty) return onClose();
    setSaving(true);
    try { await put('/api/products', { id: p.id, adjust: Number(qty) }); onSaved(`Stock ${qty > 0 ? '+' : ''}${qty} → ${p.stock + Number(qty)}`); }
    catch (e: any) { onSaved(e.message); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={`Adjust stock — ${p.name}`} onClose={onClose}>
      <p className="text-sm text-[#6b5d4f]">Current stock: <b>{p.stock}</b>. Enter a positive number to add stock, negative to deduct (damage, loss, salon use).</p>
      <div className="mt-3"><label className="lbl">Adjustment (+/-)</label><input type="number" className="inp" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
      <p className="text-sm mt-2">New stock: <b className="text-[#c9963f]">{p.stock + Number(qty)}</b></p>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Apply'}</button>
      </div>
    </Modal>
  );
}

function POForm({ po, branches, suppliers, products, onClose, onSaved }: { po?: PurchaseOrder; branches: Branch[]; suppliers: Supplier[]; products: Product[]; onClose: () => void; onSaved: (m: string) => void }) {
  const [supplierId, setSupplierId] = useState(po?.supplier_id || suppliers[0]?.id || 0);
  const [branchId, setBranchId] = useState(po?.branch_id || branches[0]?.id || 0);
  const [expected, setExpected] = useState(po?.expected_date || '');
  const [lines, setLines] = useState<any[]>(po?.items || []);
  const [pick, setPick] = useState(0);
  const [qty, setQty] = useState(10);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const total = lines.reduce((a, l) => a + Number(l.cost) * Number(l.qty), 0);
  const addLine = () => {
    const prod = products.find((p) => p.id === Number(pick));
    if (!prod) return;
    setLines((l) => [...l, { product_id: prod.id, name: prod.name, cost: Number(prod.cost), qty: Number(qty) }]);
  };
  const save = async () => {
    setErr('');
    if (!supplierId || !branchId) return setErr('Supplier and branch required.');
    if (!lines.length) return setErr('Add at least one line item.');
    setSaving(true);
    try {
      const sup = suppliers.find((s) => s.id === Number(supplierId));
      const br = branches.find((b) => b.id === Number(branchId));
      const payload = { supplier_id: Number(supplierId), supplier_name: sup?.name, branch_id: Number(branchId), branch_name: br?.name, items: lines, total, expected_date: expected || null, status: po?.status || 'draft' };
      if (po) { await put('/api/purchase-orders', { id: po.id, ...payload }); onSaved('PO updated'); }
      else { await post('/api/purchase-orders', payload); onSaved('PO created'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={po ? `Edit ${po.po_no}` : 'New purchase order'} onClose={onClose} wide>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Supplier"><select className="inp" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Branch"><select className="inp" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Expected date"><input type="date" className="inp" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
      </div>
      <div className="flex gap-2 mt-3 items-end">
        <div className="flex-1"><label className="lbl">Product</label><select className="inp" value={pick} onChange={(e) => setPick(Number(e.target.value))}><option value={0}>— Select —</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · cost {peso(p.cost)} · stock {p.stock}</option>)}</select></div>
        <div className="w-24"><label className="lbl">Qty</label><input type="number" className="inp" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
        <button className="btn btn-dark" onClick={addLine}><Plus className="w-4 h-4" /> Add</button>
      </div>
      <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#faf6ef] rounded-xl p-2.5 text-sm">
            <Package className="w-4 h-4 text-[#c9963f]" />
            <span className="flex-1 font-medium">{l.name}</span>
            <span>{l.qty} × {peso(l.cost)}</span>
            <span className="font-bold w-24 text-right">{peso(Number(l.qty) * Number(l.cost))}</span>
            <button className="text-red-400 font-bold px-1" onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-[#8a7460]">No lines yet.</p>}
      </div>
      <div className="flex justify-between font-bold text-lg mt-3 pt-2 border-t border-[#eee2cf]"><span>Total</span><span>{peso(total)}</span></div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save PO'}</button>
      </div>
    </Modal>
  );
}

function SupForm({ s, onClose, onSaved }: { s?: Supplier; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ name: s?.name || '', contact_person: s?.contact_person || '', phone: s?.phone || '', email: s?.email || '', address: s?.address || '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setF((o) => ({ ...o, [k]: v }));
  const save = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('Supplier name required.');
    setSaving(true);
    try {
      if (s) { await put('/api/suppliers', { id: s.id, ...f }); onSaved('Supplier updated'); }
      else { await post('/api/suppliers', f); onSaved('Supplier added'); }
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };
  return (
    <Modal title={s ? 'Edit supplier' : 'Add supplier'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company *" span><input className="inp" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Contact person"><input className="inp" value={f.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></Field>
        <Field label="Phone"><input className="inp" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input className="inp" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Address"><input className="inp" value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-3">{err}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn btn-line" onClick={onClose}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}
