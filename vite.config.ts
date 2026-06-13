import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Sia SDK ships as WebAssembly. Per the SDK README, excluding it from the
// dev dep pre-bundler lets its `import.meta.url`-relative .wasm path resolve
// correctly (otherwise the dev server returns index.html for the .wasm request
// and WebAssembly.instantiate fails with a "magic word" error).
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@siafoundation/sia-storage'],
  },
})
