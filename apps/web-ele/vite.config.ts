import process from 'node:process';

import { defineConfig, viteCssLayerPlugin } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        // element-plus 的 css 包进 @layer el，使 Tailwind 工具类可覆盖组件样式
        viteCssLayerPlugin({ layerName: 'el', packageName: 'element-plus' }),
        ElementPlus({ format: 'esm' }),
      ],
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
