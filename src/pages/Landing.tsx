import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Scissors, MapPin, Clock, Phone, Star, Sparkles, Check, ChevronLeft, ChevronRight,
  CalendarCheck, User, BadgeCheck, Heart, Leaf, Award, ArrowRight, X,
} from 'lucide-react';
import { get, post } from '../lib/api';
import type { Branch, Service, Staff, Appointment } from '../lib/types';
import { peso, fmtDate, fmtTime, todayISO, addDaysISO, toMin, toHM } from '../lib/format';

const SLOT_STEP = 30; // minutes

export default function Landing() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    get<Branch[]>('/api/branches').then((d) => setBranches(d.filter((b) => b.active))).catch(() => {});
    get<Service[]>('/api/services').then((d) => setServices(d.filter((s) => s.active))).catch(() => {});
    get<Staff[]>('/api/staff').then((d) => setStaff(d.filter((s) => s.active))).catch(() => {});
  }, []);

  const featured = useMemo(() => {
    const cats = ['Hair', 'Spa & Massage', 'Nails', 'Facial'];
    return cats
      .map((c) => services.filter((s) => s.category.toLowerCase().includes(c.toLowerCase().split(' ')[0])).slice(0, 2))
      .flat()
      .slice(0, 6);
  }, [services]);
  const topStylists = useMemo(() => [...staff].sort((a, b) => b.rating - a.rating).slice(0, 3), [staff]);

  return (
    <div className="min-h-screen bg-[#faf6ef]">
      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#180d0bee] backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d9ae5f] to-[#b9862f] text-white flex items-center justify-center"><Scissors className="w-5 h-5" /></span>
            <span className="font-display text-xl font-bold text-[#f7ecd9]">Lumière <span className="gold-text">Salon & Spa</span></span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#e6d9c4]">
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#stylists" className="hover:text-white">Stylists</a>
            <a href="#branches" className="hover:text-white">Branches</a>
            <a href="#reviews" className="hover:text-white">Reviews</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex text-sm font-semibold text-[#e6d9c4] hover:text-white px-3 py-2">Staff Login</Link>
            <button onClick={() => setBookOpen(true)} className="btn btn-gold btn-sm !py-2.5"><CalendarCheck className="w-4 h-4" /> Book Now</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative min-h-[92vh] flex items-center pt-16">
        <img src="/images/hero.jpg" alt="Lumière salon interior" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-20 w-full">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#f0dfc2] rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-[#e8c987]" /> {branches.length || 3} branches · Rated 4.9 by 2,400+ clients
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white mt-5 leading-[1.05]">
              Look radiant.<br />Feel <span className="gold-text italic">lumière.</span>
            </h1>
            <p className="text-[#e6d9c4] text-lg mt-5 max-w-xl">
              Premium hair, spa, nails and facial treatments by master stylists. Book your chair in under a minute — pick a branch, choose your stylist, grab a time slot.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={() => setBookOpen(true)} className="btn btn-gold !px-7 !py-3.5 !text-base">
                <CalendarCheck className="w-5 h-5" /> Book Appointment
              </button>
              <a href="#services" className="btn !px-7 !py-3.5 !text-base bg-white/10 border border-white/25 text-white backdrop-blur hover:bg-white/20">
                Explore Services <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10 text-sm text-[#e6d9c4]">
              <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-[#e8c987]" /> DOT-certified stylists</span>
              <span className="flex items-center gap-2"><Leaf className="w-4 h-4 text-[#e8c987]" /> Organic products</span>
              <span className="flex items-center gap-2"><Award className="w-4 h-4 text-[#e8c987]" /> Best Salon 2025</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="bg-[#221512] text-center">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[['12+', 'Years of artistry'], ['2.4k+', 'Happy clients'], ['15+', 'Master stylists'], ['4.9★', 'Average rating']].map(([n, l]) => (
            <div key={l} className="py-6">
              <p className="font-display text-2xl md:text-3xl font-bold gold-text">{n}</p>
              <p className="text-xs text-[#b3a08a] uppercase tracking-wider mt-1">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="max-w-7xl mx-auto px-4 md:px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9963f]">Our Menu</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-[#221512] mt-2">Signature treatments</h2>
          <p className="text-[#6b5d4f] mt-3">Transparent pricing, premium products, zero surprises. Every service includes a complimentary consultation.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {(featured.length ? featured : services.slice(0, 6)).map((s) => (
            <div key={s.id} className="card overflow-hidden group hover:shadow-xl transition-shadow">
              <div className="h-44 overflow-hidden">
                <img src={catImage(s.category)} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#c9963f]">{s.category}</p>
                    <h3 className="font-display text-lg font-semibold text-[#221512] mt-0.5">{s.name}</h3>
                  </div>
                  <p className="font-bold text-[#221512] whitespace-nowrap">{peso(s.price)}</p>
                </div>
                <p className="text-sm text-[#6b5d4f] mt-1.5 line-clamp-2">{s.description || `${s.duration} minutes of pure indulgence.`}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-[#8a7460] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {s.duration} mins</span>
                  <button onClick={() => setBookOpen(true)} className="btn btn-dark btn-sm">Book <ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STYLISTS */}
      <section id="stylists" className="bg-[#221512] py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8c987]">The Artists</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mt-2">Meet your stylists</h2>
            <p className="text-[#b3a08a] mt-3">Hand-picked, continuously trained, and obsessed with the details.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 mt-10">
            {topStylists.map((s, i) => (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur hover:bg-white/10 transition-colors">
                <img src={s.photo || `/images/stylist-${(i % 2) + 1}.jpg`} alt={s.name} className="w-28 h-28 rounded-full object-cover mx-auto border-[3px] border-[#c9963f]" />
                <h3 className="font-display text-xl font-semibold text-white mt-4">{s.name}</h3>
                <p className="text-sm text-[#e8c987]">{s.role}</p>
                <p className="text-xs text-[#b3a08a] mt-1">{s.specialties || 'All services'}</p>
                <p className="text-sm text-white mt-2 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-[#e8c987] text-[#e8c987]" /> {Number(s.rating).toFixed(1)}
                </p>
                <button onClick={() => setBookOpen(true)} className="btn btn-gold btn-sm mt-4 w-full">Book with {s.name.split(' ')[0]}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BRANCHES */}
      <section id="branches" className="max-w-7xl mx-auto px-4 md:px-6 py-20 scroll-mt-16">
        <div className="text-center max-w-xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9963f]">Find Us</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-[#221512] mt-2">Three branches, one standard</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {branches.map((b) => (
            <div key={b.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-[#221512] text-[#e8c987] flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
              <h3 className="font-display text-xl font-semibold text-[#221512] mt-4">{b.name}</h3>
              <p className="text-sm text-[#6b5d4f] mt-1">{b.address}</p>
              <div className="flex flex-col gap-1.5 mt-4 text-sm text-[#4a3a30]">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#c9963f]" /> Daily {fmtTime(b.open_time)} – {fmtTime(b.close_time)}</span>
                <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#c9963f]" /> {b.phone}</span>
              </div>
              <button onClick={() => setBookOpen(true)} className="btn btn-line w-full mt-5">Book at this branch</button>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="bg-[#f3ebdd] py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9963f]">Love Notes</p>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-[#221512] mt-2">Clients keep coming back</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {[
              ['Bianca R.', 'Makati', 'Best balayage in the metro, hands down. The online booking took me literally 40 seconds and my stylist was already waiting.'],
              ['Miguel S.', 'BGC', 'Booked a full package for my wedding — hair, facial, massage. Flawless from confirmation text to the last snip.'],
              ['Aira D.', 'Quezon City', 'My keratin treatment lasted 6 months. The QC branch feels like a boutique hotel spa. Worth every peso.'],
            ].map(([n, c, q]) => (
              <div key={n} className="card p-6">
                <div className="flex gap-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-[#c9963f] text-[#c9963f]" />)}</div>
                <p className="text-[#4a3a30] mt-3 italic">“{q}”</p>
                <p className="mt-4 font-semibold text-[#221512] flex items-center gap-2"><Heart className="w-4 h-4 text-[#c9963f]" /> {n} <span className="font-normal text-[#8a7460]">· {c}</span></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <div className="relative rounded-3xl overflow-hidden">
          <img src="/images/service-spa.jpg" alt="Spa" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#180d0bd9]" />
          <div className="relative p-10 md:p-16 text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white">Your chair is waiting.</h2>
            <p className="text-[#e6d9c4] mt-3">Same-day slots fill fast — reserve yours now and get a free hair spa upgrade on your first visit.</p>
            <button onClick={() => setBookOpen(true)} className="btn btn-gold !px-8 !py-3.5 !text-base mt-7"><CalendarCheck className="w-5 h-5" /> Book Appointment</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#180d0b] text-[#b3a08a] py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d9ae5f] to-[#b9862f] text-white flex items-center justify-center"><Scissors className="w-5 h-5" /></span>
              <span className="font-display text-xl font-bold text-[#f7ecd9]">Lumière Salon & Spa</span>
            </div>
            <p className="text-sm mt-3 max-w-xs">Metro Manila's premium salon & spa experience since 2014. Walk-ins welcome, bookings loved.</p>
          </div>
          <div>
            <p className="font-bold text-[#f7ecd9] text-sm uppercase tracking-wider">Branches</p>
            <div className="mt-3 space-y-2 text-sm">{branches.map((b) => <p key={b.id}>{b.name} — {b.phone}</p>)}</div>
          </div>
          <div>
            <p className="font-bold text-[#f7ecd9] text-sm uppercase tracking-wider">Staff</p>
            <div className="mt-3 space-y-2 text-sm">
              <Link to="/login" className="block hover:text-white">Management login →</Link>
              <p>Open daily 9:00 AM – 9:00 PM</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs mt-10 text-[#6b5d4f]">© 2026 Lumière Salon & Spa. All rights reserved.</p>
      </footer>

      {bookOpen && <BookingWizard branches={branches} services={services} staff={staff} onClose={() => setBookOpen(false)} />}
    </div>
  );
}

function catImage(cat: string) {
  const c = cat.toLowerCase();
  if (c.includes('hair')) return '/images/service-hair.jpg';
  if (c.includes('spa') || c.includes('massage')) return '/images/service-spa.jpg';
  if (c.includes('nail')) return '/images/service-nails.jpg';
  if (c.includes('facial') || c.includes('skin')) return '/images/service-facial.jpg';
  return '/images/hero.jpg';
}

/* ---------------- BOOKING WIZARD ---------------- */
function BookingWizard({ branches, services, staff, onClose }: { branches: Branch[]; services: Service[]; staff: Staff[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [staffId, setStaffId] = useState<number | null | 'any'>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<Appointment[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Appointment | null>(null);
  const [error, setError] = useState('');

  const branch = branches.find((b) => b.id === branchId);
  const chosen = services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = chosen.reduce((a, s) => a + Number(s.price), 0);
  const totalDur = chosen.reduce((a, s) => a + Number(s.duration), 0);
  const branchStaff = useMemo(() => staff.filter((s) => (branchId ? s.branch_id === branchId : true)), [staff, branchId]);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysISO(todayISO(), i)), []);

  useEffect(() => {
    if (!branchId || !date) return;
    setLoadingSlots(true);
    get<Appointment[]>('/api/appointments', { branch_id: branchId, date })
      .then((d) => setBusy(d.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show')))
      .catch(() => setBusy([]))
      .finally(() => setLoadingSlots(false));
  }, [branchId, date]);

  const slots = useMemo(() => {
    if (!branch) return [];
    const open = toMin(branch.open_time || '09:00');
    const close = toMin(branch.close_time || '21:00');
    const dur = totalDur || 30;
    const list: { t: string; free: boolean }[] = [];
    for (let m = open; m + dur <= close; m += SLOT_STEP) {
      const t = toHM(m);
      const end = m + dur;
      const clash = busy.some((a) => {
        if (staffId && staffId !== 'any' && a.staff_id !== staffId) return false;
        const s = toMin(a.time);
        const e = s + (Number(a.duration) || 30);
        return m < e && end > s;
      });
      // Hide past slots today
      if (date === todayISO()) {
        const now = new Date();
        if (m <= now.getHours() * 60 + now.getMinutes() + 30) { list.push({ t, free: false }); continue; }
      }
      list.push({ t, free: !clash });
    }
    return list;
  }, [branch, busy, totalDur, staffId, date]);

  const toggleService = (id: number) =>
    setServiceIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const canNext = [!!branchId, serviceIds.length > 0, staffId !== null, !!time, name.trim().length >= 2 && phone.trim().length >= 7][step];

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      // Upsert customer by phone
      let custId: number | null = null;
      try {
        const found: any = await get('/api/customers', { phone: phone.trim() });
        if (Array.isArray(found) && found.length) custId = found[0].id;
      } catch { /* ignore */ }
      if (!custId) {
        const c: any = await post('/api/customers', { name: name.trim(), phone: phone.trim(), notes: 'Booked via website' });
        custId = c.id;
      }
      const styl = staffId && staffId !== 'any' ? staff.find((s) => s.id === staffId) : null;
      const appt = await post<Appointment>('/api/appointments', {
        customer_id: custId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        branch_id: branchId,
        branch_name: branch?.name,
        staff_id: styl ? styl.id : null,
        staff_name: styl ? styl.name : 'First available',
        service_id: chosen[0]?.id || null,
        service_name: chosen.map((s) => s.name).join(' + '),
        items: chosen.map((s) => ({ service_id: s.id, name: s.name, price: Number(s.price), duration: Number(s.duration) })),
        date, time, duration: totalDur, total_price: totalPrice, notes: notes.trim(),
      });
      setDone(appt);
      setStep(5);
    } catch (e: any) {
      setError(e.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Branch', 'Services', 'Stylist', 'Date & Time', 'Details'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#faf6ef] w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="bg-[#221512] px-5 md:px-7 py-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-display text-xl md:text-2xl font-bold text-white">Book your appointment</h3>
            {step < 5 && <p className="text-xs text-[#b3a08a] mt-0.5">Step {step + 1} of 5 — {steps[step]}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-[#b3a08a]"><X className="w-5 h-5" /></button>
        </div>
        {step < 5 && (
          <div className="flex gap-1.5 px-5 md:px-7 pt-4 shrink-0">
            {steps.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#c9963f]' : 'bg-[#e6d9c4]'}`} />)}
          </div>
        )}

        <div className="overflow-y-auto p-5 md:p-7 flex-1">
          {step === 0 && (
            <div className="space-y-3">
              <p className="font-semibold text-[#221512]">Choose a branch</p>
              {branches.map((b) => (
                <button key={b.id} onClick={() => setBranchId(b.id)} className={`w-full text-left card p-4 flex items-center gap-4 transition-all ${branchId === b.id ? '!border-[#c9963f] ring-2 ring-[#c9963f]/30' : 'hover:shadow-md'}`}>
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${branchId === b.id ? 'bg-[#c9963f] text-white' : 'bg-[#f3ebdd] text-[#8a7460]'}`}><MapPin className="w-5 h-5" /></span>
                  <span className="flex-1">
                    <span className="block font-semibold text-[#221512]">{b.name}</span>
                    <span className="block text-sm text-[#6b5d4f]">{b.address}</span>
                    <span className="block text-xs text-[#8a7460] mt-0.5">Daily {fmtTime(b.open_time)} – {fmtTime(b.close_time)}</span>
                  </span>
                  {branchId === b.id && <span className="w-6 h-6 rounded-full bg-[#c9963f] text-white flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></span>}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#221512]">Select services <span className="text-[#8a7460] font-normal">(tap to add)</span></p>
                {chosen.length > 0 && <p className="text-sm font-bold text-[#c9963f]">{peso(totalPrice)} · {totalDur} min</p>}
              </div>
              {[...new Set(services.map((s) => s.category))].map((cat) => (
                <div key={cat} className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8a7460]">{cat}</p>
                  <div className="grid sm:grid-cols-2 gap-2.5 mt-2">
                    {services.filter((s) => s.category === cat).map((s) => {
                      const on = serviceIds.includes(s.id);
                      return (
                        <button key={s.id} onClick={() => toggleService(s.id)} className={`text-left rounded-xl border p-3.5 transition-all ${on ? 'border-[#c9963f] bg-[#fdf6e7] ring-1 ring-[#c9963f]/40' : 'border-[#e2d5c3] bg-white hover:border-[#c9963f]/60'}`}>
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm text-[#221512]">{s.name}</span>
                            {on && <span className="w-5 h-5 rounded-full bg-[#c9963f] text-white flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></span>}
                          </span>
                          <span className="flex items-center justify-between mt-1.5 text-sm">
                            <span className="font-bold text-[#c9963f]">{peso(s.price)}</span>
                            <span className="text-xs text-[#8a7460]">{s.duration} min</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="font-semibold text-[#221512]">Pick your stylist</p>
              <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
                <button onClick={() => setStaffId('any')} className={`text-left rounded-xl border p-4 flex items-center gap-3 ${staffId === 'any' ? 'border-[#c9963f] bg-[#fdf6e7] ring-1 ring-[#c9963f]/40' : 'border-[#e2d5c3] bg-white'}`}>
                  <span className="w-12 h-12 rounded-full bg-[#221512] text-[#e8c987] flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></span>
                  <span><span className="block font-semibold text-[#221512]">First available</span><span className="block text-xs text-[#8a7460]">Fastest slot at {branch?.name}</span></span>
                </button>
                {branchStaff.map((s) => (
                  <button key={s.id} onClick={() => setStaffId(s.id)} className={`text-left rounded-xl border p-4 flex items-center gap-3 ${staffId === s.id ? 'border-[#c9963f] bg-[#fdf6e7] ring-1 ring-[#c9963f]/40' : 'border-[#e2d5c3] bg-white'}`}>
                    <img src={s.photo || '/images/stylist-1.jpg'} alt={s.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-[#221512] truncate">{s.name}</span>
                      <span className="block text-xs text-[#8a7460] truncate">{s.role} · {s.specialties || 'All services'}</span>
                      <span className="text-xs text-[#c9963f] font-semibold flex items-center gap-1"><Star className="w-3 h-3 fill-[#c9963f]" /> {Number(s.rating).toFixed(1)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="font-semibold text-[#221512]">Choose date</p>
              <div className="flex gap-2 overflow-x-auto pb-2 mt-3">
                {dates.map((d) => {
                  const dt = new Date(d + 'T00:00:00');
                  const on = date === d;
                  return (
                    <button key={d} onClick={() => { setDate(d); setTime(null); }} className={`min-w-[68px] rounded-xl border py-2.5 px-2 text-center shrink-0 ${on ? 'border-[#c9963f] bg-[#221512] text-white' : 'border-[#e2d5c3] bg-white'}`}>
                      <span className={`block text-[11px] font-semibold ${on ? 'text-[#e8c987]' : 'text-[#8a7460]'}`}>{dt.toLocaleDateString('en-PH', { weekday: 'short' })}</span>
                      <span className="block text-lg font-bold leading-tight">{dt.getDate()}</span>
                      <span className={`block text-[11px] ${on ? 'text-[#e8c987]' : 'text-[#8a7460]'}`}>{dt.toLocaleDateString('en-PH', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
              <p className="font-semibold text-[#221512] mt-5">Available times <span className="font-normal text-[#8a7460] text-sm">· {fmtDate(date)} · {totalDur} min needed</span></p>
              {loadingSlots ? (
                <p className="text-sm text-[#8a7460] mt-3">Checking live availability…</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {slots.map((s) => (
                    <button key={s.t} disabled={!s.free} onClick={() => setTime(s.t)} className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${time === s.t ? 'bg-[#221512] text-white border-[#221512]' : s.free ? 'bg-white border-[#e2d5c3] text-[#221512] hover:border-[#c9963f]' : 'bg-[#f3ebdd] border-transparent text-[#b3a08a] line-through cursor-not-allowed'}`}>
                      {fmtTime(s.t)}
                    </button>
                  ))}
                </div>
              )}
              {slots.length > 0 && slots.every((s) => !s.free) && !loadingSlots && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">Fully booked for {fmtDate(date)}. Try another date or “First available” stylist.</p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <p className="font-semibold text-[#221512]">Your details</p>
                <div><label className="lbl">Full name *</label><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Santos" /></div>
                <div><label className="lbl">Mobile number *</label><input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0917 123 4567" /></div>
                <div><label className="lbl">Notes (optional)</label><textarea className="inp" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, pegs, requests…" /></div>
              </div>
              <div className="card p-5 h-fit bg-[#fffdf8]">
                <p className="font-semibold text-[#221512]">Booking summary</p>
                <div className="text-sm mt-3 space-y-2">
                  <Row k="Branch" v={branch?.name} />
                  <Row k="Services" v={chosen.map((s) => s.name).join(', ')} />
                  <Row k="Stylist" v={staffId === 'any' ? 'First available' : staff.find((s) => s.id === staffId)?.name} />
                  <Row k="When" v={`${fmtDate(date)} · ${time ? fmtTime(time) : ''}`} />
                  <Row k="Duration" v={`${totalDur} minutes`} />
                </div>
                <div className="border-t border-[#eee2cf] mt-4 pt-3 flex justify-between font-bold text-[#221512]">
                  <span>Total</span><span>{peso(totalPrice)}</span>
                </div>
                <p className="text-xs text-[#8a7460] mt-2">Pay at the branch. Free cancellation up to 3 hours before.</p>
              </div>
            </div>
          )}

          {step === 5 && done && (
            <div className="text-center py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10" />
              </motion.div>
              <h3 className="font-display text-2xl font-bold text-[#221512] mt-4">You're booked, {name.split(' ')[0]}!</h3>
              <p className="text-[#6b5d4f] mt-2">Show this reference at the branch:</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-[#c9963f] bg-[#fdf6e7] border border-[#e8c987] rounded-xl inline-block px-6 py-2 mt-3">{done.booking_ref}</p>
              <div className="card p-4 mt-5 text-left text-sm max-w-md mx-auto space-y-1.5">
                <Row k="Branch" v={branch?.name} />
                <Row k="When" v={`${fmtDate(date)} · ${time ? fmtTime(time) : ''}`} />
                <Row k="Services" v={chosen.map((s) => s.name).join(', ')} />
                <Row k="Total" v={peso(totalPrice)} />
              </div>
              <button onClick={onClose} className="btn btn-dark mt-6">Done</button>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mt-4">{error}</p>}
        </div>

        {step < 5 && (
          <div className="border-t border-[#eee2cf] bg-white px-5 md:px-7 py-4 flex items-center justify-between shrink-0">
            <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))} className="btn btn-line">
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {step < 4 ? (
              <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext} className="btn btn-gold">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={!canNext || submitting} className="btn btn-gold !px-6">
                {submitting ? 'Confirming…' : <><User className="w-4 h-4" /> Confirm Booking</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[#8a7460] shrink-0">{k}</span>
      <span className="font-medium text-[#221512] text-right">{v || '—'}</span>
    </div>
  );
}
