import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      let q = supabase.from('products').select('*').order('name');
      if (req.query.branch_id) q = q.eq('branch_id', req.query.branch_id);
      if (req.query.q) q = q.ilike('name', `%${req.query.q}%`);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { data, error } = await supabase.from('products').insert(req.body).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, adjust, ...rest } = req.body;
      let payload = rest;
      if (typeof adjust === 'number') {
        const cur = await supabase.from('products').select('stock').eq('id', id).maybeSingle();
        payload = { ...rest, stock: Math.max(0, ((cur && cur.data && cur.data.stock) || 0) + adjust) };
      }
      const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
