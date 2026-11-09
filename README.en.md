# tuoyu-cloud-frontend

English | [简体中文](README.md)

The admin frontend of tuoyu-cloud. tuoyu-cloud is a general-purpose Java microservice framework: one codebase runs as a monolith or as microservices, it is secure by default, and it is fully open source under the MIT license.

- Backend repository: [tuoyu-cloud](https://gitee.com/tuoyucode/tuoyu-cloud)
- Stack: Vue 3, TypeScript, Vite, [Vben Admin 5](https://github.com/vbenjs/vue-vben-admin) (framework layer), Ant Design Vue

## Requirements

- Node.js `^22.18.0` or `^24.12.0`
- pnpm `11` or later

## Getting started

```bash
pnpm install
pnpm dev:antd
```

The dev server runs at `http://localhost:5666` and proxies `/api` to the local backend gateway at `http://localhost:8081` (see `apps/web-antd/vite.config.ts`). Start the gateway, auth, system and resource services first, as described in the backend repository.

## Commands

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `pnpm dev:antd`   | Start the dev server                           |
| `pnpm build:antd` | Build for production into `apps/web-antd/dist` |
| `pnpm lint`       | Lint                                           |
| `pnpm check:type` | Type check                                     |
| `pnpm test:unit`  | Unit tests (Vitest)                            |

## Layout

| Directory | Contents |
| --- | --- |
| `apps/web-antd` | The admin app: pages, routes, API calls, theme |
| `packages` | Framework layer: layouts, access control, components, preferences, utilities |
| `internal` | Build and lint configuration |
| `scripts` | Tooling scripts and deployment files |

## API encryption

Login, password changes and similar endpoints use the backend's API encryption protocol. The frontend stores no keys; it fetches the public key from the backend at runtime. The backend's `ApiCryptoCodec` and its test vectors define the protocol.

## Contributing

Development conventions (layout and naming, page templates, request layer, checks and commit messages) are described in [CONTRIBUTING.md](CONTRIBUTING.md) (in Chinese).

## License

[MIT](LICENSE). Third-party code included in this project and its licenses are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
