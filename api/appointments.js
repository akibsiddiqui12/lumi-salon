import supabase from './db-client.js';
function makeRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'LM-' + s;
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      let q = supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
      const { status, branch_id, staff_id, date, from, to, customer_id } = req.query;
      if (status) q = q.eq('status', status);
      if (branch_id) q = q.eq('branch_id', branch_id);
      if (staff_id) q = q.eq('staff_id', staff_id);
      if (customer_id) q = q.eq('customer_id', customer_id);
      if (date) q = q.eq('date', date);
      if (from) q = q.gte('date', from);
      if (to) q = q.lte('date', to);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const payload = { ...req.body, booking_ref: req.body.booking_ref || makeRef(), status: req.body.status || 'pending', payment_status: req.body.payment_status || 'unpaid' };
      const { data, error } = await supabase.from('appointments').insert(payload).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...rest } = req.body;
      const { data, error } = await supabase.from('appointments').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
