import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { post } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { UserRow } from '../lib/types';

const DEMO = [
  { email: 'admin@lumiere.ph', label: 'Admin' },
  { email: 'manager@lumiere.ph', label: 'Manager' },
  { email: 'front@lumiere.ph', label: 'Receptionist' },
  { email: 'stylist@lumiere.ph', label: 'Stylist' },
];

export default function Login() {
  const [email, setEmail] = useState('admin@lumiere.ph');
  const [password, setPassword] = useState('lumiere123');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await post<UserRow>('/api/users', { action: 'login', email: email.trim(), password });
      login(u);
      nav('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left visual */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src="/images/hero.jpg" alt="Salon" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient" />
        <div className="relative p-12 flex flex-col justify-end text-white">
          <h1 className="font-display text-4xl font-bold">Lumière Salon <span className="gold-text">ERP</span></h1>
          <p className="text-[#e6d9c4] mt-2 max-w-md">One system for bookings, CRM, POS, inventory, finance & payroll across all branches.</p>
        </div>
      </div>
      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#faf6ef]">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#8a7460] hover:text-[#221512] mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to public site
          </Link>
          <div className="card p-8">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-[#221512] text-[#e8c987] flex items-center justify-center"><Scissors className="w-5 h-5" /></span>
              <div>
                <p className="font-display text-xl font-bold text-[#221512]">Staff Login</p>
                <p className="text-xs text-[#8a7460]">Multi-role ERP · Admin / Manager / Front Desk / Stylist</p>
              </div>
            </div>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="lbl">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a08a]" />
                  <input className="inp !pl-9" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lumiere.ph" />
                </div>
              </div>
              <div>
                <label className="lbl">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#b3a08a]" />
                  <input className="inp !pl-9 !pr-10" type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3a08a]">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
              <button type="submit" disabled={loading} className="btn btn-gold w-full !py-3">
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <div className="mt-6 pt-5 border-t border-[#eee2cf]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8a7460] mb-2">Demo accounts <span className="normal-case font-normal">(password: lumiere123)</span></p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button key={d.email} onClick={() => { setEmail(d.email); setPassword('lumiere123'); }} className="text-left text-xs bg-[#f3ebdd] hover:bg-[#eee2cf] rounded-lg px-3 py-2">
                    <span className="font-bold text-[#221512] block">{d.label}</span>
                    <span className="text-[#8a7460]">{d.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
