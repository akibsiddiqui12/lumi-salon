import { ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-[#8a7460]">
      <Loader2 className="w-7 h-7 animate-spin text-[#c9963f]" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-12 px-6">
      <p className="font-semibold text-[#4a3a30]">{title}</p>
      {hint && <p className="text-sm text-[#8a7460] mt-1">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase();
  const cls =
    s === 'completed' || s === 'paid' || s === 'received' || s === 'active'
      ? 'b-green'
      : s === 'confirmed' || s === 'approved' || s === 'ordered'
        ? 'b-blue'
        : s === 'pending' || s === 'draft'
          ? 'b-amber'
          : s === 'cancelled' || s === 'no-show' || s === 'rejected' || s === 'refunded'
            ? 'b-red'
            : s === 'in-progress'
              ? 'b-purple'
              : 'b-gray';
  return <span className={`badge ${cls}`}>{status || '—'}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eee2cf] shrink-0">
          <h3 className="font-display text-lg font-semibold text-[#221512]">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3ebdd] text-[#8a7460]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] bg-[#221512] text-[#f7ecd9] text-sm font-medium px-5 py-3 rounded-xl shadow-2xl max-w-[90vw]">
      {msg}
    </div>
  );
}

export function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onNo}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold text-[#221512]">{text}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-line btn-sm" onClick={onNo}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onYes}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
