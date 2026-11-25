import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
export default defineConfig({
  define: { __HAS_SOURCE_ZIP__: JSON.stringify(existsSync('public/ABYSS-PC.zip')) },
  optimizeDeps: { include: ['firebase/app', 'firebase/auth', 'firebase/firestore'] },
});
