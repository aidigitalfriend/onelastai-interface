import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Increase warning limit slightly for main chunk
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            // Manual chunk splitting for optimal loading
            manualChunks: (id) => {
              // Only split large vendor dependencies
              if (id.includes('node_modules')) {
                // Monaco Editor (largest dependency)
                if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
                  return 'vendor-monaco';
                }
                // Terminal libraries
                if (id.includes('@xterm') || id.includes('xterm')) {
                  return 'vendor-terminal';
                }
                // Socket.io for real-time features
                if (id.includes('socket.io')) {
                  return 'vendor-socket';
                }
                // Markdown and related libs together to avoid circular deps
                if (id.includes('react-markdown') || id.includes('remark') || id.includes('unified') || 
                    id.includes('mdast') || id.includes('hast') || id.includes('micromark') ||
                    id.includes('property-information') || id.includes('space-separated-tokens') ||
                    id.includes('comma-separated-tokens') || id.includes('vfile') || id.includes('unist')) {
                  return 'vendor-markdown';
                }
              }
              
              return undefined;
            },
          },
        },
        // Enable source maps for production debugging
        sourcemap: false,
        // Minification settings
        minify: 'esbuild',
        target: 'es2020',
      },
      // Optimize dependencies
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'zustand',
          '@monaco-editor/react',
          '@xterm/xterm',
          'socket.io-client',
        ],
        exclude: [],
      },
    };
});
