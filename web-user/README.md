# web-user · 用户端（投标专员）

面向投标专员的产品前端：对话式主页 + 项目工作台 + 竞标对比结果。React 18 + TypeScript + Ant Design 5 + Vite。

## 1. 功能与页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login` | 用户名 + 密码登录，仅接受 `bidder` 角色 |
| `/` | `ChatHome` | 对话式主页：左导航 + 右对话框，输入诉求直达工作台 |
| `/projects` | `ProjectList` | 项目列表（进行中 / 已归档筛选、搜索） |
| `/projects/new` | `ProjectNew` | 新建项目：项目类型、地区、容量/功率/时长、截止时间 |
| `/projects/:id` | `ProjectDetail` | 项目详情：文件上传、Agent 运行、版本时间线 |
| `/projects/:id/review/:versionNo` | `ReviewDetail` | 版本审查详情：问题清单与处理 |
| `/projects/:id/compare` | `BidCompareResult` | 竞标对比结果：参数对比 / 差距清单 / 覆盖度 / 修改建议 4 Tab |
| `/projects/:id/library` | `CompetitorLibrary` | 对手标书库与智能匹配推荐（采纳 / 忽略） |
| `/projects/:id/diff` | `VersionDiff` | 版本 Diff：V1 → V2 → V3 字段变化 |
| `/projects/:id/report` | `ProjectReport` | 项目总报告，支持导出 PDF |

## 2. 目录结构

```
web-user/
├── src/
│   ├── App.tsx / main.tsx / theme.ts
│   ├── router/index.tsx        # 路由 + AuthGuard（角色 bidder）
│   ├── layouts/ChatLayout.tsx  # 左导航 + 右内容
│   ├── pages/                  # 10 个页面
│   ├── components/             # 12 个通用组件（上传、PDF 预览、差距标签、时间线等）
│   ├── api/                    # 10 个接口模块 + axios 封装（http.ts）
│   ├── stores/                 # zustand：authStore / projectStore
│   ├── types/                  # 全局类型
│   ├── utils/track.ts          # 埋点
│   ├── assets/tenders/         # 项目类型图标（SVG）
│   └── styles/global.css
├── vite.config.ts              # 端口 5173，代理 /api 与 /uploads 到 3001
├── nginx.conf                  # 生产镜像内转发 /api 与 /uploads
├── Dockerfile
└── package.json
```

## 3. 依赖环境

- Node.js 18+
- 后端 `server` 已在 `http://127.0.0.1:3001` 运行（开发态由 Vite 代理）

## 4. 快速启动

```bash
cd web-user
npm install
npm run dev        # http://127.0.0.1:5173
```

构建与本地预览：

```bash
npm run build      # tsc --noEmit 类型检查 + vite build，产物在 dist/
npm run preview
```

默认登录账号：`小林` / `123456`（种子数据中的 `bidder` 用户）。

## 5. 与后端的约定

- 所有请求走 `/api`，开发态由 `vite.config.ts` 代理到 `http://127.0.0.1:3001`，无需配置 CORS
- 上传文件通过 `/uploads/{uuid}` 预览，同样由 Vite 代理
- Token 存于 `localStorage`，`http.ts` 统一注入 `Authorization: Bearer <token>` 并处理 401 跳转
- 响应信封为 `{ code, message, data }`，`data` 为空或 `code !== 0` 时按失败处理
- 登录时请求体需带 `app: 'user'`（后端据此校验 `bidder` 角色）

## 6. Docker

```bash
docker compose up -d --build web-user   # http://localhost:8080
```

镜像为两段式构建：`node:18-alpine` 打包 → `nginx:1.27-alpine` 托管，`nginx.conf` 负责 SPA 回退与接口转发。
