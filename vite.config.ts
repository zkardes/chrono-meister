import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Improved Safari localhost compatibility
    host: '0.0.0.0', // Listen on all addresses (0.0.0.0) instead of IPv6 (::)
    port: 8080,
    allowedHosts: ['afbca1095052.ngrok-free.app'],
    // Enhanced HMR configuration for Safari
    hmr: {
      // Use polling for Safari compatibility
      usePolling: true,
      // WebSocket configuration for better Safari support
      clientPort: 8080,
      // Allow connections from both localhost and IP
      host: 'afbca1095052.ngrok-free.app'
    },
    // Additional Safari-friendly options
    cors: true,
    // Force IPv4 for better Safari compatibility
    strictPort: false,
    // Warm up common dependencies
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx']
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Enhanced build configuration for Safari compatibility
  build: {
    // Better source maps for debugging
    sourcemap: mode === 'development',
    // Optimize for Safari
    target: ['es2020', 'safari13']
  },
  // Optimized dependency handling
  optimizeDeps: {
    // Include common dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    // Force re-bundling on config changes
    force: mode === 'development'
  }
}));
