import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Get ngrok URL from environment variable if available
  const ngrokUrl = process.env.NGROK_URL;
  const ngrokHost = ngrokUrl ? new URL(ngrokUrl).hostname : null;
  
  if (ngrokHost) {
    console.log('🌐 Using ngrok host:', ngrokHost);
  } else {
    console.log('🏠 Using localhost development');
  }
  
  return {
  server: {
    // Improved Safari localhost compatibility
    host: '0.0.0.0', // Listen on all addresses (0.0.0.0) instead of IPv6 (::)
    port: 8080,
    // Allow ngrok hosts and localhost - more permissive approach
    allowedHosts: ngrokHost 
      ? [ngrokHost, 'localhost', '127.0.0.1'] 
      : ['localhost', '127.0.0.1', '.ngrok.io', '.ngrok-free.app', '.ngrok.app'],
    // Enhanced HMR configuration for Safari
    hmr: {
      // Use polling for Safari compatibility
      usePolling: true,
      // WebSocket configuration for better Safari support
      clientPort: 8080,
      // Use ngrok host if available, otherwise default to localhost
      host: ngrokHost || 'localhost'
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
  plugins: [react()],
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
  };
});
