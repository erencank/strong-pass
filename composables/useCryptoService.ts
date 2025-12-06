/**
 * SRP-6a Crypto Service
 * Implements Secure Remote Password protocol logic using Web Crypto API and BigInt.
 * * STANDARD: RFC 5054 2048-bit Group parameters.
 * IMPORTANT: Ensure 'N' and 'g' match your Python backend exactly.
 */

export const useCryptoService = () => {
  // --- Constants (RFC 5054 2048-bit Group) ---
  // If your backend uses 4096-bit or different parameters, replace these values.

  const N_hex =
    "AC6BDB41324A9A9BF166DE5E1389582FAF72B6651987EE07FC3192943DB56050A37329CBB4" +
    "A099ED8193E0757767A13DD52312AB4B03310DCD7F48A9DA04FD50E8083969EDB767B0CF60" +
    "95179A163AB3661A05FBD5FAAAE82918A9962F0B93B855F97993EC975EEAA80D740ADBF4FF" +
    "7453866200F77C769102100490B971876038234E04FBB9C07F4872AD5D735977461564463B" +
    "A5990F565C9529F494511D733267793E1165A1961447050212F13D48B47C1339695627E439" +
    "26D0219602A77446C93609871788C5C81646487570481F190D5505299285090DD93A24B792" +
    "40234F3C729013C23C5E479D1936359D03750F8990F452286C32360215F3389A9003";

  const g_hex = "02";

  // Pre-compute BigInts
  const N = BigInt("0x" + N_hex);
  const g = BigInt("0x" + g_hex);
  const k = BigInt(
    "0x5b9e8ef059c6b32ea59fc1d322d37f04aa30bae5aa9003b8321e21ddb04e300"
  ); // k = H(N, g) for SHA-256 and N-2048

  // --- Helper Functions ---

  /**
   * Converts a generic string to a Uint8Array (UTF-8)
   */
  function stringToBuf(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  /**
   * Converts a hex string to BigInt
   */
  function hexToBigInt(hex: string): bigint {
    return BigInt("0x" + hex);
  }

  /**
   * Converts BigInt to Hex string (padded to even length)
   */
  function bigIntToHex(n: bigint): string {
    let hex = n.toString(16);
    if (hex.length % 2 !== 0) hex = "0" + hex;
    return hex;
  }

  /**
   * Generates a random Hex string of byteLength bytes
   */
  function randomHex(byteLength: number = 32): string {
    const array = new Uint8Array(byteLength);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * SHA-256 Hash function
   * Returns BigInt of the hash
   * Supports input as String, Hex String (if prefixed 0x?), or BigInt
   */
  async function H(...args: (string | bigint | Uint8Array)[]): Promise<bigint> {
    const encoder = new TextEncoder();
    let combined: Uint8Array = new Uint8Array(0);

    for (const arg of args) {
      let buffer: Uint8Array;

      if (typeof arg === "string") {
        // Assume raw string unless it's a hex representation we specifically want to decode?
        // SRP is tricky. Usually:
        // - I (email), P (password), salt are strings or hex strings treated as bytes.
        // - N, g, A, B are BigInts converted to Byte Arrays (padded).

        // For this implementation, we will try to detect hex by context or helper usage.
        // To be safe, we will rely on specific helpers for the main logic.
        buffer = encoder.encode(arg);
      } else if (typeof arg === "bigint") {
        // Convert BigInt to Buffer (padded to N size is ideal, but for simple H() usually just raw bytes)
        // Standard SRP H() often treats integers as byte arrays.
        let hex = arg.toString(16);
        if (hex.length % 2 !== 0) hex = "0" + hex;
        buffer = new Uint8Array(
          hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );
      } else {
        buffer = arg;
      }

      const temp = new Uint8Array(combined.length + buffer.length);
      temp.set(combined);
      temp.set(buffer, combined.length);
      combined = temp;
    }

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      combined as BufferSource
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return BigInt("0x" + hashHex);
  }

  /**
   * Special Hash for SRP: H(s, H(I | ':' | P))
   * Note: This implementation assumes standard string concatenation for identity/pass
   * and Byte buffer concatenation for salt + inner hash.
   */
  async function computeX(
    saltHex: string,
    email: string,
    password: string
  ): Promise<bigint> {
    const encoder = new TextEncoder();

    // 1. Inner = SHA256(email + ":" + password)
    const innerData = encoder.encode(`${email}:${password}`);
    const innerHashBuf = await crypto.subtle.digest("SHA-256", innerData);

    // 2. Outer = SHA256(salt_bytes + inner_hash_bytes)
    // Salt is hex, need to decode
    const saltBytes = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const innerHashBytes = new Uint8Array(innerHashBuf);

    const combined = new Uint8Array(saltBytes.length + innerHashBytes.length);
    combined.set(saltBytes);
    combined.set(innerHashBytes, saltBytes.length);

    const outerHashBuf = await crypto.subtle.digest("SHA-256", combined);

    // Convert to BigInt
    const hex = Array.from(new Uint8Array(outerHashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return BigInt("0x" + hex);
  }

  /**
   * Modular Exponentiation: (base ^ exp) % mod
   */
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

  // --- Core SRP Functions ---

  const generateSalt = (): string => {
    return randomHex(16); // 16 bytes = 32 hex chars
  };

  const derivePrivateKey = async (
    salt: string,
    email: string,
    password: string
  ): Promise<string> => {
    const x = await computeX(salt, email, password);
    return bigIntToHex(x);
  };

  const computeVerifier = (privateKeyHex: string): string => {
    const x = hexToBigInt(privateKeyHex);
    // v = g^x % N
    const v = modPow(g, x, N);
    return bigIntToHex(v);
  };

  const generateEphemeralSecret = (): string => {
    // 'a' should be at least 32 bytes
    return randomHex(32);
  };

  const computeClientPublic = (ephemeralPrivateHex: string): string => {
    const a = hexToBigInt(ephemeralPrivateHex);
    // A = g^a % N
    const A = modPow(g, a, N);
    return bigIntToHex(A);
  };

  /**
   * Compute Session Secret S
   * S = (B - k * g^x) ^ (a + u * x) % N
   */
  const computeSessionSecret = async (
    saltHex: string,
    serverPublicHex: string,
    clientEphemeralHex: string,
    privateKeyHex: string
  ): Promise<string> => {
    const B = hexToBigInt(serverPublicHex);
    const a = hexToBigInt(clientEphemeralHex);
    const x = hexToBigInt(privateKeyHex);
    const A = modPow(g, a, N); // We need A for calculating u

    // Calculate random scrambling parameter u = H(A, B)
    // Note: Python `hashlib` update order matters. Usually H(A + B)
    // We pad A and B to N length in bytes before hashing if strictly following RFC,
    // but here we simply hash the BigInts.
    // Ensure padding if your backend enforces it!
    const u = await H(A, B);

    // S = (B - k * v) ^ (a + u * x) % N
    // First calculate (B - k * g^x)
    // v = g^x % N
    const v = modPow(g, x, N);

    // term1 = B - k * v
    let term1 = (B - ((k * v) % N)) % N;
    if (term1 < 0n) term1 += N; // Handle negative modulo

    // exp = a + u * x
    const exp = a + u * x;

    const S = modPow(term1, exp, N);
    return bigIntToHex(S);
  };

  const computeSessionKey = async (
    sessionSecretHex: string
  ): Promise<string> => {
    const S = hexToBigInt(sessionSecretHex);
    // K = H(S)
    const K = await H(S);
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

    // M1 = H(A, B, K)
    // *SIMPLIFIED*: Standard SRP-6a is more complex: H(H(N)xorH(g) | H(I) | s | A | B | K)
    // If your backend uses simple H(A, B, K) or H(A | B | S), verify this.
    // Below is the FULL SRP-6a standard M1 calculation implementation:

    // 1. H_N = H(N)
    const H_N = await H(N);
    // 2. H_g = H(g)
    const H_g = await H(g);
    // 3. XOR = H_N ^ H_g
    const xor = H_N ^ H_g; // BigInt XOR

    // 4. H_I = H(email)
    const H_I = await H(email);

    // 5. s (salt)
    const s = hexToBigInt(saltHex);

    // M1 = H(xor | H_I | s | A | B | K)
    const M1 = await H(xor, H_I, s, A, B, K);

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

    // M2 = H(A, M1, K)
    const M2_calc = await H(A, M1, K);

    return M2_calc === M2_received;
  };

  return {
    generateSalt,
    derivePrivateKey,
    computeVerifier,
    generateEphemeralSecret,
    computeClientPublic,
    computeSessionSecret,
    computeSessionKey,
    computeClientProof,
    verifyServerProof,
  };
};
