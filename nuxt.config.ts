import { defineNuxtConfig } from "nuxt/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  devServer: {
    host: "0",
  },

  runtimeConfig: {
    public: {
      // This URL will be available on the client and server.
      apiBaseUrl: "http://test:8000",
    },
  },

  ssr: false,
  css: ["~/assets/css/tailwind.css"],

  ignore: ["**/src-tauri/**"],
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "shadcn-nuxt"],

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./components/ui",
  },
  vite: {
    plugins: [
      nodePolyfills({
        // Only polyfill what we need for fast-srp-hap
        include: ["buffer", "process", "crypto", "util", "stream"],
        globals: {
          Buffer: true,
          process: true,
        },
      }),
    ],
  },
});
