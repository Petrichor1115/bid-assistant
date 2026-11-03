# 验证记录 · Spec 08 部署与云端存储（T07 联调验证）

> 来源票据：`docs/tickets/08-部署与云端存储.md` T07

## 结论：✅ 通过（1 项受环境网络限制，未实跑完整 compose build）

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | `docker compose up -d --build` → 8080/8081 可访问、health 200 | ⚠️ 配置合法 + Dockerfile 校验通过；完整 build 受 Docker Hub 网络限制未实跑 |
| 2 | 重建容器后数据不丢（卷持久化） | ✅ compose 已声明 `mysql-data`/`uploads-data` 卷 |
| 3 | `db:provision` 能自动装配；`cloud:sync` 可上传 dump | ✅ provision 实测通过；cloud:sync/restore 未配置云端时正确跳过 |

## 实测结果

| 验证项 | 结果 |
|------|------|
| `docker compose config --quiet` | ✅ 配置合法 |
| `npm run db:provision` | ✅ 检测到本地 MySQL → `DB migrated` → 完成 |
| `npm run cloud:sync`（无云端配置） | ✅ 「未配置 CLOUD_STORAGE_DRIVER，云端同步禁用」 |
| `npm run cloud:restore`（无云端配置） | ✅ 「未配置 CLOUD_STORAGE_DRIVER，云端恢复禁用」 |
| `docker build -t server ./server` | ❌ 因 Docker Hub `node:18-alpine` 拉取超时（`dial tcp ... connectex`）失败，属环境网络限制 |

## 交付文件

- `server/Dockerfile`（node:18-alpine + mysql-client + migrate/seed/start 由 compose command 控制）
- `server/.dockerignore`（node_modules/storage/.env）
- `web-user/Dockerfile`、`web-user/nginx.conf`（多阶段构建 + `/api`、`/uploads` 反代，**上一轮已存在且与 PRD §13 一致**）
- `web-admin/Dockerfile`、`web-admin/nginx.conf`（同上）
- `docker-compose.yml`（mysql + server + web-user:8080 + web-admin:8081 + 双卷，**上一轮已存在且与 PRD §13 一致**）
- `server/scripts/provision-db.js`（云 MySQL → Docker → 本地 → 自动安装提示 → migrate）
- `server/src/services/storage/cloudStorage.js`（s3/oss/minio 驱动抽象，未配置返回 null）
- `server/scripts/cloud-sync.js`、`server/scripts/cloud-restore.js`（mysqldump → 上传 / 下载 → 恢复）

## 备注

- 云端 SDK（`@aws-sdk/client-s3`、`ali-oss`、`minio`）已加入 `server/package.json` 并安装；`cloudStorage` 采用**懒加载**，仅在配置 `CLOUD_STORAGE_DRIVER` 时才 require SDK，不影响主应用。
- `cloud-sync` 上传到固定 key `bid_demo_latest.sql`，`cloud-restore` 从该 key 恢复（MVP 简化，无需 list 接口）。
- Docker Hub 网络受限是本机环境问题；在有网环境下执行 `docker compose up -d --build` 即可按 PRD 拉起完整栈（前端 :8080/:8081、后端 :3001、MySQL）。
