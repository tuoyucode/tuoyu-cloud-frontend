import process from 'node:process';

import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // 本地后端网关地址（端口见后端 tuoyu-gateway 的 server.port）；
            // 端到端测试等场景可用环境变量 VITE_DEV_PROXY_TARGET 指定其他地址
            target:
              process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8081',
            ws: true,
          },
        },
      },
    },
  };
});
