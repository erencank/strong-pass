import { defineStore } from "pinia";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { useCryptoService } from "~/composables/useCryptoService";
// Assuming these types exist in your contracts, or I define the shape here for usage
import type {
  SRPInitResponse,
  SRPLoginResponse,
  User,
} from "~/types/api-contracts";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(null);
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!token.value);

  const router = useRouter();
  const cryptoService = useCryptoService();

  // --- Registration Flow ---

  async function register(email: string, password: string): Promise<void> {
    // 1. Generate a random salt
    const salt = cryptoService.generateSalt();

    // 2. Derive the private key (x) and then the verifier (v)
    // Adjust method signature based on your actual useCryptoService implementation
    const privateKey = await cryptoService.derivePrivateKey(
      salt,
      email,
      password
    );
    const verifier = cryptoService.computeVerifier(privateKey);

    // 3. Send Identity + Salt + Verifier to backend
    const { error } = await useApi("/auth/register", {
      method: "POST",
      body: {
        email,
        salt,
        verifier,
      },
    });

    if (error.value) {
      throw new Error(error.value.data?.detail || "Registration failed");
    }

    // Optional: Auto-login after register or redirect to login
    router.push("/auth?mode=login");
  }

  // --- SRP Login Flow ---

  async function login(email: string, password: string): Promise<void> {
    try {
      // Step 1: SRP Init (Handshake)
      // Send identity (email) to get the Salt (s) and Server Public Key (B)
      const { data: initData, error: initError } =
        await useApi<SRPInitResponse>("/auth/srp/init", {
          method: "POST",
          body: { email },
          // If 404/User not found, we generally don't want to logout global state yet
          skipAuthError: true,
        });

      if (initError.value) {
        throw new Error(
          initError.value.data?.detail || "User not found or connection failed"
        );
      }

      const { salt, B: B } = initData.value!;

      // Step 2: Client-side SRP Calculations
      // a = ephemeral private key (random)
      // A = ephemeral public key (g^a % N)
      const a = cryptoService.generateEphemeralSecret();
      const A = cryptoService.computeClientPublic(a);

      // x = private key derived from salt + email + password
      const x = await cryptoService.derivePrivateKey(salt, email, password);

      // S = Session Premaster Secret
      // K = Session Key (Hash of S)
      // M1 = Client Proof
      const S = await cryptoService.computeSessionSecret(salt, B, a, x);
      const K = await cryptoService.computeSessionKey(S);
      const M1 = await cryptoService.computeClientProof(email, salt, A, B, K);

      // Step 3: SRP Verify
      // Send A and M1 to server. Server verifies M1.
      // Server returns M2 (Server Proof) and the JWT Token.
      const { data: verifyData, error: verifyError } =
        await useApi<SRPLoginResponse>("/auth/srp/verify", {
          method: "POST",
          body: {
            email,
            client_public: A,
            client_proof: M1,
          },
          skipAuthError: true, // Handle "Invalid Password" manually
        });

      if (verifyError.value) {
        throw new Error("Incorrect password or verification failed");
      }

      const { M2: M2, access_token, token_type } = verifyData.value!;

      // Step 4: Verify Server Proof (M2)
      // Ensure the server actually knows the password (verifier)
      const isValidServer = cryptoService.verifyServerProof(A, M1, K, M2);

      if (!isValidServer) {
        throw new Error(
          "Server authentication failed! Possible Man-in-the-Middle attack."
        );
      }

      // Step 5: Success
      token.value = access_token;

      // Ideally fetch the user profile immediately
      await fetchUser();

      router.push("/");
    } catch (err: any) {
      console.error("SRP Login Error:", err);
      // Clean up sensitive data from memory if possible
      throw err;
    }
  }

  // --- Helper Actions ---

  async function fetchUser() {
    if (!token.value) return;

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

    // Clear any localStorage/Cookies if you are using them for persistence
    // const cookie = useCookie('token');
    // cookie.value = null;

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
