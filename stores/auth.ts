import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { useCryptoService } from "~/composables/useCryptoService";
import type {
  UserInitResponse,
  SRPChallengeResponse,
  TokenResponse,
  User,
  UserCreate,
  UserCreateResponse,
} from "~/types/api-contracts";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(null);
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!token.value);

  const router = useRouter();
  const cs = useCryptoService();

  // --- Registration Flow ---

  async function register(email: string, password: string): Promise<string> {
    // 1. SRP Setup
    const srpSalt = cs.generateSalt(); // Base64
    const x = await cs.deriveSRPPrivateKey(srpSalt, email, password);
    const verifier = cs.computeVerifier(x); // Base64

    // 2. Asymmetric Key Pair
    const keyPair = await cs.generateKeyPair();
    const publicKeyB64 = await cs.exportPublicKey(keyPair.publicKey);
    const privateKeyBytes = await cs.exportPrivateKey(keyPair.privateKey);

    // 3. DEK Setup (Master Password Key)
    const dekSalt = cs.generateSalt();
    const dekBytes = await cs.deriveKeyArgon2id(password, dekSalt);
    const dek = await cs.importAESKey(dekBytes);
    const encryptedPrivateKey = await cs.encryptAES(dek, privateKeyBytes);

    // 4. Recovery Setup
    const recoveryCode = cs.toBase64(cs.randomBytes(32)).slice(0, 24);
    const recSalt = cs.generateSalt();
    const recKeyBytes = await cs.deriveKeyArgon2id(recoveryCode, recSalt);
    const recKey = await cs.importAESKey(recKeyBytes);
    const encryptedPrivateKeyRecovery = await cs.encryptAES(
      recKey,
      privateKeyBytes
    );

    // 5. Vault Key Setup
    const vaultKeyBytes = cs.randomBytes(32);
    const encryptedVaultKey = await cs.encryptAES(dek, vaultKeyBytes);

    // 6. Send to API
    const payload: UserCreate = {
      email,
      srp_salt: srpSalt,
      srp_verifier: verifier,
      srp_group_id: "2048",
      public_key: publicKeyB64,
      dek_salt: dekSalt,
      encrypted_private_key: encryptedPrivateKey,
      rec_salt: recSalt,
      encrypted_private_key_recovery: encryptedPrivateKeyRecovery,
      encrypted_vault_key: encryptedVaultKey,
    };

    const { error } = await useApi<UserCreateResponse>("/auth/register", {
      method: "POST",
      body: payload,
    });

    if (error.value) {
      throw new Error(error.value.data?.detail || "Registration failed");
    }

    return recoveryCode;
  }

  // --- SRP Login Flow (3 Steps) ---

  async function login(email: string, password: string): Promise<void> {
    try {
      // Step 1: Init - Get Salts
      const { data: initData, error: initError } =
        await useApi<UserInitResponse>("/auth/init", {
          method: "POST",
          body: { email },
          skipAuthError: true,
        });

      if (initError.value || !initData.value) {
        throw new Error(
          initError.value?.data?.detail || "User not found or connection failed"
        );
      }

      const { srp_salt: saltB64, srp_group_id } = initData.value;
      if (srp_group_id !== "2048") {
        throw new Error(`Unsupported SRP Group: ${srp_group_id}`);
      }

      // Pre-compute 'x' (PrivateKey)
      const x = await cs.deriveSRPPrivateKey(saltB64, email, password);

      // Generate Client Ephemeral 'a' and Public 'A'
      const a_hex = cs.generateEphemeralSecret();
      const A_hex = cs.computeClientPublic(a_hex);
      const A_b64 = cs.hexToBase64(A_hex); // Convert to Base64 for API

      // Step 2: Challenge - Send 'A', Receive 'B' & Session ID
      const { data: challengeData, error: challengeError } =
        await useApi<SRPChallengeResponse>("/auth/srp/challenge", {
          method: "POST",
          body: {
            email,
            client_ephemeral_public: A_b64,
          },
          skipAuthError: true,
        });

      if (challengeError.value || !challengeData.value) {
        throw new Error(
          challengeError.value?.data?.detail || "SRP Challenge failed"
        );
      }

      const {
        server_ephemeral_public: B_b64,
        srp_salt: saltB64_confirm,
        srp_session_id,
      } = challengeData.value;

      // Calculate Session Key 'K' and Client Proof 'M1'
      const B_hex = cs.base64ToHex(B_b64);
      const salt_hex = cs.base64ToHex(saltB64_confirm);

      const S_hex = await cs.computeSessionSecret(
        salt_hex,
        B_hex,
        a_hex,
        cs.bigIntToHex(x)
      );
      const K_hex = await cs.computeSessionKey(S_hex);
      const M1_hex = await cs.computeClientProof(
        email,
        salt_hex,
        A_hex,
        B_hex,
        K_hex
      );
      const M1_b64 = cs.hexToBase64(M1_hex); // Convert to Base64 for API

      // Step 3: Token - Send 'M1', Receive Token & 'M2'
      const { data: tokenData, error: tokenError } =
        await useApi<TokenResponse>("/auth/srp/token", {
          method: "POST",
          body: {
            srp_session_id,
            client_ephemeral_public: A_b64, // API requires sending A again for verification
            client_proof: M1_b64,
          },
          skipAuthError: true,
        });

      if (tokenError.value || !tokenData.value) {
        throw new Error("Incorrect password or authentication failed");
      }

      const { access_token, server_proof: M2_b64 } = tokenData.value;

      // Verify Server Proof (M2)
      const M2_hex = cs.base64ToHex(M2_b64);
      const isValidServer = await cs.verifyServerProof(
        A_hex,
        M1_hex,
        K_hex,
        M2_hex
      );

      if (!isValidServer) {
        throw new Error(
          "Server authentication failed! Possible Man-in-the-Middle attack."
        );
      }

      // Success
      token.value = access_token;

      // Fetch user profile
      await fetchUser();

      router.push("/");
    } catch (err: any) {
      console.error("SRP Login Error:", err);
      throw err;
    }
  }

  // --- Helper Actions ---

  async function fetchUser() {
    if (!token.value) return;

    // TODO: Define specific User response type if different from generic
    const { data, error } = await useApi<User>("/users/me");
    if (error.value) {
      logout();
      return;
    }
    user.value = data.value;
  }

  function logout() {
    token.value = null;
    user.value = null;
    router.push("/auth");
  }

  return {
    token,
    user,
    isAuthenticated,
    register,
    login,
    logout,
    fetchUser,
  };
});
