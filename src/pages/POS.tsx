import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, User, Printer, Check, ShoppingCart } from 'lucide-react';
import { get, post } from '../lib/api';
import { peso, fmtTime } from '../lib/format';
import type { Branch, Service, Staff, Customer, Product, Transaction, Appointment } from '../lib/types';
import { Spinner, Modal, Toast, Field, Empty } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

interface CartItem { kind: 'service' | 'product'; ref_id: number; name: string; price: number; qty: number; product_id?: number; service_id?: number; }

export default function POS() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'services' | 'products'>('services');
  const [q, setQ] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [branchId, setBranchId] = useState<number>(0);
  const [staffId, setStaffId] = useState<number>(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custQ, setCustQ] = useState('');
  const [custHits, setCustHits] = useState<Customer[]>([]);
  const [pendingAppts, setPendingAppts] = useState<Appointment[]>([]);
  const [apptId, setApptId] = useState<number>(0);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState('Cash');
  const [tendered, setTendered] = useState('');
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    Promise.all([
      get<Service[]>('/api/services'),
      get<Product[]>('/api/products'),
      get<Staff[]>('/api/staff'),
      get<Branch[]>('/api/branches'),
      get<Appointment[]>('/api/appointments', { status: 'confirmed' }),
      get<Transaction[]>('/api/transactions'),
    ]).then(([s, p, st, b, a, t]) => {
      setServices(s.filter((x) => x.active)); setProducts(p.filter((x) => x.active)); setStaff(st.filter((x) => x.active));
      setBranches(b); setPendingAppts(a); setHistory(t.slice(0, 60));
      setBranchId(user?.branch_id || b[0]?.id || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (custQ.trim().length < 2) { setCustHits([]); return; }
    const t = setTimeout(() => get<Customer[]>('/api/customers', { q: custQ }).then(setCustHits).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [custQ]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const catalog = useMemo(() => {
    const needle = q.toLowerCase();
    if (tab === 'services') return services.filter((s) => !needle || s.name.toLowerCase().includes(needle) || s.category.toLowerCase().includes(needle));
    return products.filter((p) => (!branchId || !p.branch_id || p.branch_id === branchId) && (!needle || p.name.toLowerCase().includes(needle)));
  }, [tab, q, services, products, branchId]);

  const addToCart = (kind: 'service' | 'product', id: number) => {
    if (kind === 'service') {
      const s = services.find((x) => x.id === id)!;
      setCart((c) => {
        const ex = c.find((i) => i.kind === 'service' && i.ref_id === id);
        if (ex) return c.map((i) => (i === ex ? { ...i, qty: i.qty + 1 } : i));
        return [...c, { kind, ref_id: id, name: s.name, price: Number(s.price), qty: 1, service_id: id }];
      });
    } else {
      const p = products.find((x) => x.id === id)!;
      if (p.stock <= 0) return flash(`${p.name} is out of stock`);
      setCart((c) => {
        const ex = c.find((i) => i.kind === 'product' && i.ref_id === id);
        const curQty = ex ? ex.qty : 0;
        if (curQty + 1 > p.stock) { flash(`Only ${p.stock} × ${p.name} in stock`); return c; }
        if (ex) return c.map((i) => (i === ex ? { ...i, qty: i.qty + 1 } : i));
        return [...c, { kind, ref_id: id, name: p.name, price: Number(p.price), qty: 1, product_id: id }];
      });
    }
  };

  const bump = (it: CartItem, d: number) =>
    setCart((c) => c.map((i) => (i === it ? { ...i, qty: Math.max(1, i.qty + d) } : i)));

  const loadAppt = (a: Appointment) => {
    setApptId(a.id);
    setBranchId(a.branch_id || branchId);
    if (a.staff_id) setStaffId(a.staff_id);
    const items: CartItem[] = (a.items && a.items.length ? a.items : [{ service_id: a.service_id, name: a.service_name, price: a.total_price }])
      .map((it: any) => ({ kind: 'service' as const, ref_id: it.service_id || 0, name: it.name, price: Number(it.price), qty: 1, service_id: it.service_id || undefined }));
    setCart(items);
    if (a.customer_id) get<Customer[]>('/api/customers').then((all) => setCustomer(all.find((c) => c.id === a.customer_id) || null)).catch(() => {});
    else setCustomer(null);
    flash(`Loaded ${a.booking_ref} into cart`);
  };

  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discAmt = Math.min(subtotal, Number(discount) || 0);
  const tax = (subtotal - discAmt) * 0.12;
  const total = subtotal - discAmt + tax;
  const change = Math.max(0, (Number(tendered) || 0) - total);

  const checkout = async () => {
    if (!cart.length) return flash('Cart is empty');
    if (!branchId) return flash('Select a branch');
    if (!staffId) return flash('Select a stylist / cashier');
    if (payMethod === 'Cash' && (Number(tendered) || 0) < total) return flash('Tendered amount is less than total');
    setProcessing(true);
    try {
      const br = branches.find((b) => b.id === branchId);
      const st = staff.find((s) => s.id === staffId);
      const txn = await post<Transaction>('/api/transactions', {
        branch_id: branchId, branch_name: br?.name,
        staff_id: staffId, staff_name: st?.name,
        customer_id: customer?.id || null, customer_name: customer?.name || 'Walk-in',
        appointment_id: apptId || null,
        items: cart.map((i) => ({ kind: i.kind, name: i.name, price: i.price, qty: i.qty, product_id: i.product_id, service_id: i.service_id })),
        subtotal, discount: discAmt, tax, total,
        payment_method: payMethod,
        amount_tendered: payMethod === 'Cash' ? Number(tendered) : total,
        change_due: payMethod === 'Cash' ? change : 0,
        cashier: user?.name,
      });
      setReceipt(txn);
      setCart([]); setDiscount(0); setTendered(''); setApptId(0);
      setHistory((h) => [txn, ...h]);
      get<Product[]>('/api/products').then((p) => setProducts(p.filter((x) => x.active))).catch(() => {});
    } catch (e: any) { flash(e.message); } finally { setProcessing(false); }
  };

  if (loading) return <Spinner label="Loading POS…" />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#221512]">Point of Sale & Billing</h1>
          <p className="text-sm text-[#8a7460]">Services + retail in one cart · auto stock deduction · loyalty points</p>
        </div>
        <button className="btn btn-line" onClick={() => setShowHistory(true)}><ShoppingCart className="w-4 h-4" /> Sales history</button>
      </div>

      {pendingAppts.length > 0 && (
        <div className="card p-3 mt-4 flex gap-2 overflow-x-auto items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8a7460] whitespace-nowrap px-1">Charge<br />booking:</span>
          {pendingAppts.filter((a) => !branchId || a.branch_id === branchId).slice(0, 10).map((a) => (
            <button key={a.id} onClick={() => loadAppt(a)} className={`shrink-0 text-left border rounded-xl px-3 py-2 text-xs ${apptId === a.id ? 'border-[#c9963f] bg-[#fdf6e7]' : 'border-[#e2d5c3] bg-white hover:border-[#c9963f]'}`}>
              <span className="font-bold">{a.booking_ref}</span> · {fmtTime(a.time)}
              <span className="block text-[#6b5d4f]">{a.customer_name} — {peso(a.total_price)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4 mt-4">
        {/* Catalog */}
        <div className="lg:col-span-3 card p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex bg-[#f3ebdd] rounded-xl p-1">
              <button className={`tabbtn ${tab === 'services' ? 'on' : ''}`} onClick={() => setTab('services')}>Services</button>
              <button className={`tabbtn ${tab === 'products' ? 'on' : ''}`} onClick={() => setTab('products')}>Retail</button>
            </div>
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a08a]" />
              <input className="inp !pl-9" placeholder={`Search ${tab}…`} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 max-h-[560px] overflow-y-auto pr-1">
            {tab === 'services' && (catalog as Service[]).map((s) => (
              <button key={s.id} onClick={() => addToCart('service', s.id)} className="text-left border border-[#e2d5c3] rounded-xl p-3 bg-white hover:border-[#c9963f] hover:shadow transition-all">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#c9963f]">{s.category}</p>
                <p className="font-semibold text-sm text-[#221512] leading-snug">{s.name}</p>
                <p className="text-xs text-[#8a7460]">{s.duration} min</p>
                <p className="font-bold text-[#221512] mt-1">{peso(s.price)}</p>
              </button>
            ))}
            {tab === 'products' && (catalog as Product[]).map((p) => (
              <button key={p.id} onClick={() => addToCart('product', p.id)} className="text-left border border-[#e2d5c3] rounded-xl p-3 bg-white hover:border-[#c9963f] hover:shadow transition-all">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a7460]">{p.brand || p.category || 'Retail'}</p>
                <p className="font-semibold text-sm text-[#221512] leading-snug">{p.name}</p>
                <p className={`text-xs font-semibold ${p.stock <= p.reorder_level ? 'text-red-500' : 'text-green-600'}`}>{p.stock} in stock</p>
                <p className="font-bold text-[#221512] mt-1">{peso(p.price)}</p>
              </button>
            ))}
            {catalog.length === 0 && <div className="col-span-3"><Empty title="Nothing found" /></div>}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-2 card p-4 flex flex-col max-h-[760px]">
          <p className="font-display text-lg font-semibold text-[#221512]">Current sale</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className="lbl">Branch</label>
              <select className="inp" value={branchId} onChange={(e) => setBranchId(Number(e.target.value))}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Stylist / Cashier *</label>
              <select className="inp" value={staffId} onChange={(e) => setStaffId(Number(e.target.value))}>
                <option value={0}>— Select —</option>
                {staff.filter((s) => !branchId || s.branch_id === branchId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {/* customer picker */}
          <div className="mt-2 relative">
            <label className="lbl">Customer</label>
            {customer ? (
              <div className="flex items-center justify-between bg-[#fdf6e7] border border-[#e8c987] rounded-xl px-3 py-2">
                <span className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-[#c9963f]" />{customer.name} <span className="text-xs text-[#8a7460]">{customer.loyalty_points || 0} pts</span></span>
                <button className="text-xs font-bold text-red-500" onClick={() => setCustomer(null)}>Remove</button>
              </div>
            ) : (
              <>
                <input className="inp" placeholder="Search client by name/phone…" value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                {custHits.length > 0 && (
                  <div className="absolute z-10 inset-x-0 top-full mt-1 bg-white border border-[#e2d5c3] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {custHits.slice(0, 8).map((c) => (
                      <button key={c.id} onClick={() => { setCustomer(c); setCustHits([]); setCustQ(''); }} className="w-full text-left px-3 py-2 hover:bg-[#faf6ef] text-sm">
                        <span className="font-semibold">{c.name}</span> <span className="text-[#8a7460]">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* items */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-2 min-h-[120px] border-y border-[#f3ead9] py-3">
            {cart.map((it, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#faf6ef] rounded-xl p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{it.name}</p>
                  <p className="text-xs text-[#8a7460]">{it.kind} · {peso(it.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded hover:bg-white" onClick={() => bump(it, -1)}><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-sm font-bold w-5 text-center">{it.qty}</span>
                  <button className="p-1 rounded hover:bg-white" onClick={() => bump(it, 1)}><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <span className="text-sm font-bold w-20 text-right">{peso(it.price * it.qty)}</span>
                <button className="p-1 rounded hover:bg-red-50" onClick={() => setCart((c) => c.filter((x) => x !== it))}><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            ))}
            {cart.length === 0 && <p className="text-sm text-[#8a7460] text-center py-6">Cart is empty — tap items to add.</p>}
          </div>

          {/* totals */}
          <div className="pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-[#8a7460]">Subtotal</span><span className="font-semibold">{peso(subtotal)}</span></div>
            <div className="flex justify-between items-center"><span className="text-[#8a7460]">Discount (₱)</span><input type="number" min={0} className="inp !w-28 !py-1 text-right" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
            <div className="flex justify-between"><span className="text-[#8a7460]">VAT (12%)</span><span className="font-semibold">{peso(tax)}</span></div>
            <div className="flex justify-between text-lg font-bold text-[#221512] pt-1 border-t border-[#eee2cf]"><span>Total</span><span>{peso(total)}</span></div>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {['Cash', 'Card', 'GCash', 'Maya'].map((m) => (
              <button key={m} onClick={() => setPayMethod(m)} className={`py-2 rounded-lg text-xs font-bold border ${payMethod === m ? 'bg-[#221512] text-white border-[#221512]' : 'border-[#e2d5c3] text-[#6b5d4f]'}`}>{m}</button>
            ))}
          </div>
          {payMethod === 'Cash' && (
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-[#8a7460]">Tendered</span>
              <input type="number" className="inp !w-36 !py-1.5 text-right font-bold" placeholder="0.00" value={tendered} onChange={(e) => setTendered(e.target.value)} />
            </div>
          )}
          {payMethod === 'Cash' && tendered && <div className="flex justify-between text-sm mt-1"><span className="text-[#8a7460]">Change</span><span className="font-bold text-green-600">{peso(change)}</span></div>}
          <button className="btn btn-gold w-full mt-3 !py-3" disabled={processing || !cart.length} onClick={checkout}>
            {processing ? 'Processing…' : <><Check className="w-5 h-5" /> Charge {peso(total)}</>}
          </button>
        </div>
      </div>

      {receipt && <ReceiptModal txn={receipt} onClose={() => setReceipt(null)} />}
      {showHistory && (
        <Modal title="Sales history" onClose={() => setShowHistory(false)} wide>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="tbl min-w-[640px]">
              <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Stylist</th><th>Method</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs font-bold">{t.invoice_no}</td>
                    <td className="text-xs">{(t.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                    <td>{t.customer_name}</td>
                    <td>{t.staff_name}</td>
                    <td><span className="badge b-gray">{t.payment_method}</span></td>
                    <td className="font-bold">{peso(t.total)}</td>
                    <td><button className="btn btn-line btn-sm" onClick={() => setReceipt(t)}>Receipt</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      <Toast msg={toast} />
    </div>
  );
}

export function ReceiptModal({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  return (
    <Modal title={`Receipt ${txn.invoice_no}`} onClose={onClose}>
      <div className="bg-white border border-dashed border-[#c9963f] rounded-xl p-5 text-sm" id="receipt-print">
        <p className="font-display text-xl font-bold text-center text-[#221512]">Lumière Salon & Spa</p>
        <p className="text-center text-xs text-[#8a7460]">{txn.branch_name} · {txn.invoice_no}</p>
        <p className="text-center text-xs text-[#8a7460]">{(txn.created_at || '').slice(0, 16).replace('T', ' ')} · Cashier: {txn.cashier || '—'}</p>
        <p className="text-center text-xs text-[#8a7460]">Client: {txn.customer_name} · Stylist: {txn.staff_name}</p>
        <div className="border-t border-dashed border-[#e2d5c3] my-3" />
        {(txn.items || []).map((it: any, i: number) => (
          <div key={i} className="flex justify-between py-1">
            <span>{it.qty}× {it.name}</span>
            <span className="font-semibold">{peso(Number(it.price) * Number(it.qty || 1))}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-[#e2d5c3] my-3" />
        <Row k="Subtotal" v={peso(txn.subtotal)} />
        <Row k="Discount" v={'−' + peso(txn.discount)} />
        <Row k="VAT (12%)" v={peso(txn.tax)} />
        <div className="flex justify-between font-bold text-lg mt-1"><span>TOTAL</span><span>{peso(txn.total)}</span></div>
        <Row k={txn.payment_method + ' tendered'} v={peso(txn.amount_tendered)} />
        <Row k="Change" v={peso(txn.change_due)} />
        <p className="text-center text-xs text-[#8a7460] mt-4">Thank you for glowing with Lumière! ✨<br />Earn 1 point per ₱100 · VAT inclusive</p>
      </div>
      <div className="flex justify-end gap-2 mt-4 no-print">
        <button className="btn btn-line" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</button>
        <button className="btn btn-gold" onClick={onClose}>New sale</button>
      </div>
    </Modal>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between py-0.5 text-[#4a3a30]"><span>{k}</span><span className="font-semibold">{v}</span></div>;
}
