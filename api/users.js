import supabase from './db-client.js';
const strip = (u) => { const { password, ...safe } = u; return safe; };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('users').select('*').order('name');
      if (error) throw error;
      return res.status(200).json((data || []).map(strip));
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'login') {
        const { data, error } = await supabase.from('users').select('*').eq('email', body.email).eq('password', body.password).eq('active', true).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(401).json({ error: 'Invalid email or password' });
        let branch_name = '';
        if (data.branch_id) {
          const b = await supabase.from('branches').select('name').eq('id', data.branch_id).maybeSingle();
          branch_name = b?.data?.name || '';
        }
        return res.status(200).json({ ...strip(data), branch_name });
      }
      const { data, error } = await supabase.from('users').insert(body).select().single();
      if (error) throw error;
      return res.status(201).json(strip(data));
    }
    if (req.method === 'PUT') {
      const { id, ...rest } = req.body;
      const { data, error } = await supabase.from('users').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(strip(data));
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
