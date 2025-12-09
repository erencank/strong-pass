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
    // 1. SRP Setup ()
    const srpSaltHex = cs.generateUserSalt();
    const srpSalt = cs.hexToBase64(srpSaltHex);
    const privateKey = await cs.generatePrivateKey(srpSaltHex, email, password);
    const srpVerifierHex = await cs.srpGetVerifier(privateKey);
    const srpVerifier = cs.hexToBase64(srpVerifierHex);

    // 2. Asymmetric Key Pair ( Vault encryption)
    const keyPair = await cs.generateKeyPair();
    const publicKeyB64 = await cs.exportPublicKey(keyPair.publicKey);
    const privateKeyBytes = await cs.exportPrivateKey(keyPair.privateKey);

    // 3. DEK Setup (Master Password Key)
    const dekSalt = cs.toBase64(cs.randomBytes(16));
    const dekBytes = await cs.deriveKeyArgon2id(password, dekSalt);
    const dek = await cs.importAESKey(dekBytes);
    const encryptedPrivateKey = await cs.encryptAES(dek, privateKeyBytes);

    // 4. Recovery Setup
    const recoveryCode = cs.toBase64(cs.randomBytes(32)).slice(0, 24);
    const recSalt = cs.toBase64(cs.randomBytes(16));
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
      srp_verifier: srpVerifier,
      srp_group_id: "2048",
      public_key: publicKeyB64,
      dek_salt: dekSalt,
      encrypted_private_key: encryptedPrivateKey,
      rec_salt: recSalt,
      encrypted_private_key_recovery: encryptedPrivateKeyRecovery,
      encrypted_vault_key: encryptedVaultKey,
    };
    console.log(payload);

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

      console.log(initData.value);

      if (initError.value || !initData.value) {
        throw new Error(
          initError.value?.data?.detail || "User not found or connection failed"
        );
      }

      const { srp_salt: saltB64, srp_group_id } = initData.value;
      if (srp_group_id !== "2048") {
        throw new Error(`Unsupported SRP Group: ${srp_group_id}`);
      }

      // Step 1 Local: Initialize Client & Generate 'A'
      // We get a session object that holds the library state
      const clientEphemeral = await cs.srpClientStep1();
      const clientEphemeralB64 = cs.hexToBase64(clientEphemeral.public);

      console.log("AAAAA");
      console.log(clientEphemeralB64);

      const { data: challengeData, error: challengeError } =
        await useApi<SRPChallengeResponse>("/auth/srp/challenge", {
          method: "POST",
          body: {
            email,
            client_ephemeral_public: clientEphemeralB64,
          },
          skipAuthError: true,
        });

      if (challengeError.value || !challengeData.value) {
        throw new Error(
          challengeError.value?.data?.detail || "SRP Challenge failed"
        );
      }

      const { server_ephemeral_public: serverPublicB64, srp_session_id } =
        challengeData.value;

      console.log("BBBBBB");
      console.log(serverPublicB64);

      // Step 2 (Local): Compute Session Key 'K' & Proof 'M1'
      // We pass in Base64 values; the service converts them to Hex for calculation
      const derivedSession = await cs.srpClientStep2(
        clientEphemeral,
        serverPublicB64,
        saltB64,
        email,
        password
      );

      // Step 3 (Network): Token - Send 'M1', Receive Token & 'M2'
      const { data: tokenData, error: tokenError } =
        await useApi<TokenResponse>("/auth/srp/token", {
          method: "POST",
          body: {
            srp_session_id,
            client_ephemeral_public: clientEphemeralB64, // Send 'A' again for verification context
            client_proof: derivedSession.proofB64, // M1 (Base64)
          },
          skipAuthError: true,
        });

      if (tokenError.value || !tokenData.value) {
        throw new Error("Incorrect password or authentication failed");
      }

      const { access_token, server_proof: serverProofB64 } = tokenData.value;

      try {
        await cs.srpClientStep3(
          clientEphemeral,
          derivedSession.proofHex, // M1 (Hex)
          serverProofB64, // M2 (Base64)
          derivedSession.keyHex // K (Hex)
        );
      } catch (e) {
        throw new Error(
          "Server authentication failed! Possible Man-in-the-Middle attack."
        );
      }

      // Success!
      console.log(access_token);
      token.value = access_token;
      //   await fetchUser();

      router.push("/");
    } catch (err: any) {
      console.error("SRP Login Error:", err);
      throw err;
    }
  }

  // --- Helper Actions ---

  //   async function fetchUser() {
  //     if (!token.value) return;
  //     const { data, error } = await useApi<User>("/auth/me");
  //     if (error.value) {
  //       logout();
  //       return;
  //     }
  //     user.value = data.value;
  //   }

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
    // fetchUser,
  };
});
