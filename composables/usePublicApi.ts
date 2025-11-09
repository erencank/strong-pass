import type { UseFetchOptions } from "#app";
import { defu } from "defu";

// This is the complex type that useFetch expects for its options object.
type FetchOptions<T> = UseFetchOptions<T extends void ? unknown : T>;

// This is the *actual* type `useFetch` wants for its options argument.
type StrictFetchOptions<T> = UseFetchOptions<
  T extends void ? unknown : T, // DataT
  T extends void ? unknown : T, // ErrorT
  any, // KeysOf<DataT>
  T extends void ? unknown : T, // DefaultT
  string, // RequestT (was NitroFetchRequest) <-- FIX
  T extends void ? "get" : any // Method
>;

export function usePublicApi<T = void>(
  url: string,
  options: FetchOptions<T> = {}
) {
  const config = useRuntimeConfig();

  const defaults = {
    baseURL: config.public.apiBaseUrl,
    // Note: No authorization headers needed here
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
