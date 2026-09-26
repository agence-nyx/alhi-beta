import { defineConfig } from "astro/config";

// Deploiement en tant que "project page" GitHub Pages :
// https://agence-nyx.github.io/alhi-beta/
// -> necessite un `base` correspondant au nom du repo.
export default defineConfig({
  site: "https://agence-nyx.github.io",
  base: "/alhi-beta",
});
