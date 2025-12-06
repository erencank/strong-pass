import { useAuthStore } from "~/stores/auth";
import type { UseFetchOptions } from "#app";
import { defu } from "defu";

// This is the complex type that useFetch expects for its options object.
type FetchOptions<T> = UseFetchOptions<T extends void ? unknown : T>;

// This is the *actual* type `useFetch` wants for its options argument.
// We derive this from the error message itself.
type StrictFetchOptions<T> = UseFetchOptions<
  T extends void ? unknown : T, // DataT
  T extends void ? unknown : T, // ErrorT
  any, // KeysOf<DataT>
  T extends void ? unknown : T, // DefaultT
  string, // RequestT (was NitroFetchRequest) <-- FIX
  T extends void ? "get" : any // Method
>;

export function useApi<T = void>(
  url: string,
  options: FetchOptions<T> & { skipAuthError?: boolean } = {}
) {
  const authStore = useAuthStore();
  const config = useRuntimeConfig();

  const defaults = {
    baseURL: config.public.apiBaseUrl,

    onRequest({ options }: { options: any }) {
      const headers = new Headers(options.headers);
      if (authStore.token) {
        headers.set("Authorization", `Bearer ${authStore.token}`);
      }
      options.headers = headers;
    },

    onResponseError({ response }: { response: any }) {
      if (options.skipAuthError) return; // Allow caller to handle 401 manually

      if (response.status === 401 || response.status === 403) {
        authStore.logout();
      }
    },
  };

  const mergedOptions = defu(
    defaults, // Base defaults
    options // User options (override defaults)
  );

  return useFetch<T>(
    url,
    mergedOptions as StrictFetchOptions<T> // <-- The explicit cast
  );
}
