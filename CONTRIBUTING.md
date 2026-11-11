# 参与贡献

tuoyu-cloud-frontend 是 tuoyu-cloud 的管理端前端。tuoyu-cloud 是一个通用的 Java 微服务框架，同一套代码既能按微服务部署，也能按单体部署，不面向任何具体业务。项目采用 MIT 协议。

本文写的是在这个仓库里写代码时需要遵守的约定。接口契约（Controller、VO、BO、返回格式）以后端仓库 [tuoyu-cloud](https://gitee.com/tuoyucode/tuoyu-cloud) 的代码为准。

仓库同时托管在 Gitee 与 GitHub，两边提交历史一致，CI（GitHub Actions）在 GitHub 上运行。

## 技术选型

- 框架层使用官方 [Vben Admin 5](https://github.com/vbenjs/vue-vben-admin)（MIT），只使用 Vben 的布局、权限、路由、主题和组件封装。UI 库有 Element Plus 与 Ant Design Vue 两个版本，共用同一个共享包；Element Plus 版正在迁移页面。
- Vben 的代码按原样导入（提交说明里记录上游 commit），之后再改名、精简。导入提交和改名提交不要混在一起。

## 应用与共享包

- `apps/web-ele`：Element Plus 版的应用；`apps/web-antd`：Ant Design Vue 版的应用。各自放页面（`views`）、布局、组件适配（`adapter`）、store。同一个页面在两个应用中的目录、文件名与 `data.ts` 的结构保持一致，只有组件写法不同。
- `packages/shared`（`@tuoyu/shared`）：与 UI 组件库无关的代码，包括请求层与各模块的接口（`api/`）、工具函数（`utils/`）、后端菜单转换（`router/`）和页面文案（`locales/`）。引用写完整的子路径，例如 `@tuoyu/shared/api/system/post`。
- 共享包不能引用 UI 组件库、Vben 的界面包（`@vben/common-ui`、`@vben/layouts`、`@vben/plugins`）和应用的 `#/` 别名，测试会检查。需要界面配合的地方由应用注入。

## 必须遵守的规则

1. 业务页面全部自己编写，不使用其他框架生态的前端代码（页面、接口定义、工具函数和样式）。参考设计可以，复制代码不行。
2. 协议合规：Vben 的 MIT 版权声明登记在 `THIRD-PARTY-NOTICES.md`，不要删改；第三方文件头保持原样。
3. 默认安全：
   - 仓库里不放明文密钥和口令，不新增默认口令；
   - 前端不保存任何私钥，公钥运行时从后端获取；
   - 环境变量文件里只放地址这类非敏感项，本地的敏感值写在不提交的 `.env.*.local` 中。
4. 依赖协议：新增依赖前先确认协议，不引入 GPL、AGPL、LGPL 协议的依赖。
5. 不跳过类型检查、lint 和测试。
6. 框架与业务分开：`dev` / `master` 只放框架；业务页面只放在 `business` 分支，框架的改动先进 `dev`，再合并到 `business`，不反向合并。详见下一节，CI 会检查。

## 分支

与后端仓库相同，框架与基于它构建的业务系统放在两条分支上：

| 分支 | 内容 | 用途 |
| --- | --- | --- |
| `master` | 框架 | 发布版本 |
| `dev` | 框架 | 日常开发，合并到 `master` 后发布 |
| `business` | `dev` 的全部内容加上业务页面 | 业务系统（目前是制造执行 MES）的开发 |

- 框架的改动（共享包、请求层、布局与组件适配、框架自带的页面、文档与 CI）从 `dev` 开分支、合回 `dev`；业务的改动从 `business` 开分支、合回 `business`。
- 只能由 `dev` 合并到 `business`（`git merge dev`），不要把 `business` 合并、也不要把其中的提交挑到 `dev` / `master`。一次改动两边都涉及时，拆成两个提交，先在 `dev` 提交框架部分。
- 业务页面、接口与文案的目录，以及接入业务模块必须改动的框架文件，登记在 `scripts/ci/business-scope.txt` 中。新增业务模块时，先在 `dev` 上登记它的目录。
- CI 执行 `scripts/ci/check_branch_scope.py` 检查，提交前可以在本地执行 `python scripts/ci/check_branch_scope.py <当前分支>`。

## 开发环境与检查

- Node `^22.18.0 || ^24.12.0`，pnpm `>= 11`（以 `package.json` 中的 `engines` 和 `packageManager` 为准）。
- 常用命令：`pnpm install`、`pnpm dev:ele`（端口 5777）、`pnpm dev:antd`（端口 5666）、`pnpm build:ele`、`pnpm build:antd`、`pnpm lint`、`pnpm test:unit`、`pnpm test:e2e`。
- 提交前 lefthook 会自动运行格式化、eslint、stylelint、类型检查和 oxlint，不通过就提交不了。请不要用 `--no-verify` 跳过。
- 本地检查与 CI 保持一致：`pnpm run lint`、`pnpm -F @tuoyu/shared run typecheck`、`pnpm -F @vben/web-antd run typecheck`、`pnpm -F @vben/web-ele run typecheck`、`pnpm run test:unit`、`pnpm run build:antd`、`pnpm run build:ele`。
- 端到端测试（Playwright，`apps/web-antd/e2e`）需要真实的后端，账号口令只从环境变量 `E2E_USERNAME`、`E2E_PASSWORD` 读取，不写进仓库。

## 提交说明

格式为 `类型: 中文描述`，类型取 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`build`、`ci`、`style`。描述后空一行，再写正文，说明做了什么、为什么。

## 品牌与设计

- 名称：字标一律小写 `tuoyu`，“cloud”用次要色，空间不够时省略。
- 主题写在各应用的 `src/preferences.ts`（`apps/web-ele`、`apps/web-antd` 两份取值相同），部署方改品牌色只需要改这里：

  | 项 | 值 |
  | --- | --- |
  | `theme.colorPrimary` | `hsl(228 64% 46%)`（靛蓝；暗色模式约 `hsl(226 85% 70%)`） |
  | `theme.colorSuccess` | `hsl(131 54% 40%)` |
  | `theme.colorWarning` | `hsl(37 87% 41%)` |
  | `theme.colorDestructive` | `hsl(357 69% 53%)` |
  | `theme.radius` | `'0.375'`（6px） |
  | `theme.fontSize` | `16` |
  | `theme.semiDarkSidebar` | `false` |
  | `theme.mode` | `'auto'`，浅色和暗色都必须可用 |

- 主色只用于可点击元素和选中状态，语义色只表达状态，不做装饰。部署方决定的配置放进 `lockedPreferences`。
- 页面只用 4 种标准形式：列表、右侧抽屉表单、树表、详情。
- 文案：按钮写清楚会发生什么（“删除岗位”，而不是“确定”）；结果提示简短（“已保存”）；错误说明原因；登录失败一律提示“账号或密码错误”；所有文案走 i18n，`zh-CN` 和 `en-US` 同步提供。

## 请求层

- 请求层在 `packages/shared/src/api/request.ts`。后端统一返回 `ApiResult`（`code` / `message` / `data` / `traceId`），请求层返回 `data`；分页接口的 `data` 为 `{ items, total }`。
- 失败时由 HTTP 状态码表达错误类别，请求层统一提示；页面需要展示失败原因时用 `utils/api-result.ts` 的 `errorMessageOf`，不要自己读响应体。
- 分页参数为 `page`（从 1 开始）、`pageSize`、`sort`（`属性名,asc|desc`，可重复）。
- 后端标注了 `@ApiEncrypt` 的接口用 `postEncrypted()` / `putEncrypted()` 调用，不要自己拼加密信封。

## 页面模板

新页面以岗位管理 `views/system/post/` 为准编写，后端代码生成器默认生成的就是这种风格的代码。

- 目录：`views/<模块>/<业务>/index.vue`（列表页）、`data.ts`（查询条件、表格列、表单字段）、`<业务>-drawer.vue`（新增与编辑抽屉）。
- 接口：`packages/shared/src/api/<模块>/<业务>.ts`，类型放在同名 `namespace` 中，函数名为 `list*`、`get*`、`add*`、`update*`、`remove*`、`export*`。
- 按钮级权限用 `hasPermission('system:post:add')`，权限码与后端 `@SaCheckPermission` 一致。
- 字典用 `getDictOptions(DictType.xxx)`，字典类型一律从 `DictType` 常量引用。
- 文案：每个页面一个文案文件 `packages/shared/src/locales/langs/<语言>/<模块>/<业务>.json`，中英文同步（测试会检查两种语言的文件与键是否一致）。
- 后端的 Long 型 ID 一律按字符串处理。
- 后端菜单的 `component` 填 `views` 下的相对路径（不带 `.vue`），图标只接受 Iconify 名称（如 `lucide:user`）。

代码生成器下载的 zip 中，`vben/` 目录与本仓库的根目录一一对应，直接复制即可：接口与文案在共享包，页面在生成配置中所选版本的应用（`apps/web-ele` 或 `apps/web-antd`，新导入的表默认 Element Plus 版）。

流程的业务详情：流程定义的表单路径填 `views` 下业务详情组件的路径（规则与菜单的 `component` 相同），组件接收 `businessId`（字符串）与 `instanceId` 两个 props，在办理与查看流程的抽屉中以“业务详情”页签显示。

## 修改 Vben 自带的文件

尽量在应用（`apps/web-ele`、`apps/web-antd`）中解决。必须改 `packages/` 下的 Vben 文件时，在改动处加以 `tuoyu：` 开头的注释，并登记在下面，升级 Vben 时逐条保留：

- `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`：表格标题与左侧按钮之间留 16px（标题加 `mr-4`），按钮之间仍为 8px。
- `packages/effects/common-ui/src/ui/authentication/login.vue`：登录按钮去掉 Vben 的 `aria-label="login"`，无障碍名称取可见文字“登录”。
