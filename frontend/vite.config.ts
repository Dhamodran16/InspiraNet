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
    'import.meta.env.VITE_BACKEND_URL': mode === 'production' 
      ? '"https://inspiranet-backend.onrender.com"' 
      : '"http://localhost:5000"',
    'import.meta.env.VITE_FRONTEND_URL': mode === 'production' 
      ? '"https://inspiranet.onrender.com"' 
      : '"http://localhost:8083"',
    'import.meta.env.VITE_SOCKET_URL': mode === 'production' 
      ? '"https://inspiranet-backend.onrender.com"' 
      : '"http://localhost:5000"',
    'import.meta.env.VITE_MEETING_URL': mode === 'production' 
      ? '"https://inspiranet-backend.onrender.com"' 
      : '"http://localhost:5000"',
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
