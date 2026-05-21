import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		tailwindcss(),
		react(),
	],
	server: {
		port: 5173,
		proxy: {
			"/api/v1": {
				target: "http://localhost:8200",
				changeOrigin: true,
			},
			"/socket.io": {
				target: "http://localhost:8200",
				changeOrigin: true,
				ws: true,
			},
		},
	},
});
