/**
 * TRAVEL SHIELD ENGINE
 * 
 * Client-side stealth mode with zero server footprint.
 * When active, replaces all real data with decoy content.
 * 
 * Storage keys are deliberately innocuous to avoid forensic detection:
 * - _app_pref_v2    → hashed passphrase
 * - _app_cache_st   → stealth active flag (encrypted)
 * - _app_offline_tk → encrypted real auth token (during stealth)
 * 
 * Activation: Triple-tap avatar (calls activate())
 * Deactivation: Type passphrase in search bar (calls deactivate())
 */

const STORAGE_KEYS = {
    passphraseHash: '_app_pref_v2',
    stealthActive: '_app_cache_st',
    encryptedToken: '_app_offline_tk',
    setupComplete: '_app_pref_init',
} as const;

// Simple XOR cipher for token obfuscation (not crypto-grade, but
// makes the token unreadable without the key -- and combined with
// the innocuous storage key names, sufficient for plausible deniability)
function xorCipher(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result); // Base64 encode so it looks like normal cached data
}

function xorDecipher(encoded: string, key: string): string {
    const text = atob(encoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
}

/**
 * Hash a passphrase using SHA-256 via Web Crypto API
 */
async function hashPassphrase(passphrase: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase + '_0g_shield');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if Travel Shield has been set up (passphrase configured)
 */
export function isShieldConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(STORAGE_KEYS.passphraseHash);
}

/**
 * Check if Travel Shield is currently active
 */
export function isStealthActive(): boolean {
    if (typeof window === 'undefined') return false;
    const flag = localStorage.getItem(STORAGE_KEYS.stealthActive);
    // The flag is stored as a base64-encoded "1" to look like cache data
    return flag === btoa('1');
}

/**
 * Set up the Travel Shield with a passphrase
 */
export async function setupShield(passphrase: string): Promise<boolean> {
    if (!passphrase || passphrase.length < 4) return false;
    
    try {
        const hash = await hashPassphrase(passphrase);
        localStorage.setItem(STORAGE_KEYS.passphraseHash, hash);
        localStorage.setItem(STORAGE_KEYS.setupComplete, btoa('1'));
        return true;
    } catch {
        return false;
    }
}

/**
 * Remove the Travel Shield configuration
 */
export function removeShield(): void {
    localStorage.removeItem(STORAGE_KEYS.passphraseHash);
    localStorage.removeItem(STORAGE_KEYS.stealthActive);
    localStorage.removeItem(STORAGE_KEYS.encryptedToken);
    localStorage.removeItem(STORAGE_KEYS.setupComplete);
}

/**
 * Activate stealth mode
 * - Encrypts and hides the real auth token
 * - Sets the stealth flag
 * - Returns true if successful
 */
export function activateStealth(): boolean {
    if (typeof window === 'undefined') return false;
    if (!isShieldConfigured()) return false;
    
    try {
        // Get the real auth token
        const realToken = localStorage.getItem('0g_token');
        const realExpiry = localStorage.getItem('0g_token_expiry');
        
        if (realToken) {
            // Encrypt the real token using the stored hash as key
            const hashKey = localStorage.getItem(STORAGE_KEYS.passphraseHash) || '';
            const encrypted = xorCipher(
                JSON.stringify({ token: realToken, expiry: realExpiry }),
                hashKey
            );
            localStorage.setItem(STORAGE_KEYS.encryptedToken, encrypted);
            
            // Remove real auth tokens
            localStorage.removeItem('0g_token');
            localStorage.removeItem('0g_token_expiry');
        }
        
        // Set stealth flag
        localStorage.setItem(STORAGE_KEYS.stealthActive, btoa('1'));
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Deactivate stealth mode with passphrase verification
 * - Verifies the passphrase matches
 * - Restores the real auth token
 * - Clears stealth flag
 * - Returns true if successful
 */
export async function deactivateStealth(passphrase: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
        // Verify passphrase
        const storedHash = localStorage.getItem(STORAGE_KEYS.passphraseHash);
        if (!storedHash) return false;
        
        const inputHash = await hashPassphrase(passphrase);
        if (inputHash !== storedHash) return false;
        
        // Restore real auth token
        const encrypted = localStorage.getItem(STORAGE_KEYS.encryptedToken);
        if (encrypted) {
            try {
                const decrypted = xorDecipher(encrypted, storedHash);
                const { token, expiry } = JSON.parse(decrypted);
                if (token) {
                    localStorage.setItem('0g_token', token);
                    if (expiry) localStorage.setItem('0g_token_expiry', expiry);
                }
            } catch {
                // Token restoration failed, user will need to re-login
            }
            localStorage.removeItem(STORAGE_KEYS.encryptedToken);
        }
        
        // Clear stealth flag
        localStorage.removeItem(STORAGE_KEYS.stealthActive);
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Verify a passphrase against the stored hash (without deactivating)
 */
export async function verifyPassphrase(passphrase: string): Promise<boolean> {
    const storedHash = localStorage.getItem(STORAGE_KEYS.passphraseHash);
    if (!storedHash) return false;
    const inputHash = await hashPassphrase(passphrase);
    return inputHash === storedHash;
}
