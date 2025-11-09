import { defineStore } from "pinia";
import { useApi } from "~/compostables/useApi";
import { usePublicApi } from "~/compostables/usePublicApi";
import {
  type IRegisterRequest,
  type IRegisterResponse,
  type ILoginRequest,
  type ILoginResponse,
  type IChallengeRequest,
  type IChallengeResponse,
  type IUserMe,
} from "~/types/api-contracts";

export const useAuthStore = defineStore("auth", () => {
  // Persist the token in a secure, httpOnly cookie if possible.
  // For Tauri, local storage or a cookie might be fine.
  // useCookie is universal.
  const token = useCookie("auth-token", {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "lax",
  });

  const user = ref<IUserMe | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  /**
   * Register a new user.
   */
  async function register(payload: IRegisterRequest) {
    // No auth token needed for this request
    return usePublicApi<IRegisterResponse>("/auth/register", {
      method: "POST",
      body: payload,
    });
  }

  /**
   * Step 1 of login: Get the salt and challenge.
   */
  async function getLoginChallenge(payload: IChallengeRequest) {
    // No auth token needed
    return usePublicApi<IChallengeResponse>("/auth/token/challenge", {
      method: "POST",
      body: payload,
    });
  }

  /**
   * Step 2 of login: Solve the challenge and get the session token.
   */
  async function login(payload: ILoginRequest) {
    const { data, error } = await usePublicApi<ILoginResponse>("/auth/token", {
      method: "POST",
      body: payload,
    });

    if (data.value) {
      token.value = data.value.access_token;
      // After login, fetch the user's details
      await fetchUserMe();
    }

    return { data, error };
  }

  /**
   * Fetch the current authenticated user's details.
   */
  async function fetchUserMe() {
    if (!token.value) return;

    const { data } = await useApi<IUserMe>("/auth/users/me", {
      method: "GET",
    });

    if (data.value) {
      user.value = data.value;
    }
  }

  /**
   * Log the user out, clear state, and redirect.
   */
  function logout() {
    token.value = null;
    user.value = null;
    // Redirect to login page
    navigateTo("/login", { replace: true });
  }

  return {
    token,
    user,
    isAuthenticated,
    register,
    getLoginChallenge,
    login,
    fetchUserMe,
    logout,
  };
});
