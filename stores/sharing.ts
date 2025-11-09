import { defineStore } from "pinia";
import {
  type ILinkCreateRequest,
  type ILinkCreateResponse,
  type ILinkReadResponse,
} from "~/types/api-contracts";

export const useSharingStore = defineStore("sharing", () => {
  const isLoading = ref(false);

  /**
   * Create a new shareable public link. (Authenticated)
   */
  async function createPublicLink(payload: ILinkCreateRequest) {
    isLoading.value = true;
    const { data, error } = await useApi<ILinkCreateResponse>("/links/", {
      method: "POST",
      body: payload,
    });
    isLoading.value = false;
    return { data, error };
  }

  /**
   * Get the contents of a public link. (Unauthenticated)
   */
  async function getPublicLink(linkId: string) {
    isLoading.value = true;
    const { data, error } = await usePublicApi<ILinkReadResponse>(
      `/links/${linkId}`,
      {
        method: "GET",
      }
    );
    isLoading.value = false;
    return { data, error };
  }

  return {
    isLoading,
    createPublicLink,
    getPublicLink,
  };
});
