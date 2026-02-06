/**
 * E2E Encryption Key Management
 * Uses Web Crypto API for key generation and IndexedDB for private key storage.
 * Private keys NEVER leave the device.
 */

const DB_NAME = '0g_e2e_keys';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

// Open IndexedDB for key storage
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function storeKey(key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getKey(key: string): Promise<any> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Generate ECDH key pair for identity
export async function generateIdentityKeyPair(): Promise<{
    publicKey: string;
    privateKeyId: string;
}> {
    const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        false, // non-extractable private key
        ['deriveKey', 'deriveBits']
    );

    // Export public key
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(publicKeyRaw))));

    // Store private key in IndexedDB
    const privateKeyId = `identity_${Date.now()}`;
    await storeKey(privateKeyId, keyPair.privateKey);

    return { publicKey: publicKeyBase64, privateKeyId };
}

// Generate signed pre-key
export async function generateSignedPreKey(): Promise<{
    publicKey: string;
    privateKeyId: string;
    signature: string;
}> {
    const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey', 'deriveBits']
    );

    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(publicKeyRaw))));

    // Sign with ECDSA (generate a signing key for this purpose)
    const signingKey = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign', 'verify']
    );
    const signatureRaw = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        signingKey.privateKey,
        publicKeyRaw
    );
    const signature = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(signatureRaw))));

    const privateKeyId = `prekey_${Date.now()}`;
    await storeKey(privateKeyId, keyPair.privateKey);

    return { publicKey: publicKeyBase64, privateKeyId, signature };
}

// Generate one-time pre-keys
export async function generateOneTimePreKeys(count: number = 10): Promise<{
    publicKeys: string[];
    privateKeyIds: string[];
}> {
    const publicKeys: string[] = [];
    const privateKeyIds: string[] = [];

    for (let i = 0; i < count; i++) {
        const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            ['deriveKey', 'deriveBits']
        );

        const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
        publicKeys.push(btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(publicKeyRaw)))));

        const privateKeyId = `onetime_${Date.now()}_${i}`;
        await storeKey(privateKeyId, keyPair.privateKey);
        privateKeyIds.push(privateKeyId);
    }

    return { publicKeys, privateKeyIds };
}

// Generate full key bundle for upload
export async function generateKeyBundle() {
    const identity = await generateIdentityKeyPair();
    const signedPreKey = await generateSignedPreKey();
    const oneTimePreKeys = await generateOneTimePreKeys(10);

    // Store the key mapping
    await storeKey('currentIdentityKeyId', identity.privateKeyId);
    await storeKey('currentPreKeyId', signedPreKey.privateKeyId);
    await storeKey('currentOneTimeKeyIds', oneTimePreKeys.privateKeyIds);

    return {
        identityKey: identity.publicKey,
        signedPreKey: signedPreKey.publicKey,
        preKeySignature: signedPreKey.signature,
        oneTimePreKeys: oneTimePreKeys.publicKeys,
    };
}

// Retrieve stored private key
export async function getPrivateKey(keyId: string): Promise<CryptoKey | null> {
    try {
        return await getKey(keyId);
    } catch {
        return null;
    }
}

// Get fingerprint for safety number display
export async function getKeyFingerprint(publicKeyBase64: string): Promise<string> {
    const raw = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const hash = await crypto.subtle.digest('SHA-256', raw);
    const bytes = new Uint8Array(hash);
    // Format as groups of 5 digits
    return Array.from(bytes.slice(0, 20))
        .map(b => b.toString(10).padStart(3, '0'))
        .join(' ')
        .replace(/(.{15})/g, '$1\n')
        .trim();
}
