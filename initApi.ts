// Initialize API key from provided key
// This will be called once when the app first loads

import { setApiKey } from './services/apiKeyService';

// User's Gemini API Key
const INITIAL_API_KEY = 'AIzaSyCLGgWy8ki0319dnTjvVULBRomsu_ItwO0';

if (typeof window !== 'undefined' && !localStorage.getItem('lumina_gemini_api_key')) {
    setApiKey(INITIAL_API_KEY);
    console.log('✓ Gemini API Key initialized');
}

export { };
