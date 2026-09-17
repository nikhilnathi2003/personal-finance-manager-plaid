// Simple shared-secret gate. When API_KEY is set (as it is in the
// cloud), every request must send a matching `x-api-key` header, so a
// stranger who finds the public URL can't read your bank data. Left
// unset on your laptop, so local dev needs no key.
module.exports = function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  if (req.headers['x-api-key'] === expected) return next();
  return res.status(401).json({ error: 'Unauthorized' });
};
