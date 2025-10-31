import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const API_KEY = 'sk-kyddpjpruhztgknyfrrggbfhttprgxgnvibotikwrvmpqgjq'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/voice': {
        target: 'https://api.siliconflow.cn', // 注意这里不要加 /v1/
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/voice/, '/v1/uploads/audio/voice'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Authorization', `Bearer ${API_KEY}`)
          })
        },
      },
    },
  },
})
