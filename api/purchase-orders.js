import supabase from './db-client.js';
function makePO() {
  return `PO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      let q = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
      if (req.query.status) q = q.eq('status', req.query.status);
      if (req.query.branch_id) q = q.eq('branch_id', req.query.branch_id);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const payload = { ...req.body, po_no: req.body.po_no || makePO(), status: req.body.status || 'draft' };
      const { data, error } = await supabase.from('purchase_orders').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...rest } = req.body;
      const prev = await supabase.from('purchase_orders').select('status').eq('id', id).maybeSingle();
      const { data, error } = await supabase.from('purchase_orders').update(rest).eq('id', id).select().single();
      if (error) throw error;
      if (rest.status === 'received' && (!prev || !prev.data || prev.data.status !== 'received')) {
        try {
          const items = Array.isArray(data.items) ? data.items : [];
          for (const it of items) {
            if (it.product_id && it.qty) {
              const cur = await supabase.from('products').select('stock').eq('id', it.product_id).maybeSingle();
              if (cur && cur.data) await supabase.from('products').update({ stock: (cur.data.stock || 0) + Number(it.qty) }).eq('id', it.product_id);
            }
          }
        } catch (e) { console.error('receive side effects:', e); }
      }
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
