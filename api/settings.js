import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('settings').select('*').order('key');
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key required' });
      const existing = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
      let data, error;
      if (existing && existing.data) {
        ({ data, error } = await supabase.from('settings').update({ value }).eq('key', key).select().single());
      } else {
        ({ data, error } = await supabase.from('settings').insert({ key, value }).select().single());
      }
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) { console.error('API error:', err); res.status(500).json({ error: err.message }); }
}
