# 参与贡献

tuoyu-cloud-frontend 是 tuoyu-cloud 的管理端前端。tuoyu-cloud 是一个通用的 Java 微服务框架，同一套代码既能按微服务部署，也能按单体部署，不面向任何具体业务。项目采用 MIT 协议。

本文写的是在这个仓库里写代码时需要遵守的约定。接口契约（Controller、VO、BO、返回格式）以后端仓库 [tuoyu-cloud](https://gitee.com/tuoyucode/tuoyu-cloud) 的代码为准；后端的设计决定记录在它的 `docs/adr/` 下。

仓库同时托管在 Gitee 与 GitHub，两边提交历史一致，CI（GitHub Actions）在 GitHub 上运行。

## 技术选型

- 框架层使用官方 [Vben Admin 5](https://github.com/vbenjs/vue-vben-admin)（MIT），UI 库为 Ant Design Vue。只使用 Vben 的布局、权限、路由、主题和组件封装，1.0 只支持 Ant Design Vue 一种 UI 库。
- Vben 的代码按原样导入（提交说明里记录上游 commit），之后再改名、精简。导入提交和改名提交不要混在一起。

## 必须遵守的规则

1. 业务页面全部自己编写，不使用其他框架生态的前端代码（页面、接口定义、工具函数和样式）。参考设计可以，复制代码不行。
2. 协议合规：Vben 的 MIT 版权声明登记在 `THIRD-PARTY-NOTICES.md`，不要删改；第三方文件头保持原样。
3. 默认安全：
   - 仓库里不放明文密钥和口令，不新增默认口令；
   - 前端不保存任何私钥，接口加密见下文“接口加密”；
   - 环境变量文件里只放地址这类非敏感项，本地的敏感值写在不提交的 `.env.*.local` 中。
4. 依赖协议：新增依赖前先确认协议，不引入 GPL、AGPL、LGPL 协议的依赖。
5. 不跳过类型检查、lint 和测试。

## 开发环境与检查

- Node `^22.18.0 || ^24.12.0`，pnpm `>= 11`（以 `package.json` 中的 `engines` 和 `packageManager` 为准）。
- 常用命令：`pnpm install`、`pnpm dev:antd`、`pnpm build:antd`、`pnpm lint`、`pnpm test:unit`、`pnpm test:e2e`。
- 提交前 lefthook 会自动运行 oxfmt、eslint、stylelint、类型检查和 oxlint（含 vitest 规则），不通过就提交不了。请不要用 `--no-verify` 跳过。
- 本地检查与 CI 保持一致：`pnpm run lint`（全仓）、`pnpm -F @vben/web-antd run typecheck`、`pnpm run test:unit`（全仓）、`pnpm run build:antd`。只检查 `apps/web-antd/src` 会漏掉根目录配置的问题。CI 配置在 `.github/workflows/ci.yml`，另外用 `playwright test --list` 确认端到端测试能加载。

## 提交说明

格式为 `类型: 中文描述`，类型取 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`build`、`ci`、`style`。描述后空一行，再写正文，说明做了什么、为什么。

## 品牌与设计

- 名称：字标一律小写 `tuoyu`，“cloud”用次要色，空间不够时省略。中文名待定。
- Logo：4 个圆角方块，其中一块脱离出去，寓意“同一套代码，可以单体也可以拆成微服务”。只用主色的不同透明度，不加渐变和阴影。
- 主题写在 `apps/web-antd/src/preferences.ts`：

  | 项 | 值 |
  | --- | --- |
  | `theme.colorPrimary` | `hsl(228 64% 46%)`（靛蓝，约 `#2A48C1`；暗色模式约 `hsl(226 85% 70%)`） |
  | `theme.colorSuccess` | `hsl(131 54% 40%)` |
  | `theme.colorWarning` | `hsl(37 87% 41%)` |
  | `theme.colorDestructive` | `hsl(357 69% 53%)` |
  | `theme.radius` | `'0.375'`（6px） |
  | `theme.fontSize` | `16`（根字号，Vben 默认值；菜单、正文与组件实际为 14px。改成 14 会把整个界面按比例缩小） |
  | `theme.semiDarkSidebar` | `false`：浅色侧边栏，选中项用主色的浅色背景加主色文字；暗色模式下随页面变暗 |
  | `theme.mode` | `'auto'`，浅色和暗色都必须可用 |

  选这个主色，是为了和 Ant Design、Vben 默认的亮蓝（`hsl(212 100% 45%)`）区分开，它也不是 Vben 内置的 14 种颜色之一，和成功、警告、错误三种语义色都不冲突。中性色带一点蓝色倾向，与主色同色系；主色只用于可点击元素和选中状态；语义色只表达状态，不做装饰。

- 主题切换：
  - 部署方改品牌色只需要改 `preferences.ts` 里的一处配置。管理员在“参数设置”中修改全局主色是可选功能，对所有人生效，保存前要校验它与语义色的区分度和文字对比度；
  - 最终用户可以切换浅色 / 深色 / 跟随系统，以及中英文（保留 `widget.themeToggle`、`widget.languageToggle`）；
  - 最终用户切换主色默认关闭（`app.enablePreferences: false`）。部署方可以开启，开启后只提供筛选过的预设，去掉与语义色冲突（玫红、粉、绿、黄）和对比度不足的颜色；演示站部署时可以开启偏好设置面板，方便访客体验。
- 字体：中文用系统字体（苹方、微软雅黑），不加载中文网络字体；西文和数字用 IBM Plex Sans；配置键、编号等用 JetBrains Mono。西文字体随前端打包，不依赖外部 CDN。
- 首页展示环境、部署方式（微服务时为 Nacos 中的服务状态，单体时为 `tuoyu-boot-all` 及已加载的模块）、多租户状态、版本、在线用户、今日登录与操作、安全自检摘要、最近操作。不放业务图表。
- 安全中心是“系统监控”下的正式菜单，只读，展示各服务的启动自检结果（开发模式显示“警告”，可以“以生产模式预览”）和运行时防护配置（请求与上传上限、并发、分页上限、Redis 白名单、接口加密等）。不提供在界面上关闭检查的功能。
- 多租户：关闭时界面上完全不出现租户相关内容（登录页的租户字段、顶栏租户切换、租户管理菜单），开启后自动出现。
- 页面只从下面 4 种标准模式中选，不单独设计：
  1. 列表：查询区一行最多 4 个条件，多余的折叠；工具栏左侧放新增和批量操作；每页默认 10 条，可选 10 / 20 / 50 / 100；删除在行内确认；
  2. 表单：新增和编辑用右侧抽屉，两列排布，长字段占整行；必填项标红星，错误写在字段下方；保存后关闭抽屉并提示“已保存”；
  3. 树表：默认展开第一层，提供“全部展开 / 收起”和行内“新增下级”；
  4. 详情：三列描述列表；请求参数等长内容用等宽代码块；返回和相关操作放在顶部右侧。
- 文案：
  - 按钮写清楚会发生什么（“删除岗位”，而不是“确定”）；
  - 结果提示简短（“已保存”）；
  - 错误说明原因和解决办法；
  - 登录失败一律提示“账号或密码错误”，不区分原因；
  - 用用户认识的名称（“文件存储”，而不是“OSS 配置”）；
  - 所有文案走 i18n，`zh-CN` 和 `en-US` 同步提供。

## 请求层

请求层在 `apps/web-antd/src/api/request.ts`。

- 后端统一返回 `ApiResult`（`code` / `message` / `data` / `traceId`）：成功为 HTTP 200 加 `code` 0，请求层返回 `data`；分页接口的 `data` 为 `{ items, total }`，表格适配器已经按这个结构配置好。
- 失败时 HTTP 状态码表达错误类别，响应体结构相同。请求层优先提示后端的 `message`，没有时按状态码提示（413、429 等有单独的文案）；5xx 的提示附带可复制的 `traceId`，便于对照后端日志。401 转为重新登录。页面需要展示失败原因时用 `utils/api-result.ts` 的 `errorMessageOf`，不要自己读响应体。
- 分页参数为 `page`（从 1 开始）、`pageSize`、`sort`（可重复，每项 `属性名,asc|desc`）。数组参数按 `sort=a&sort=b` 发送。
- 每个请求带 `Authorization: Bearer <token>`、`clientid`（`VITE_APP_CLIENT_ID`）和 `Content-Language`。注意后端要求 `zh_CN` 这种下划线格式。
- 后端标注了 `@ApiEncrypt` 的接口用 `postEncrypted()` / `putEncrypted()` 调用，不要自己拼加密信封。目前有：登录、注册、修改密码、重置密码、新增用户、新增租户。
- 没有 refresh token，登录失效就重新登录。

## 偏好设置

`apps/web-antd/src/preferences.ts`。Vben 默认让浏览器缓存的偏好设置优先于代码。本项目关闭了偏好设置面板，启动后用 `lockedPreferences`（访问模式、品牌、主题色等由部署方决定的配置）覆盖缓存，所以改了配置对所有用户直接生效；只有明暗模式和语言保留用户自己的选择。新增部署方配置时放进 `lockedPreferences`。

## 菜单与路由

`apps/web-antd/src/router/backend-routes.ts`。

- 访问模式为 `mixed`：菜单来自后端 `/system/menu/getRouters`，本地静态路由（首页等）同时保留。
- 后端菜单的 `component` 填 `views` 下的相对路径，不带 `.vue`，例如 `system/post/index` 对应 `views/system/post/index.vue`。前端还没有的页面显示“敬请期待”。后端菜单种子数据中的路径以本仓库的目录为准。
- 菜单图标只接受 Iconify 名称（如 `lucide:user`），不是这种格式的不显示。
- 外链（`is_frame='Y'`）在新窗口打开；内链（`InnerLink`）在 iframe 中打开。

## 页面模板

新页面以岗位管理 `views/system/post/` 为准编写。后端代码生成器默认生成的就是这种风格的代码。

- 目录：`views/<模块>/<业务>/index.vue`（列表页）、`data.ts`（查询条件、表格列、表单字段）、`<业务>-drawer.vue`（新增与编辑抽屉）。
- 接口：`api/<模块>/<业务>.ts`，类型放在同名 `namespace` 中（如 `PostApi.Post`），函数名为 `list*`、`get*`、`add*`、`update*`、`remove*`、`export*`；分页、树节点等通用类型在 `api/types.ts`。
- 表格用 `useVbenVxeGrid`：查询条件一行最多 4 个；每页默认 10 条，可选 10 / 20 / 50 / 100；工具栏左侧依次为新增、删除所选、导出；状态列用开关，行内操作为编辑与删除（删除用气泡确认）。分页参数用 `utils/page-query.ts` 的 `toPageQuery(page)` 生成。
- 表单用右侧抽屉，两列排布，备注占整行；保存成功提示“已保存”并刷新列表。
- 按钮级权限用 `hasPermission('system:post:add')`（`utils/permission.ts`，已处理超级管理员的 `*:*:*`），权限码与后端 `@SaCheckPermission` 一致。后端另外要求 `@SaCheckRole(superadmin)` 的操作（目前是菜单的增删改）用 `hasSuperAdminPermission()`，它同时判断角色与权限码。
- 字典用 `getDictOptions(DictType.xxx)`（`api/system/dict.ts`，带缓存）。字典类型一律从 `DictType` 常量引用，页面中不要定义本地字典常量；字典的增删改接口成功后会自动 `clearDictCache()`。列表中的字典列用 `cellRender: { name: 'CellDict', props: { dictType } }`（`components/dict-tag.vue`）。
- 导出用 `exportExcel()`（`api/request.ts`），文件名为“业务名_时间.xlsx”。
- 文案：通用的增删改查文案在 `locales/langs/*/crud.json`（如 `crud.saved`）；每个页面一个文案文件 `locales/langs/<语言>/<模块>/<业务>.json`，键自动嵌套为 `<模块>.<业务>.*`（如 `system/post.json` → `system.post.postName`），中英文同步。文案中的 `@`、`{`、`}` 要写成 `{'@'}`、`{'{'}`、`{'}'}`（vue-i18n 语法）。
- 同一业务有多个页面时（如文件列表与存储配置），共用一个 `data.ts`（用函数名区分，如 `useConfigColumns`）和一个文案文件，第二个页面的文案放在子对象中（`system.oss.config.*`）；弹窗用 `<业务>-modal.vue`。
- 后端的 Long 型 ID 一律按字符串处理（顶级的 `parentId` 是数字 0，比较时统一 `String()`）；数组类查询参数用逗号拼接。
- 树表接口返回扁平列表时用 `listToTree()`（`utils/tree.ts`）。
- 远程排序：列上 `sortable: true`，`sortConfig: { remote: true }` 与 `proxyConfig.sort: true`，查询时用 `toPageQuery(page, sorts)` 把排序转成 `sort` 参数。排序字段必须是后端实体的属性名（后端按实体校验，不在实体中的拒绝）。

代码生成器下载的 zip 中，`vben/` 目录与 `apps/web-antd/src/` 一一对应，直接复制即可。英文文案是由字段名生成的，需要按业务含义修改；图片与文件上传字段目前生成为输入框。

### 其他页面形式

- 树表（以 `views/system/dept`、`views/system/menu` 为准）：扁平列表用 `treeConfig.transform` 组装，不分页；首次查询后展开第一层，带查询条件时全部展开，`treeConfig.reserve: true` 保留展开状态（不要依赖 `proxyQuery` 事件，`gridApi.query()` 不会触发它）；上级字段用 TreeSelect，编辑时排除本节点及其下级；按类型显示不同字段用 `dependencies`，提交前清理隐藏字段。
- 主从两栏（以 `views/system/dict` 为准）：一个菜单要维护两级数据时，在同一页面左右放两个 `useVbenVxeGrid`，不要抽屉套抽屉。左栏 `rowConfig.isCurrent` 选中行、默认选第一行；右栏监听选中项后 `reload()`，未选中时提示“请在左侧选择……”；各自的抽屉放在各自的面板组件内；布局 `flex-col lg:flex-row`。

## 常见场景

- 敏感字段（客户端密钥、存储密钥等）：列表不显示；后端不返回密钥原值，只返回“是否已设置”（如 `accessKeySet`），编辑时提示“已设置，留空表示不修改”，提交时不发送空值；新增时用 `InputPassword` 并设 `autocomplete=new-password`。
- 权限覆盖接口 `PUT /system/role/permission` 同时覆盖菜单权限和数据权限，`menuIds`、`deptIds` 都必须提交（缺少时后端拒绝）。只改其中一项时，先读出另一项原样提交（见 `role-drawer.vue`、`role-data-scope-drawer.vue`）；父子联动的换算在 `views/system/role/tree-utils.ts`。
- 用户的角色、岗位可以为空：修改用户、分配角色时空数组表示清空（不传表示不修改），提交时未选择一律发送 `[]`（`views/system/user/data.ts` 的 `toUserForm`）。
- 时间范围查询：后端绑定 `params[beginXxx]` / `params[endXxx]`，前端用 RangePicker（`valueFormat: 'YYYY-MM-DD'`）按整天转换，导出用同一组值。现有页面的写法还不统一：用户、角色与代码生成模板用 `fieldMappingTime`，登录日志、操作日志用 `toQuery()`，文件管理直接写扁平键。`fieldMappingTime` 在当前 Vben 中已废弃，新代码请用表单级的 `codec`。
- 上传：用 `api/system/oss.ts` 的 `uploadOss`（`requestClient.upload`，带进度、不设超时）；`accept` 用 `views/system/oss/data.ts` 的 `UPLOAD_EXTENSIONS` / `UPLOAD_ACCEPT`，它必须与后端 `tuoyu.upload.allowed-extensions` 一致，两处要一起改；上传 Blob 时文件名必须带扩展名；超限或被拒绝时显示后端的提示。
- 富文本：只对后端标注了 `@RichText` 的字段使用 `v-html`，其他字段一律按文本展示。目前没有这样的字段，通知公告内容是多行文本框、按纯文本处理；以后改用富文本编辑器时，后端要同时标注 `@RichText`。消息中心的内容也按文本展示。
- 图表：用 `@vben/plugins/echarts`（`EchartsUI` + `useEcharts`），颜色从 CSS 变量读取，切换明暗模式后重新绘制，图表旁配数据表格。

## 消息中心

页头铃铛，代码在 `layouts/message-center.vue`、`store/message.ts`。

- 打开页面时加载 `/resource/message/box` 的历史消息，之后通过 SSE（`/resource/message`）接收推送；退出登录前由 `authStore.logout` 调用 `disconnect()` 断开，并请求 `/resource/message/close`。
- SSE 用 fetch 读取（`utils/sse.ts`），令牌放在请求头中。不要改用 EventSource，也不要把令牌放进 URL。断线按指数退避重连；未登录或接口不存在（后端关闭了推送）时停止，不提示错误。
- 同一令牌只能有一个推送连接：另一个标签页连上后，本页收到 `kicked` 并暂停，回到本页时重新连接。
- 已读、移除只记录在本地（localStorage，按用户），后端没有已读接口；推送数据的解析与合并在 `utils/message-box.ts`。

## 个人中心

`views/_core/profile`，静态路由 `Profile` → `/profile`，在菜单中隐藏。包括基本资料、修改密码（`putEncrypted`，后端不会让已登录的会话失效）、在线设备（`/system/online`，当前会话不能在这里下线）、第三方账号（列表、解绑，以及已配置但本人未绑定的平台的绑定入口，平台列表来自 `/auth/social/sources`）。页签可以用 `?tab=basic|password|devices|social` 指定。

- 基本资料：手机号、邮箱为空字符串表示清空（后端约定：空串清空、不传不修改）。
- 第三方账号绑定：`/auth/binding/{source}` 取授权页地址（只接受 http / https）后整页跳转；第三方回跳到后端配置的 `justauth.type.*.redirect-uri`（`<前端地址>/social-callback?source=...`，再追加 `code`、`state`）。回调页 `views/_core/profile/social-callback.vue`（静态路由 `SocialCallback`，需要登录，在菜单与标签栏中隐藏）调用 `/auth/social/callback` 绑定后回到 `/profile?tab=social`。
- hash 路由（生产构建）下，回跳地址不在 `#` 之后。`main.ts` 在创建路由前用 `utils/social-callback.ts` 把 `/social-callback?...` 改写为 `/#/social-callback?...`，所以后端的 `redirect-uri` 不必区分路由模式。Nginx 需要把未知路径回落到 `index.html`（`scripts/deploy/nginx.conf` 已有 `try_files`）。

## 工作流

- 流程设计器与流程图嵌入 Warm-Flow 自带的页面（`views/workflow/components/warm-flow-frame.vue`，地址与消息处理在 `utils/warm-flow.ts`）。令牌按 Warm-Flow 的约定放在 iframe 地址的查询参数中（`Authorization`、`clientid`，对应后端的 `warm-flow.token-name`），Warm-Flow 前端会把它存进本站点 localStorage 的 `Warm-*` 键，所以退出登录时由 `clearWarmFlowStorage()` 清除。只接受来自该 iframe、同源的 `postMessage`（`close` 返回列表，`getTheme` 回复明暗模式）。
- 办理与详情共用 `views/workflow/components/process-drawer.vue`（审批记录、流程图、按节点的按钮权限显示同意 / 退回 / 转办 / 委派 / 加签 / 减签 / 终止 / 抄送 / 弹窗选人）；选人用 `user-select-modal.vue`；纯函数在 `views/workflow/task/task-utils.ts`。

## 接口加密

按后端仓库 `docs/adr/0001-接口加密.md` 实现（RSA-OAEP-256 + AES-256-GCM）。

- 公钥运行时从 `/auth/crypto/public-key` 获取，前端不保存、不配置任何密钥。
- HTTPS 或 `localhost` 下用 WebCrypto；非 HTTPS 且后端允许时，按需加载 MIT / BSD 协议的 JavaScript 加密库。
- 两条路径都必须通过后端仓库的测试向量 `tuoyu-framework/tuoyu-common-encrypt/src/test/resources/api-crypto/test-vectors.json`。

## 端到端测试

Playwright，用例在 `apps/web-antd/e2e`，配置在 `apps/web-antd/playwright.config.ts`。

- 需要真实的后端。账号口令只从环境变量 `E2E_USERNAME`、`E2E_PASSWORD` 读取，不写进仓库。后端地址用 `E2E_API_URL`，前端地址用 `E2E_BASE_URL`（不设置时自动启动开发服务器，`/api` 转发到 `VITE_DEV_PROXY_TARGET`，默认 `http://localhost:8081`）；测试生产构建时设 `E2E_ROUTER_HISTORY=hash`。
- 后端不可用、缺少账号或开启了图形验证码时跳过，并在标准错误中写明原因；设置 `E2E_REQUIRE_BACKEND=true` 时改为失败。
- 首次运行先 `pnpm -F @vben/web-antd exec playwright install chromium`，之后 `pnpm -F @vben/web-antd run test:e2e`。CI 中只能手动触发（`.github/workflows/e2e.yml`，账号放在仓库 Secrets 中）。
- 测试会新增并删除一个编码以 `e2e_` 开头的岗位，只对测试环境运行；不测试口令错误，否则会触发账号锁定。

## 修改 Vben 自带的文件

尽量在 `apps/web-antd` 中解决。必须改 `packages/` 下的 Vben 文件时，在改动处加以 `tuoyu：` 开头的注释，并登记在下面，升级 Vben 时逐条保留：

- `packages/effects/plugins/src/vxe-table/use-vxe-grid.vue`：表格标题与左侧按钮之间留 16px（标题加 `mr-4`），按钮之间仍为 8px。
- `packages/effects/common-ui/src/ui/authentication/login.vue`：登录按钮去掉 Vben 的 `aria-label="login"`，无障碍名称取可见文字“登录”（端到端测试按 `getByRole('button', { name: /登\s*录/ })` 查找）。

## 已知限制

- 工作流还没有业务表单：发起流程需要业务模块调用 `/workflow/task/startWorkFlow`，办理时只显示业务标题、编码与 ID（自定义表单路径 `formPath` 尚未接入）。
- 后端没有本人上传头像的接口（文件上传需要 `system:oss:upload` 权限），个人中心只显示头像。
- 登录页不提供第三方账号登录，回调页只处理已登录用户的绑定。
- 暗色模式的主色：Vben 的自定义主色在明暗模式下用同一个值，规范要求暗色下约为 `hsl(226 85% 70%)`。
- 非 HTTPS 且后端允许时的 JavaScript 加密库尚未接入，目前会给出提示、不能登录。
- 部署用的 `scripts/deploy/nginx.conf` 还没有把 `/api` 转发到网关。加上时注意消息推送 `/api/resource/message` 是长连接：读超时要长于后端心跳 60 秒，并且不能缓冲（后端已发送 `X-Accel-Buffering: no`）。
- 菜单 IconPicker 的图标列表在线获取（`api.iconify.design`），离线环境只能手动输入。
- `VITE_APP_STORE_SECURE_KEY` 只是本地存储的混淆，打包后对任何人可见，不是安全边界，不要在其中放真正的密钥。
