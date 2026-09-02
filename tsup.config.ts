import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/receipt/index.ts",
    "src/pos/index.ts",
    "src/report/index.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // Aucune dependance d'execution : le paquet ne porte que des regles.
  external: [],
});
