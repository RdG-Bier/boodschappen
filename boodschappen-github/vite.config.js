import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",          // relatieve paden: werkt op github.io/reponaam/ en op een eigen domein
  plugins: [react()],
  build: { outDir: "dist" },
});
