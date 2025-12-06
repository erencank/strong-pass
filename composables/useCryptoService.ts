/**
 * Crypto Service
 * Implements SRP-6a (RFC 5054), Argon2id (via hash-wasm), AES-GCM, and RSA-OAEP/PSS.
 * * DEPENDENCY: `npm install hash-wasm`
 */

import { argon2id } from "hash-wasm";

export const useCryptoService = () => {
  // --- Constants (RFC 5054 2048-bit Group) ---
  const N_hex =
    "AC6BDB41324A9A9BF166DE5E1389582FAF72B6651987EE07FC3192943DB56050A37329CBB4A099ED8193E0757767A13DD52312AB4B03310DCD7F48A9DA04FD50E8083969EDB767B0CF6095179A163AB3661A05FBD5FAAAE82918A9962F0B93B855F97993EC975EEAA80D740ADBF4FF7453866200F77C769102100490B971876038234E04FBB9C07F4872AD5D735977461564463BA5990F565C9529F494511D733267793E1165A1961447050212F13D48B47C1339695627E43926D0219602A77446C93609871788C5C81646487570481F190D5505299285090DD93A24B79240234F3C729013C23C5E479D1936359D03750F8990F452286C32360215F3389A9003";
  const g_hex = "02";
  const N = BigInt("0x" + N_hex);
  const g = BigInt("0x" + g_hex);
  const k = BigInt(
    "0x5b9e8ef059c6b32ea59fc1d322d37f04aa30bae5aa9003b8321e21ddb04e300"
  );

  // --- Utility Functions ---

  function randomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  function toBase64(buffer: Uint8Array | ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
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

  function hexToBigInt(hex: string): bigint {
    return BigInt("0x" + hex);
  }

  function bigIntToHex(n: bigint): string {
    let hex = n.toString(16);
    if (hex.length % 2 !== 0) hex = "0" + hex;
    return hex;
  }

  function bigIntToBuf(n: bigint): Uint8Array {
    const hex = bigIntToHex(n);
    const len = hex.length / 2;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return u8;
  }

  // --- New Helpers for Hex <-> Base64 interop ---

  function hexToBase64(hex: string): string {
    // 1. Hex -> BigInt -> Buf -> Base64 (Safe for SRP numbers)
    // Or direct hex->buf parsing
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    return toBase64(bytes);
  }

  function base64ToHex(b64: string): string {
    const bytes = fromBase64(b64);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256(
    ...args: (string | bigint | Uint8Array)[]
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    let combined = new Uint8Array(0);

    for (const arg of args) {
      let buffer: Uint8Array;
      if (typeof arg === "string") buffer = encoder.encode(arg);
      else if (typeof arg === "bigint") buffer = bigIntToBuf(arg);
      else buffer = arg;

      const temp = new Uint8Array(combined.length + buffer.length);
      temp.set(combined);
      temp.set(buffer, combined.length);
      combined = temp;
    }

    return new Uint8Array(
      await crypto.subtle.digest("SHA-256", combined as unknown as BufferSource)
    );
  }

  async function H(...args: (string | bigint | Uint8Array)[]): Promise<bigint> {
    const digest = await sha256(...args);
    const hex = Array.from(digest)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return BigInt("0x" + hex);
  }

  function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
      if (exp % 2n === 1n) result = (result * base) % mod;
      exp = exp / 2n;
      base = (base * base) % mod;
    }
    return result;
  }

  // --- 1. SRP Primitives ---

  const generateSalt = (): string => toBase64(randomBytes(16));

  async function deriveSRPPrivateKey(
    saltB64: string,
    email: string,
    pass: string
  ): Promise<bigint> {
    const saltBytes = fromBase64(saltB64);
    const innerHash = await sha256(email + ":" + pass);
    const outerHash = await sha256(saltBytes, innerHash);
    const hex = Array.from(outerHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return BigInt("0x" + hex);
  }

  const computeVerifier = (x: bigint): string => {
    const v = modPow(g, x, N);
    return toBase64(bigIntToBuf(v));
  };

  const generateEphemeralSecret = (): string => {
    const aBytes = randomBytes(32);
    const hex = Array.from(aBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex;
  };

  // Returns Hex (internal use)
  const computeClientPublic = (ephemeralPrivateHex: string): string => {
    const a = hexToBigInt(ephemeralPrivateHex);
    const A = modPow(g, a, N);
    return bigIntToHex(A);
  };

  const computeSessionSecret = async (
    saltHex: string,
    serverPublicHex: string,
    clientEphemeralHex: string,
    privateKeyHex: string
  ): Promise<string> => {
    const B = hexToBigInt(serverPublicHex);
    const a = hexToBigInt(clientEphemeralHex);
    const x = hexToBigInt(privateKeyHex);
    const A = modPow(g, a, N);

    // u = H(A, B)
    const u = await H(bigIntToBuf(A), bigIntToBuf(B));

    const v = modPow(g, x, N);
    let term1 = (B - ((k * v) % N)) % N;
    if (term1 < 0n) term1 += N;

    const exp = a + u * x;
    const S = modPow(term1, exp, N);
    return bigIntToHex(S);
  };

  const computeSessionKey = async (
    sessionSecretHex: string
  ): Promise<string> => {
    const S = hexToBigInt(sessionSecretHex);
    const K = await H(bigIntToBuf(S));
    return bigIntToHex(K);
  };

  const computeClientProof = async (
    email: string,
    saltHex: string,
    clientPublicHex: string,
    serverPublicHex: string,
    sessionKeyHex: string
  ): Promise<string> => {
    const A = hexToBigInt(clientPublicHex);
    const B = hexToBigInt(serverPublicHex);
    const K = hexToBigInt(sessionKeyHex);

    const H_N = await H(bigIntToBuf(N));
    const H_g = await H(bigIntToBuf(g));
    const xor = H_N ^ H_g;
    const H_I = await H(email);
    const s = hexToBigInt(saltHex);

    const M1 = await H(
      bigIntToBuf(xor),
      bigIntToBuf(H_I),
      bigIntToBuf(s),
      bigIntToBuf(A),
      bigIntToBuf(B),
      bigIntToBuf(K)
    );
    return bigIntToHex(M1);
  };

  const verifyServerProof = async (
    clientPublicHex: string,
    clientProofHex: string,
    sessionKeyHex: string,
    serverProofHex: string
  ): Promise<boolean> => {
    const A = hexToBigInt(clientPublicHex);
    const M1 = hexToBigInt(clientProofHex);
    const K = hexToBigInt(sessionKeyHex);
    const M2_received = hexToBigInt(serverProofHex);

    const M2_calc = await H(bigIntToBuf(A), bigIntToBuf(M1), bigIntToBuf(K));
    return M2_calc === M2_received;
  };

  // --- 2. Symmetric Encryption (AES-GCM) & KDF (Argon2id) ---

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
    generateSalt,
    randomBytes,
    toBase64,
    fromBase64,
    hexToBase64,
    base64ToHex,
    bigIntToHex,
    deriveSRPPrivateKey,
    computeVerifier,
    generateEphemeralSecret,
    computeClientPublic,
    computeSessionSecret,
    computeSessionKey,
    computeClientProof,
    verifyServerProof,
    deriveKeyArgon2id,
    importAESKey,
    encryptAES,
    decryptAES,
    generateKeyPair,
    exportPublicKey,
    exportPrivateKey,
  };
};
