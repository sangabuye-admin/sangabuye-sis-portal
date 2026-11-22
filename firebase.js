const https = require('https');

module.exports = (req, res) => {
  const path = req.query.path || 'test';
  const bodyData = req.method !== 'GET' && req.body
    ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
    : null;

  const options = {
    hostname: '://firebaseio.com',
    path: `/${path}.json`,
    method: req.method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (bodyData) {
    options.headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  const fbReq = https.request(options, (fbRes) => {
    let raw = '';
    fbRes.on('data', (chunk) => { raw += chunk; });
    fbRes.on('end', () => {
      res.status(fbRes.statusCode || 200).send(raw);
    });
  });

  fbReq.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });

  if (bodyData) fbReq.write(bodyData);
  fbReq.end();
};
