export default async function handler(req, res) {
  const { path } = req.query;
  const FB_URL = `https://firebaseio.com{path}.json`;

  const options = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (req.method !== 'GET' && req.body) {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const response = await fetch(FB_URL, options);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
