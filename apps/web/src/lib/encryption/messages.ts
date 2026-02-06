/**
 * E2E Message Encryption
 * Uses AES-256-GCM for message encryption/decryption.
 */

export interface EncryptedPayload {
    ciphertext: string; // base64
    iv: string;         // base64
    ephemeralKey?: string; // base64, for key exchange
}

// Derive an AES key from a shared secret
export async function deriveMessageKey(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        'HKDF',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: new TextEncoder().encode('0g-e2e-message-key'),
            info: new TextEncoder().encode('message-encryption'),
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt a message
export async function encryptMessage(
    plaintext: string,
    key: CryptoKey
): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    return {
        ciphertext: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertextBuffer)))),
        iv: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(iv)))),
    };
}

// Decrypt a message
export async function decryptMessage(
    payload: EncryptedPayload,
    key: CryptoKey
): Promise<string> {
    const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plaintext);
}

// Establish shared secret via ECDH
export async function deriveSharedSecret(
    privateKey: CryptoKey,
    publicKeyBase64: string
): Promise<ArrayBuffer> {
    const publicKeyRaw = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyRaw,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );

    return crypto.subtle.deriveBits(
        { name: 'ECDH', public: publicKey },
        privateKey,
        256
    );
}
