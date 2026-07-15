// ============================================================
// Fill these in before running the app. Only PUBLIC values live
// here. Backend secrets such as Plaid secret, Supabase service
// role, and Gemini API key must stay only in backend/.env.
// ============================================================

export const CONFIG = {
  // While testing on your laptop with Expo Go, use your computer's
  // local network IP, e.g. "http://192.168.1.23:4000".
  // Once deployed, use your deployed backend URL instead.
  BACKEND_URL: 'http://YOUR_LOCAL_IP:4000',

  // Supabase anon/publishable keys are intended for client apps,
  // but placeholders are used here so this public repo exposes none
  // of your project-specific values.
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'your_supabase_anon_or_publishable_key_here',
};
