/**
 * E2E Session Management
 * Simplified X3DH-inspired key agreement protocol.
 * Establishes per-conversation session keys.
 */

import { deriveSharedSecret, deriveMessageKey } from './messages';
import { getPrivateKey } from './keys';

const DB_NAME = '0g_e2e_keys';
const SESSION_STORE = 'sessions';

// Session key storage in IndexedDB
function openSessionDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SESSION_STORE)) {
                db.createObjectStore(SESSION_STORE);
            }
        };
    });
}

async function storeSession(conversationId: string, key: CryptoKey): Promise<void> {
    // Export key for storage (we use raw export for AES keys)
    const exported = await crypto.subtle.exportKey('raw', key);
    const db = await openSessionDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SESSION_STORE, 'readwrite');
        tx.objectStore(SESSION_STORE).put(exported, `session_${conversationId}`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getSession(conversationId: string): Promise<CryptoKey | null> {
    try {
        const db = await openSessionDB();
        const exported: ArrayBuffer = await new Promise((resolve, reject) => {
            const tx = db.transaction(SESSION_STORE, 'readonly');
            const request = tx.objectStore(SESSION_STORE).get(`session_${conversationId}`);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!exported) return null;

        return crypto.subtle.importKey(
            'raw',
            exported,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    } catch {
        return null;
    }
}

export interface KeyBundle {
    identityKey: string;
    signedPreKey: string;
    preKeySignature: string;
    oneTimePreKeys: string[];
}

// Establish a session with another user
export async function establishSession(
    conversationId: string,
    theirKeyBundle: KeyBundle
): Promise<CryptoKey> {
    // Check for existing session
    const existing = await getSession(conversationId);
    if (existing) return existing;

    // Get our identity private key
    const db = await openSessionDB();
    let identityKeyId: string;
    try {
        identityKeyId = await new Promise((resolve, reject) => {
            const tx = db.transaction('keys', 'readonly');
            const request = tx.objectStore('keys').get('currentIdentityKeyId');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } catch {
        throw new Error('No identity key found. Please regenerate keys.');
    }

    const ourPrivateKey = await getPrivateKey(identityKeyId);
    if (!ourPrivateKey) throw new Error('Identity private key not found');

    // Use their signed pre-key (or first one-time pre-key) for ECDH
    const theirPublicKey = theirKeyBundle.oneTimePreKeys[0] || theirKeyBundle.signedPreKey;

    // Derive shared secret via ECDH
    const sharedSecret = await deriveSharedSecret(ourPrivateKey, theirPublicKey);

    // Derive AES message key from shared secret
    const messageKey = await deriveMessageKey(sharedSecret);

    // Store session
    await storeSession(conversationId, messageKey);

    return messageKey;
}

// Get existing session key for a conversation
export async function getSessionKey(conversationId: string): Promise<CryptoKey | null> {
    return getSession(conversationId);
}

// Check if E2E is available (keys exist)
export async function isE2EAvailable(): Promise<boolean> {
    try {
        const db = await openSessionDB();
        const keyId: string | undefined = await new Promise((resolve, reject) => {
            const tx = db.transaction('keys', 'readonly');
            const request = tx.objectStore('keys').get('currentIdentityKeyId');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return !!keyId;
    } catch {
        return false;
    }
}
