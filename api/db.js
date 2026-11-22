export default async function handler(req, res) {
  const { table, query } = req.query;
  const SB_URL = 'https://supabase.co' + table + (query ? '?' + query : '');
  const SB_KEY = 'sb_publishable_I5QzeQGfG15VGaYBr7Nj7A_3MDlh7U5';

  const options = {
    method: req.method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const response = await fetch(SB_URL, options);
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
