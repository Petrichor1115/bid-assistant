# 验证记录 · Spec 01 工程骨架与基础设施（T10 联调冒烟测试）

> 来源票据：`docs/tickets/01-工程骨架与基础设施.md` T10
> 验证范围：Spec 01 §7 三条验收标准
> 环境：Node v24.22.1 / npm 11.19.1 / Windows（本机）

## 结论：✅ 全部通过

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | `GET /api/health` 返回 200 正确字段 | ✅ |
| 2 | 用户端 5173、管理端 5174 可访问且 `/api` 代理生效 | ✅ |
| 3 | 无 token 访问受保护路由 → 401；错误统一信封 | ✅ |

## 实测结果

### 1. 健康检查接口

```bash
curl http://localhost:3001/api/health
# → HTTP 200
{"code":0,"message":"ok","data":{"status":"ok","db":"mysql","llm":"mock","storage":"local"}}
```

字段 `status/db/llm/storage` 齐备且符合 `{status:"ok",db:"mysql",llm:"mock"|"ready",storage:"local"|"cloud"}` 口径。

### 2. 双前端可访问 + /api 代理

| 探测 | 结果 |
|------|------|
| `curl http://localhost:5173/` | HTTP 200 |
| `curl http://localhost:5174/` | HTTP 200 |
| `curl http://localhost:5173/api/health`（vite 代理 → 3001） | HTTP 200，返回同上 health JSON |
| `curl http://localhost:5174/api/health`（vite 代理 → 3001） | HTTP 200，返回同上 health JSON |

### 3. 鉴权（无 token 401 / 错误统一信封）

以 `auth` + `requireRole('bidder')` 挂载受保护路由后：

| 场景 | 状态码 | 响应 |
|------|:---:|------|
| 无 token | 401 | `{"code":401,"message":"未登录或 token 无效","data":null}` |
| 有效 bidder token | 200 | `{"code":0,"message":"ok","data":{"user":{...}}}` |
| admin token（越权） | 403 | `{"code":403,"message":"无权限","data":null}` |

## 备注

- 本轮受保护路由为空（Spec 03/04 才挂载 auth/项目等业务路由），验收 3 通过「内存 app 挂载 `auth`+`requireRole`」端到端验证，与 T05 单元验证结论一致。
- 冒烟时观察到：`npm run dev`（concurrently）首次启动到就绪需约 3s，早期 curl 若过早会连接拒绝；vite 默认绑定 IPv6 `[::1]`，Windows 下 `localhost` 可正常解析访问。
- 冒烟完成后已通过 `taskkill /T /F` 整树清理三端进程（含 node --watch / vite / npm 孤儿进程），端口 3001/5173/5174 均已释放。
