import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { copy } from 'fs-extra'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-config-files',
      closeBundle: async () => {
        // Copy critical configuration files to dist folder
        const filesToCopy = [
          '_redirects',
          '_headers',
          '404.html',
          'vercel.json',
          'render.yaml',
          'netlify.toml'
        ]
        
        for (const file of filesToCopy) {
          try {
            await copy(`public/${file}`, `dist/${file}`)
            console.log(`✅ Copied ${file} to dist folder`)
          } catch (error) {
            try {
              // Fallback: try copying from root directory
              await copy(file, `dist/${file}`)
              console.log(`✅ Copied ${file} to dist folder (fallback)`)
            } catch (fallbackError: any) {
              console.warn(`⚠️ Could not copy ${file}:`, fallbackError.message)
            }
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
        }
      }
    }
  },
  server: {
    port: 8083,
    host: "::"
  }
})
