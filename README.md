# tuoyu-cloud-frontend

[English](README.en.md) | 简体中文

tuoyu-cloud 的管理端前端。tuoyu-cloud 是通用的 Java 微服务框架，同一套代码同时支持单体部署和微服务部署，默认安全，MIT 协议完全开源。

- 后端仓库：[tuoyu-cloud](https://gitee.com/tuoyucode/tuoyu-cloud)
- 技术栈：Vue 3、TypeScript、Vite、[Vben Admin 5](https://github.com/vbenjs/vue-vben-admin)（框架层）、Ant Design Vue

## 环境要求

- Node.js `^22.18.0` 或 `^24.12.0`
- pnpm `11` 及以上

## 快速开始

```bash
pnpm install
pnpm dev:antd
```

开发服务器默认在 `http://localhost:5666`，`/api` 请求代理到本地后端网关 `http://localhost:8081`（见 `apps/web-antd/vite.config.ts`）。请先按后端仓库的说明启动网关、认证、系统、资源四个核心服务。

## 常用命令

| 命令              | 说明                                    |
| ----------------- | --------------------------------------- |
| `pnpm dev:antd`   | 启动开发服务器                          |
| `pnpm build:antd` | 构建生产包，输出到 `apps/web-antd/dist` |
| `pnpm lint`       | 代码检查                                |
| `pnpm check:type` | 类型检查                                |
| `pnpm test:unit`  | 单元测试（Vitest）                      |

## 目录结构

| 目录 | 说明 |
| --- | --- |
| `apps/web-antd` | 管理端应用（Ant Design Vue）：页面、布局、组件适配、主题配置、页面文案 |
| `packages/shared` | 共享包 `@tuoyu/shared`：请求层、各模块的接口与类型、与 UI 组件库无关的工具 |
| `packages` 下的其他目录 | Vben 框架层：布局、权限、组件、偏好设置、工具 |
| `internal` | 构建与 lint 配置 |
| `scripts` | 工程脚本与部署文件 |

## 部署

生产包（`pnpm build:antd`）的接口请求前缀为 `/api`（`apps/web-antd/.env.production` 的 `VITE_GLOB_API_URL`），需要由反向代理去掉前缀后转发给后端网关：

- 后端仓库 `deploy/docker` 的 compose 中带有 Nginx（`nginx` profile），把生产包放进 `deploy/docker/nginx/html` 即可；
- 也可以用本仓库的镜像：`pnpm build:docker` 构建 `tuoyu-cloud-frontend` 镜像，其中的 Nginx 把 `/api` 转发到 `tuoyu-gateway:8081`，运行时加入后端 compose 的网络（`--network tuoyu_default`），网关地址不同时修改 `scripts/deploy/nginx.conf`。

## 接口加密

登录、修改密码等接口按后端的接口加密协议传输，前端不保存任何密钥，公钥运行时从后端获取。协议以后端仓库的 `ApiCryptoCodec` 与测试向量为准。

HTTPS 或 localhost 下使用浏览器的 WebCrypto。其他非 HTTPS 访问时浏览器不提供 WebCrypto：后端设置了 `TUOYU_API_CRYPTO_REQUIRE_HTTPS=false` 时，前端按需加载纯 JavaScript 实现（只能防止被动窃听）；否则提示配置 HTTPS。

## 参与贡献

开发约定（应用与共享包、页面模板、请求层、检查与提交规范）见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 协议

[MIT](LICENSE)。本项目包含的第三方代码及其协议见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。
