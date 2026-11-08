import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      hmr:
        process.env.NODE_ENV === "production" ||
        process.env.DISABLE_HMR === "true" ||
        process.env.DISABLE_HMR === "1"
          ? false
          : {
              protocol: process.env.HMR_PROTOCOL || "ws",
              clientPort: process.env.HMR_CLIENT_PORT
                ? parseInt(process.env.HMR_CLIENT_PORT, 10)
                : undefined,
            },
      watch:
        process.env.DISABLE_HMR === "true" || process.env.DISABLE_HMR === "1"
          ? null
          : {},
    },
  };
});
