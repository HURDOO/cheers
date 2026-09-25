import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    {
      name: 'public-analytics',
      transformIndexHtml() {
        return [
          { tag: 'script', attrs: { src: '/analytics-config.js', defer: true }, injectTo: 'head' },
          { tag: 'script', attrs: { src: '/analytics.js', defer: true }, injectTo: 'head' },
        ]
      },
    },
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    rollupOptions: {
      input: {
        archive: path.resolve(__dirname, 'index.html'),
        'gilgeonneo-friends': path.resolve(__dirname, 'events/gilgeonneo-friends/index.html'),
        'korea-yonsei-games-2026': path.resolve(__dirname, 'events/korea-yonsei-games-2026/index.html'),
        'korea-yonsei-games-2026-alt': path.resolve(__dirname, 'events/korea-yonsei-games-2026-alt/index.html'),
        'korea-yonsei-games-2026-c': path.resolve(__dirname, 'events/korea-yonsei-games-2026-c/index.html'),
        'korea-yonsei-games-2026-d': path.resolve(__dirname, 'events/korea-yonsei-games-2026-d/index.html'),
        'korea-yonsei-games-2026-e': path.resolve(__dirname, 'events/korea-yonsei-games-2026-e/index.html'),
        'skku-eskara-cheer-ot': path.resolve(__dirname, 'events/skku-eskara-cheer-ot/index.html'),
        'yongin-university-games': path.resolve(__dirname, 'events/yongin-university-games/index.html'),
        'yongin-university-games-legacy': path.resolve(__dirname, 'events/yongin-university-games-legacy/index.html'),
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
