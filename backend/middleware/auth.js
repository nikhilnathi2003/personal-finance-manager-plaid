const supabase = require('../services/supabase');

/**
 * SECURITY: Every request must carry a valid Supabase login token
 * ("Authorization: Bearer <jwt>"). We verify it with Supabase and take
 * the user id FROM THE TOKEN — never from the URL or request body.
 *
 * Why this matters: in the old version, anyone who knew (or guessed)
 * a user id could call /transactions/dashboard/<that-id> and read that
 * person's entire bank history, because the backend trusted the URL.
 * Now, you can only ever act as the account you're actually logged into.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Session expired — please log in again' });
  }

  req.userId = data.user.id;

  // Make sure a profile row exists for this user (needed for foreign keys).
  await supabase
    .from('profiles')
    .upsert({ id: req.userId }, { onConflict: 'id' });

  next();
}

module.exports = requireAuth;
