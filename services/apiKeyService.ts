/**
 * Service for managing Gemini API keys
 */

const API_KEY_STORAGE_KEY = 'lumina_gemini_api_key';

export const setApiKey = (key: string): void => {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const getApiKey = (): string | null => {
    // Check localStorage first
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) return storedKey;

    // Fall back to environment variable
    return process.env.API_KEY || null;
};

export const hasApiKey = (): boolean => {
    return getApiKey() !== null;
};

export const clearApiKey = (): void => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
};
