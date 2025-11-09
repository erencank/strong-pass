import {
  type IPublicKeyRequest,
  type IPublicKeyResponse,
} from "~/types/api-contracts";
import { useApi } from "./useApi";

/**
 * Composable providing crypto-related utility functions.
 */
export function useCryptoService() {
  const isLoading = ref(false);

  /**
   * Fetch a user's public key by their email address.
   * This is used when sharing a vault to get the recipient's key.
   */
  async function fetchUserPublicKey(payload: IPublicKeyRequest) {
    isLoading.value = true;
    const { data, error } = await useApi<IPublicKeyResponse>(
      "/crypto/public-key",
      {
        method: "POST",
        body: payload,
      }
    );
    isLoading.value = false;

    if (error.value) {
      console.error("Failed to fetch public key:", error.value);
      return null;
    }

    return data.value?.public_key || null;
  }

  return {
    isLoading,
    fetchUserPublicKey,
  };
}
