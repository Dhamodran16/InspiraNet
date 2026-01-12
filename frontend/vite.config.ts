import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000';
  const frontendUrl = env.VITE_FRONTEND_URL || 'http://localhost:8083';
  const socketUrl = env.VITE_SOCKET_URL || backendUrl;
  const meetingUrl = env.VITE_MEETING_URL || backendUrl;

  return {
    server: {
      host: "::",
      port: 8083,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Make env variables available with local-safe defaults
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl),
      'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(frontendUrl),
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(socketUrl),
      'import.meta.env.VITE_MEETING_URL': JSON.stringify(meetingUrl),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          },
        },
      },
    },
  };
});
