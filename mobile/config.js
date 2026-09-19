// Safe to commit — holds NO secrets. The real values are injected at
// build time from EXPO_PUBLIC_* env vars (set as EAS environment
// variables for cloud builds, or a local .env for laptop dev).
// The backend URL is not sensitive; the API key is never committed.
export const CONFIG = {
  BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://the-vault-backend-1bi4.onrender.com',
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',
};
