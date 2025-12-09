import { argon2id } from "hash-wasm";
import {
  generateSalt,
  derivePrivateKey,
  deriveVerifier,
  generateEphemeral,
  type Ephemeral,
  deriveSession,
  verifySession,
} from "secure-remote-password/client";
import { Buffer } from "buffer";

export interface SrpClientSession {
  ephemeralSecret: string; // Hex 'a'
  ephemeralPublic: string; // Hex 'A'
}

export const useCryptoService = () => {
  // --- Utility Functions ---

  function randomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  function toBase64(
    buffer: Uint8Array | ArrayBuffer | Buffer | number[]
  ): string {
    if (Buffer.isBuffer(buffer)) return buffer.toString("base64");

    // Handle standard arrays or Uint8Arrays
    let bytes: Uint8Array;
    if (Array.isArray(buffer)) {
      bytes = new Uint8Array(buffer);
    } else {
      bytes = new Uint8Array(buffer);
    }

    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function fromBase64(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }

  function hexToBase64(hexstring: string): string {
    const bytes = new Uint8Array(
      hexstring.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const b64 = toBase64(bytes);
    return b64;
  }

  function base64ToHex(b64: string): string {
    const bytes = fromBase64(b64);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Helper to get Buffer from Base64 (for fast-srp-hap)
  function base64ToBuffer(base64: string): Buffer {
    return Buffer.from(base64, "base64");
  }

  // --- 1. SRP Logic (via fast-srp-hap) ---

  const generateUserSalt = (): string => {
    return generateSalt(); // Returns a hex string
  };

  async function generatePrivateKey(
    salt: string,
    email: string,
    password: string
  ): Promise<string> {
    return derivePrivateKey(salt, email, password); // Returns Hex
  }
  async function srpGetVerifier(privateKey: string): Promise<string> {
    return deriveVerifier(privateKey); // Returns Hex
  }

  /**
   * STEP 1: Initialize Client
   * Generates ephemeral 'a', computes 'A'.
   * Returns the Client Session object (to hold state) and 'A' (Base64).
   */
  async function srpClientStep1(): Promise<Ephemeral> {
    // // Generate ephemeral secret 'a'
    const clientEphemeral = generateEphemeral();
    return clientEphemeral;
  }

  /**
   * STEP 2: Process Challenge
   * Takes 'B' from server, computes Session Key 'K' and Proof 'M1'.
   */
  async function srpClientStep2(
    session: Ephemeral,
    serverPublicB64: string, // 'B' from server
    saltB64: string, // 's' from server (or init)
    email: string,
    password: string
  ) {
    // 1. Convert Base64 inputs -> Hex for the library
    const serverPublicHex = base64ToHex(serverPublicB64);
    const saltHex = base64ToHex(saltB64);

    // 2. Re-derive Private Key (x)
    const privateKeyHex = derivePrivateKey(saltHex, email, password);

    // 3. Derive Session (S and M1)
    // deriveSession(ephemeralSecret, serverEphemeralPublic, salt, username, privateKey)
    const clientSession = deriveSession(
      session.secret,
      serverPublicHex,
      saltHex,
      email,
      privateKeyHex
    );

    return {
      keyHex: clientSession.key, // K
      proofHex: clientSession.proof, // M1
      proofB64: hexToBase64(clientSession.proof), // M1 for wire
    };
  }

  /**
   * STEP 3: Verify Server
   * Checks 'M2' from server.
   */
  async function srpClientStep3(
    session: Ephemeral,
    clientSessionProofHex: string, // M1 (Hex)
    serverProofB64: string, // M2 (Base64)
    serverSessionKeyHex: string // K (Hex) - verifySession needs the session object
  ): Promise<void> {
    const serverProofHex = base64ToHex(serverProofB64);

    // Reconstruct the object expected by verifySession
    const clientSessionObj = {
      key: serverSessionKeyHex,
      proof: clientSessionProofHex,
    };

    // verifySession(clientEphemeralPublic, clientSession, serverSessionProof)
    verifySession(session.public, clientSessionObj, serverProofHex);
  }

  // --- 2. Symmetric Encryption (AES-GCM) & KDF (Argon2id) ---
  // (Unchanged from previous version, kept for completeness)

  async function deriveKeyArgon2id(
    password: string,
    saltB64: string
  ): Promise<Uint8Array> {
    const saltBytes = fromBase64(saltB64);
    const derivedHex = await argon2id({
      password,
      salt: saltBytes,
      parallelism: 4,
      iterations: 1,
      memorySize: 64 * 1024,
      hashLength: 32,
      outputType: "hex",
    });
    return new Uint8Array(
      derivedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
  }

  async function importAESKey(keyBytes: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptAES(key: CryptoKey, data: Uint8Array): Promise<string> {
    const iv = randomBytes(12);
    const ciphertextWithTagBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    const ciphertextWithTag = new Uint8Array(ciphertextWithTagBuf);
    // Combine IV + Ciphertext + Tag (Standard WebCrypto is Ciphertext+Tag)
    // Python backend expects: IV (12) + Tag (16) + Ciphertext
    const tagLength = 16;
    const ciphertextLen = ciphertextWithTag.length - tagLength;
    const ciphertext = ciphertextWithTag.slice(0, ciphertextLen);
    const tag = ciphertextWithTag.slice(ciphertextLen);
    const result = new Uint8Array(iv.length + tag.length + ciphertext.length);
    result.set(iv, 0);
    result.set(tag, iv.length);
    result.set(ciphertext, iv.length + tag.length);
    return toBase64(result);
  }

  async function decryptAES(
    key: CryptoKey,
    encryptedB64: string
  ): Promise<Uint8Array> {
    const encryptedBytes = fromBase64(encryptedB64);
    const iv = encryptedBytes.slice(0, 12);
    const tag = encryptedBytes.slice(12, 28);
    const ciphertext = encryptedBytes.slice(28);

    const webCryptoInput = new Uint8Array(ciphertext.length + tag.length);
    webCryptoInput.set(ciphertext, 0);
    webCryptoInput.set(tag, ciphertext.length);

    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        webCryptoInput
      );
      return new Uint8Array(decrypted);
    } catch (e) {
      throw new Error("Decryption failed: Integrity check error");
    }
  }

  // --- 3. Asymmetric Keys (RSA-OAEP 2048) ---

  async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async function exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey("spki", key);
    return toBase64(exported);
  }

  async function exportPrivateKey(key: CryptoKey): Promise<Uint8Array> {
    const exported = await crypto.subtle.exportKey("pkcs8", key);
    return new Uint8Array(exported);
  }

  return {
    // Utils
    randomBytes,
    hexToBase64,
    toBase64,
    fromBase64,

    // SRP (New Interface)
    generateUserSalt,
    generatePrivateKey,
    srpGetVerifier,
    srpClientStep1,
    srpClientStep2,
    srpClientStep3,

    // Symmetric / KDF
    deriveKeyArgon2id,
    importAESKey,
    encryptAES,
    decryptAES,

    // Asymmetric
    generateKeyPair,
    exportPublicKey,
    exportPrivateKey,
  };
};
