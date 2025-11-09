import { defineStore } from "pinia";
import type {
  IChallengeRequest,
  IChallengeResponse,
  ILoginRequest,
  ILoginResponse,
  IRegisterRequest,
  IRegisterResponse,
} from "~/types/api-contracts";

// This device ID would be generated once and stored in localStorage
// For this example, we'll use a placeholder.
const MOCK_DEVICE_ID = "00000000-0000-0000-0000-000000000001";

export const useAuthStore = defineStore("auth", () => {
  const token = useCookie("auth-token", { maxAge: 60 * 60 * 24 * 7 }); // 1 week
  const userEmail = ref<string | null>(null);

  // State for the 2-step login flow
  const loginStep = ref<"email" | "password">("email");
  const loginEmail = ref<string>("");
  const challengeToken = ref<string>("");
  const masterPasswordSalt = ref<string>("");

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Resets the login flow to the first step
   */
  function resetLoginFlow() {
    loginStep.value = "email";
    loginEmail.value = "";
    challengeToken.value = "";
    masterPasswordSalt.value = "";
    error.value = null;
  }

  /**
   * STEP 1 of Login: Get salt and challenge from the server.
   */
  async function loginStep1_getChallenge(email: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const { data, error: apiError } = await useApi<IChallengeResponse>(
        "/auth/token/challenge",
        {
          method: "POST",
          body: {
            email,
            device_id: MOCK_DEVICE_ID, // TODO: This must be a real, stored device ID
          } as IChallengeRequest,
        }
      );

      if (apiError.value) throw apiError.value;

      if (data.value) {
        // Save state for step 2
        masterPasswordSalt.value = data.value.master_password_salt;
        challengeToken.value = data.value.challenge_token;
        loginEmail.value = email;
        loginStep.value = "password"; // Move to the next step
      }
    } catch (e: any) {
      error.value =
        e.data?.detail || "An error occurred fetching the login challenge.";
      resetLoginFlow();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * STEP 2 of Login: Solve the challenge and get the session token.
   */
  async function loginStep2_solveChallenge(masterPassword: string) {
    if (!challengeToken.value || !masterPasswordSalt.value) {
      error.value = "Login flow error. Please start over.";
      resetLoginFlow();
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // --- START: Client-Side Crypto (Required) ---
      // TODO: 1. Derive key from masterPassword and masterPasswordSalt.value
      // const derivedKey = await deriveKey(masterPassword, masterPasswordSalt.value);

      // TODO: 2. Load the encrypted device private key from local storage.
      // const encryptedPrivateKeyBlob = localStorage.getItem('devicePrivateKey');

      // TODO: 3. Decrypt the private key using the derivedKey.
      // const privateKey = await decrypt(encryptedPrivateKeyBlob, derivedKey);

      // TODO: 4. Sign the challengeToken.value using the decrypted privateKey.
      // const signature = await sign(challengeToken.value, privateKey);

      // Placeholder - this WILL fail until crypto is implemented
      const signature = "B64_SIGNATURE_PLACEHOLDER";
      // --- END: Client-Side Crypto (Required) ---

      const { data, error: apiError } = await useApi<ILoginResponse>(
        "/auth/token",
        {
          method: "POST",
          body: {
            challenge_token: challengeToken.value,
            signature: signature, // The B64-encoded signature
          } as ILoginRequest,
        }
      );

      if (apiError.value) throw apiError.value;

      if (data.value) {
        token.value = data.value.access_token;
        userEmail.value = loginEmail.value;
        resetLoginFlow();
        await navigateTo("/"); // Redirect to dashboard
      }
    } catch (e: any) {
      error.value = e.data?.detail || "Invalid password or signature.";
      // Don't reset flow, let them try password again
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Register a new user and their first device.
   */
  async function register(
    email: string,
    masterPassword: string,
    deviceName: string
  ) {
    isLoading.value = true;
    error.value = null;

    try {
      // --- START: Client-Side Crypto (Required) ---
      // TODO: 1. Generate master_password_salt
      // const salt = generateSalt();

      // TODO: 2. Derive master_password_hash
      // const hash = await deriveKey(masterPassword, salt);

      // TODO: 3. Generate new device keypair (public/private)
      // const { publicKey, privateKey } = await generateKeyPair();

      // TODO: 4. Generate new main vault encryption key
      // const vaultKey = await generateSymmetricKey();

      // TODO: 5. Encrypt the device private key with the derived key (hash)
      // const encryptedPrivateKey = await encrypt(privateKey, hash);

      // TODO: 6. Encrypt the vault key with the derived key (hash)
      // const encryptedVaultKey = await encrypt(vaultKey, hash);

      // TODO: 7. Encrypt the wrapping key (this is complex, depends on your exact E2EE design)
      // For now, let's assume it's also encrypted with the derived key.
      // const encryptedWrappingKey = await encrypt(something, hash);

      // Placeholder - this WILL fail until crypto is implemented
      const registerPayload: IRegisterRequest = {
        email,
        master_password_hash: "B64_HASH_PLACEHOLDER",
        master_password_salt: "SALT_PLACEHOLDER",
        device_name: deviceName,
        device_public_key: "B64_PUBLIC_KEY_PLACEHOLDER",
        device_encrypted_private_key_blob: "B64_PRIVATE_KEY_BLOB_PLACEHOLDER",
        device_encrypted_wrapping_key: "B64_WRAPPING_KEY_PLACEHOLDER",
        encrypted_vault_key: "B64_VAULT_KEY_PLACEHOLDER",
      };
      // --- END: Client-Side Crypto (Required) ---

      const { data, error: apiError } = await useApi<IRegisterResponse>(
        "/auth/register",
        {
          method: "POST",
          body: registerPayload,
        }
      );

      if (apiError.value) throw apiError.value;

      if (data.value?.status === "success") {
        // TODO: Store device ID, encrypted private key, etc. in localStorage
        // localStorage.setItem('deviceId', data.value.device_id);
        // localStorage.setItem('devicePrivateKey', encryptedPrivateKey);

        // After registering, log the user in.
        await loginStep1_getChallenge(email);
        await loginStep2_solveChallenge(masterPassword);
      }
    } catch (e: any) {
      error.value = e.data?.detail || "Registration failed.";
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Log the user out by clearing the token and redirecting.
   */
  async function logout() {
    token.value = null;
    userEmail.value = null;
    resetLoginFlow();
    await navigateTo("/auth");
  }

  return {
    token,
    userEmail,
    loginStep,
    loginEmail,
    isLoading,
    error,
    loginStep1_getChallenge,
    loginStep2_solveChallenge,
    register,
    logout,
    resetLoginFlow,
  };
});
