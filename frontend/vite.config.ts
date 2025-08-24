import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-deployment-files',
      closeBundle: async () => {
        const filesToCopy = [
          '_redirects',
          '_headers',
          '404.html',
          'vercel.json',
          'render.yaml',
          'netlify.toml',
          'static.json',
          'render.json',
          'web.config'
        ];
        
        for (const file of filesToCopy) {
          try {
            // Try copying from public directory first
            if (fs.existsSync(`public/${file}`)) {
              fs.copyFileSync(`public/${file}`, `dist/${file}`);
              console.log(`✅ Copied ${file} to dist/`);
            } else if (fs.existsSync(file)) {
              // Fallback: try copying from root directory
              fs.copyFileSync(file, `dist/${file}`);
              console.log(`✅ Copied ${file} to dist/ (from root)`);
            }
          } catch (error: any) {
            console.log(`⚠️ Could not copy ${file}: ${error.message}`);
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          utils: ['axios', 'socket.io-client', 'date-fns']
        }
      }
    },
    // Use default minifier instead of terser
    minify: 'esbuild',
    sourcemap: false,
    // Reduce bundle size
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 8083,
    host: "::",
    // Enable CORS for development
    cors: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client'
    ]
  }
})
