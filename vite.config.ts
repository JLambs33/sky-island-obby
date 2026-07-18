import { defineConfig } from "vite";

// Relative base keeps the build working under any static-hosting path and from
// a home-screen bookmark without hardcoding a repo name.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
