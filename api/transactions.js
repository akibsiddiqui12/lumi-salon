import supabase from './db-client.js';
function makeInvoice() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `INV-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      let q = supabase.from('transactions').select('*').order('created_at', { ascending: false });
      const { branch_id, staff_id, customer_id, from, to } = req.query;
      if (branch_id) q = q.eq('branch_id', branch_id);
      if (staff_id) q = q.eq('staff_id', staff_id);
      if (customer_id) q = q.eq('customer_id', customer_id);
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body;
      const payload = { ...body, invoice_no: body.invoice_no || makeInvoice(), status: body.status || 'completed' };
      const { data, error } = await supabase.from('transactions').insert(payload).select().single();
      if (error) throw error;
      try {
        const items = Array.isArray(body.items) ? body.items : [];
        for (const it of items) {
          if (it.kind === 'product' && it.product_id && it.qty) {
            const { data: prod } = await supabase.from('products').select('stock').eq('id', it.product_id).maybeSingle();
            if (prod) await supabase.from('products').update({ stock: Math.max(0, (prod.stock || 0) - it.qty) }).eq('id', it.product_id);
          }
        }
        if (body.customer_id) {
          const { data: cust } = await supabase.from('customers').select('*').eq('id', body.customer_id).maybeSingle();
          if (cust) {
            const total = Number(body.total) || 0;
            const today = new Date().toISOString().slice(0, 10);
            await supabase.from('customers').update({
              total_visits: (cust.total_visits || 0) + 1,
              total_spent: Number(cust.total_spent || 0) + total,
              loyalty_points: (cust.loyalty_points || 0) + Math.floor(total / 100),
              last_visit: today,
            }).eq('id', body.customer_id);
          }
        }
        if (body.appointment_id) {
          await supabase.from('appointments').update({ status: 'completed', payment_status: 'paid' }).eq('id', body.appointment_id);
        }
      } catch (e) { console.error('post-sale side effects:', e); }
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...rest } = req.body;
      const { data, error } = await supabase.from('transactions').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
