# 验证记录 · Spec 02 数据模型与数据库（T06 约束与级联验证）

> 来源票据：`docs/tickets/02-数据模型与数据库.md` T06
> 数据库：MySQL 8.0.46（Docker 容器 `bid-demo-mysql-1`，`docker compose up -d mysql` 拉起）

## 结论：✅ 全部通过

| # | 验证项 | 结果 |
|:---:|------|:---:|
| 1 | 10 表建立 | ✅ 10/10 |
| 2 | 5 种子用户 + 密码 hash | ✅ bcrypt 校验通过 |
| 3 | 示例数据（项目→库→条目→文件） | ✅ entry_count=1，条目 indexed |
| 4 | CHECK 枚举约束 | ✅ 非法 role/status 均被拒绝 |
| 5 | 外键级联删除 | ✅ 删项目后 files 残留 0 |
| 6 | JSON 字段读写 | ✅ 对象自动序列化/反序列化 |

## 实测结果

### 迁移与幂等

```bash
npm run db:migrate   # 第一次：DB migrated
npm run db:migrate   # 第二次：DB migrated（幂等，不报错）
```

### 数据核对

- 用户：`admin, bidder, bid_director, legal, tech_lead` 共 5 个，`bcrypt.compareSync('123456', hash)` 全部为 true。
- 示例项目 `p-demo-001`：德国 50MWh 工商业储能项目，`capacity_mwh=50.00`；库 `entry_count=1`；条目 `Tesla` / `indexed`，`feature_vector` 为 `{"project_type":"commercial","industry_domain":"储能","project_scale":"50MWh","capacity_mwh":50,"power_mw":25,"duration_h":2}`。

### 约束与级联

| 场景 | 结果 |
|------|------|
| 插入非法 `role='invalid_role'` | 被 CHECK 拒绝 ✓ |
| 插入非法 `status='bad_status'` | 被 CHECK 拒绝 ✓ |
| 删除项目 → 级联删除 files | 残留 0 ✓ |
| `agent_runs.input_json/output_json` 写对象、读回对象 | 正常 ✓ |

## 备注

- 索引已内联进 `CREATE TABLE`（8 个索引：files/agent_runs/issues/approvals/entries×2/recommendations×2），配合 `IF NOT EXISTS` 保证 `db:migrate` 可重复执行（PRD 的独立 `CREATE INDEX` 语句在 MySQL 8.0 无 `IF NOT EXISTS`，重复执行会报 duplicate key，故改为内联，最终 schema 等价）。
- MySQL 由 Docker 提供（本机未安装原生 MySQL）：`docker compose up -d mysql`，凭据 `root/root123456`，库 `bid_demo`，端口 3306。
