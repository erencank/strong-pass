import { defineNuxtConfig } from "nuxt/config";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
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
      apiBaseUrl: "/api",
    },
  },

  routeRules: {
    // 3. Configure the Proxy
    // Any request to '/api/**' is forwarded to the 'backendUrl'
    "/api/**": {
      proxy: `${backendUrl}/**`,
    },
  },

  ssr: false,
  css: ["~/assets/css/tailwind.css"],

  ignore: ["**/src-tauri/**"],
  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxtjs/color-mode",
    "@pinia/nuxt",
    "shadcn-nuxt",
  ],
  colorMode: {
    classSuffix: "",
  },

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

  components: [{ path: "~/components/own" }, "~/components"],
});
