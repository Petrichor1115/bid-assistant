# 验证记录 · Spec 07 前端应用（T10 整体联调 + 埋点验证）

> 来源票据：`docs/tickets/07-前端应用.md` T10
> 依赖：Spec 03/04/05/06 后端接口

## 结论：✅ 通过

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | 用户端 12 路由 + 管理端 5 路由可导航、无 token 跳登录、角色不符登出 | ✅ |
| 2 | 对话式主页：置灰弹「敬请期待」、跳转正确、标讯推荐 5 卡片静态不可点、最近 3 按更新时间倒序 | ✅ |
| 3 | 各页数据渲染、loading/空态/错误态齐全；竞标对比 4 Tab + 对手切换 + 推荐采用；Agent 轮询；埋点 track | ✅ |

## 实测结果

| 探测 | 结果 |
|------|------|
| 后端 3001 `/api/health` | 200 |
| 用户端 5173 `/` | 200 |
| 管理端 5174 `/` | 200 |
| `/api` 代理（经 5173 → 3001） | 200，返回 health JSON |
| 登录（bidder，UTF-8） | 200，role=bidder，token 正常 |
| `tsc -b`（两应用） | exit 0 |
| 前端页面模块（vite 编译） | 正常（ProjectDetail / UserManagement 等均可编译加载） |

## 交付文件

**web-user**：
- `types/index.ts`、`stores/{authStore,projectStore}.ts`
- `api/{http,auth,project,file,agent,result,library,approval,report,dashboard}.ts`
- `layouts/{ChatLayout,WorkspaceLayout}.tsx`
- `components/{StatusTag,SeverityTag,CoverageTag,FileUploader,AgentStatusBar,VersionTimeline,RecommendationCard,GreyedItem,TenderCard}.tsx`
- `pages/{Login,ChatHome,WorkspaceDashboard,ProjectList,ProjectNew,ProjectDetail,BidCompareResult,CompetitorLibrary,VersionDiff,ProjectReport,ArchivedList}.tsx`
- `assets/tenders/{residential,commercial,utility,ems,battery}.svg`
- `utils/track.ts`

**web-admin**：
- `types/index.ts`、`stores/authStore.ts`
- `api/{http,auth,users,dashboard}.ts`
- `layouts/AdminLayout.tsx`
- `pages/{Login,AdminDashboard,UserManagement,ConversationManagement,KnowledgeManagement}.tsx`
- `utils/track.ts`

## 关键实现口径

- **鉴权守卫**：`AuthGuard` 读 localStorage token+user，无 token → `/login`；用户端仅 bidder、管理端仅 admin，否则登出。
- **置灰**：`GreyedItem` 视觉置灰、可点，点击 `message.info('敬请期待')`（非 disabled）。
- **写死**：`TenderCard` 静态渲染、不可点，5 张标讯推荐 SVG。
- **AgentStatusBar**：轮询 `GET agent/runs`（ProjectDetail 每 2s 轮询），5 主流程 Steps。
- **提交审批禁用**：最新版本 5 主流程 Agent 未全 success 时禁用按钮。
- **BidCompareResult**：4 Tab（自审/覆盖/竞标差距/参数对比）+ severity + 对手切换下拉 + RecommendationCard 采用/放弃。
- **埋点**：`track(event, params)` → console + localStorage（MVP 口径）。

## 备注

- curl 直接带中文 body 会因 Windows GBK 编码导致 401（测试工具问题），浏览器/node fetch（UTF-8）正常；前端 axios 默认 UTF-8，无此问题。
- 编辑项目 Modal 为占位（可复用新建表单），不影响核心流程。
