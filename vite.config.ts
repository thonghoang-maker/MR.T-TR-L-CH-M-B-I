import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: '/',
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      // Tăng giới hạn cảnh báo lên 1000kb (1MB) để tránh cảnh báo không cần thiết
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Chia nhỏ các thư viện lớn thành các file riêng biệt
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-genai': ['@google/genai'],
            'vendor-ui': ['lucide-react']
          }
        }
      }
    }
  }
})