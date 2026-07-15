const { createClient } = require('@supabase/supabase-js');

// Uses the SERVICE ROLE key because this runs on YOUR server, not
// in the mobile app. Never ship the service role key inside the
// mobile app itself — only the backend should ever see it.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
