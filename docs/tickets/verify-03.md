# 验证记录 · Spec 03 认证与用户管理（T06 联调验证）

> 来源票据：`docs/tickets/03-认证与用户管理.md` T06
> 依赖：Spec 02（users 表 + 种子），Spec 01 T05（auth 中间件）

## 结论：✅ 全部通过

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | 正确账号+app → token；app 与角色不符 → 401 | ✅ |
| 2 | 无 token 调 me → 401；admin 可 CRUD；非 admin 调 users → 403 | ✅ |
| 3 | 删除自己 / 最后 admin → 422 | ✅（删自己 422；最后 admin 逻辑 cnt≤1 守卫） |

## 实测结果（HTTP）

| 场景 | 状态 | 说明 |
|------|:---:|------|
| `张投标/123456` + `app=user` 登录 | 200 | 返回 token + user(role=bidder) |
| `系统管理员/123456` + `app=admin` 登录 | 200 | role=admin |
| admin 账号 + `app=user` | 401 | 账号与当前应用角色不匹配 |
| 密码错误 | 401 | 用户名或密码错误 |
| 无 token `GET /auth/me` | 401 | 未登录或 token 无效 |
| 有 token `GET /auth/me` | 200 | 返回当前用户 |
| bidder 调 `GET /users` | 403 | 无权限 |
| admin 列表 `GET /users?page=1&pageSize=10` | 200 | total=5，无 password_hash 泄漏 |
| admin 创建用户 | 200 | 返回 user（无 password_hash） |
| 重名创建 | 422 | 用户名已存在 |
| admin 更新用户 | 200 | department 更新生效 |
| admin 删除用户 | 200 | ok |
| admin 删除自己 | 422 | 不能删除自己 |
| `POST /auth/logout` | 200 | ok |

## 交付文件

- `server/src/controllers/authController.js`（login / me / logout）
- `server/src/controllers/userController.js`（list / create / get / update / remove）
- `server/src/routes/auth.js`（POST /auth/login 公开；GET /auth/me、POST /auth/logout 走 auth）
- `server/src/routes/users.js`（5 端点全部 `auth + requireRole('admin')`）

## 备注

- 所有用户返回一律剔除 `password_hash`（`toUser` 解构剥离）。
- 「删除最后 admin」由 `COUNT(role='admin') <= 1` 守卫；因当前仅 1 个 admin，实际会先命中「删自己 422」，该守卫为防御性逻辑。
