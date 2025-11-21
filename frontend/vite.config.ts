import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
    // Set production environment variables
    'import.meta.env.VITE_BACKEND_URL': '"https://inspiranet-backend.onrender.com"',
    'import.meta.env.VITE_FRONTEND_URL': '"https://inspiranet.onrender.com"',
    'import.meta.env.VITE_SOCKET_URL': '"https://inspiranet-backend.onrender.com"',
    'import.meta.env.VITE_MEETING_URL': '"https://inspiranet-backend.onrender.com"',
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
}));
