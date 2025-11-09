import { defineNuxtConfig } from "nuxt/config";

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
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
});
