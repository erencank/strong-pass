import { defineStore } from "pinia";
import { useApi } from "~/compostables/useApi";
import {
  type ISimpleVault,
  type IDetailedVault,
  type IVaultShare,
  type IVaultCreateRequest,
  type IVaultUpdateRequest,
  type IShareResponseRequest,
  type IVaultShareCreateRequest,
  type IItemCreateRequest,
} from "~/types/api-contracts";

export const useVaultStore = defineStore("vault", () => {
  // List of all vaults for the sidebar
  const vaults = ref<ISimpleVault[]>([]);
  // The currently active, fully-loaded vault
  const currentVault = ref<IDetailedVault | null>(null);
  // Pending shares for the user
  const pendingShares = ref<IVaultShare[]>([]);

  const isLoading = ref(false);

  /**
   * Fetch all vaults the user has access to.
   */
  async function fetchAllVaults() {
    isLoading.value = true;
    const { data } = await useApi<ISimpleVault[]>("/vaults/", {
      method: "GET",
    });
    if (data.value) {
      vaults.value = data.value;
    }
    isLoading.value = false;
  }

  /**
   * Fetch the full details of a single vault (items, shares).
   */
  async function fetchVaultDetails(vaultId: string) {
    isLoading.value = true;
    const { data } = await useApi<IDetailedVault>(`/vaults/${vaultId}`, {
      method: "GET",
    });
    if (data.value) {
      currentVault.value = data.value;
    }
    isLoading.value = false;
  }

  /**
   * Create a new vault.
   */
  async function createVault(payload: IVaultCreateRequest) {
    const { error } = await useApi("/vaults/", {
      method: "POST",
      body: payload,
    });
    if (!error.value) {
      await fetchAllVaults(); // Refresh the list
    }
  }

  /**
   * Update a vault's name or description.
   */
  async function updateVault(vaultId: string, payload: IVaultUpdateRequest) {
    const { error } = await useApi(`/vaults/${vaultId}`, {
      method: "PUT",
      body: payload,
    });
    if (!error.value) {
      // Refresh both the list and the current vault if it's the one being edited
      await fetchAllVaults();
      if (currentVault.value && currentVault.value.id === vaultId) {
        await fetchVaultDetails(vaultId);
      }
    }
  }

  /**
   * Delete a vault.
   */
  async function deleteVault(vaultId: string) {
    const { error } = await useApi(`/vaults/${vaultId}`, {
      method: "DELETE",
    });
    if (!error.value) {
      if (currentVault.value && currentVault.value.id === vaultId) {
        currentVault.value = null;
      }
      await fetchAllVaults();
    }
  }

  // --- Vault Sharing Actions ---

  async function fetchPendingShares() {
    const { data } = await useApi<IVaultShare[]>("/vaults/shares/pending", {
      method: "GET",
    });
    if (data.value) {
      pendingShares.value = data.value;
    }
  }

  async function respondToShare(
    shareId: string,
    payload: IShareResponseRequest
  ) {
    const { error } = await useApi(`/vaults/shares/${shareId}/respond`, {
      method: "PUT",
      body: payload,
    });
    if (!error.value) {
      await fetchPendingShares();
      await fetchAllVaults(); // Refresh list as you may have a new vault
    }
  }

  async function inviteToVault(
    vaultId: string,
    payload: IVaultShareCreateRequest
  ) {
    const { error } = await useApi(`/vaults/${vaultId}/shares`, {
      method: "POST",
      body: payload,
    });
    if (!error.value && currentVault.value?.id === vaultId) {
      await fetchVaultDetails(vaultId); // Refresh shares list
    }
  }

  // --- Vault Item Actions ---

  async function createItem(vaultId: string, payload: IItemCreateRequest) {
    const { error } = await useApi(`/items/by-vault/${vaultId}`, {
      method: "POST",
      body: payload,
    });
    if (!error.value && currentVault.value?.id === vaultId) {
      await fetchVaultDetails(vaultId); // Refresh items list
    }
  }

  async function deleteItem(itemId: string) {
    const { error } = await useApi(`/items/${itemId}`, {
      method: "DELETE",
    });
    if (!error.value && currentVault.value) {
      await fetchVaultDetails(currentVault.value.id); // Refresh items list
    }
  }

  return {
    vaults,
    currentVault,
    pendingShares,
    isLoading,
    fetchAllVaults,
    fetchVaultDetails,
    createVault,
    updateVault,
    deleteVault,
    fetchPendingShares,
    respondToShare,
    inviteToVault,
    createItem,
    deleteItem,
  };
});
