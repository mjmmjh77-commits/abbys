import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const showcase = mode === 'showcase';
  return {
    publicDir: showcase ? false : 'public',
    build: { outDir: showcase ? 'dist-showcase' : 'dist' },
    define: {
      __HAS_SOURCE_ZIP__: JSON.stringify(!showcase && existsSync('public/ABYSS-PC.zip')),
    },
    optimizeDeps: { include: ['firebase/app', 'firebase/auth', 'firebase/firestore'] },
  };
});
