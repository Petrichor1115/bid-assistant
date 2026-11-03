# web-admin · 管理端（系统管理员）

投标智能助手的管理后台：系统仪表盘、用户与权限、项目与文件、审批、对话与知识库。React 18 + TypeScript + Ant Design 5 + Vite。

## 1. 功能与页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login` | 管理员登录，仅接受 `admin` 角色 |
| `/admin` | `AdminDashboard` | 系统仪表盘：项目数、Agent 运行、问题分布 |
| `/admin/projects` | `ProjectManagement` | 项目列表与状态管理 |
| `/admin/files` | `FileManagement` | 文件列表、删除、存储占用 |
| `/admin/audits` | `AuditManagement` | 审批记录与处理 |
| `/admin/permissions` | `PermissionManagement` | 角色与权限配置 |
| `/admin/users` | `UserManagement` | 用户增删改查 |
| `/admin/conversations` | `ConversationManagement` | 对话式主页的会话记录 |
| `/admin/knowledge` | `KnowledgeManagement` | 对手标书库 / 知识资产管理 |

## 2. 目录结构

```
web-admin/
├── src/
│   ├── App.tsx / main.tsx / theme.ts
│   ├── router/index.tsx          # 路由 + AuthGuard（角色 admin）
│   ├── layouts/AdminLayout.tsx
│   ├── pages/                    # 9 个页面
│   ├── api/                      # 7 个接口模块 + axios 封装（http.ts）
│   ├── stores/authStore.ts
│   ├── types/  utils/track.ts  styles/global.css
├── vite.config.ts                # 端口 5174，代理 /api 与 /uploads 到 3001
├── nginx.conf
├── Dockerfile
└── package.json
```

## 3. 依赖环境

- Node.js 18+
- 后端 `server` 已在 `http://127.0.0.1:3001` 运行

## 4. 快速启动

```bash
cd web-admin
npm install
npm run dev        # http://127.0.0.1:5174
```

构建与预览：

```bash
npm run build      # tsc --noEmit 类型检查 + vite build，产物在 dist/
npm run preview
```

默认登录账号：`系统管理员` / `123456`（种子数据中的 `admin` 用户）。

## 5. 与后端的约定

- 请求统一走 `/api`，开发态由 `vite.config.ts` 代理，生产态由 `nginx.conf` 转发到 `server:3001`
- 登录请求体需带 `app: 'admin'`，后端据此校验 `admin` 角色；用户端 token 不能在本端复用
- Token 存于 `localStorage`，`http.ts` 统一注入 `Authorization` 头并处理 401

## 6. Docker

```bash
docker compose up -d --build web-admin   # http://localhost:8081
```

两段式镜像构建：`node:18-alpine` 打包 → `nginx:1.27-alpine` 托管。
