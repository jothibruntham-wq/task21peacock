import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js + react-three-fiber are large, so raise the warning threshold (in kB)
    chunkSizeWarningLimit: 1500,
  },
  base: "/task21peacock/",
});