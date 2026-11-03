# 03 · 数据模型与 MySQL 设计

> 本章给出可直接执行的 MySQL DDL、索引、枚举与种子数据。AI 开发者据此建库。
> **数据库引擎：MySQL 8.0**（原 SQLite 方案已废弃，原因见 [07 数据存储方式](./07-技术架构与工程规范.md)）。

## 1. 设计说明

- **数据库**：MySQL 8.0（**≥ 8.0.16**，CHECK 约束才被强制执行），InnoDB 引擎，字符集 `utf8mb4`，库名 `bid_demo`。
- **驱动**：`mysql2`（Node.js，promise 连接池）。
- **迁移**：`server/scripts/migrate.js` 一次性执行 `schema.sql`（`multipleStatements: true`）。
- **安装/配置**：优先 Docker（`docker compose` 拉起 MySQL），详见 [07 数据存储方式](./07-技术架构与工程规范.md)。

### 1.1 类型映射（PostgreSQL → MySQL）

| 原类型 | MySQL 类型 | 说明 |
|--------|-----------|------|
| UUID | VARCHAR(36) | 36 位 UUID 字符串 |
| VARCHAR(n) | VARCHAR(n) | - |
| TEXT | TEXT | - |
| TIMESTAMP | DATETIME | 默认 `CURRENT_TIMESTAMP` |
| JSONB | JSON | MySQL 原生 JSON |
| BOOLEAN | TINYINT(1) | 0/1 |
| DECIMAL(8,2) | DECIMAL(8,2) | 定点小数 |
| BIGINT | BIGINT | - |
| INTEGER | INT | - |
| ENUM | VARCHAR + CHECK | CHECK 约束模拟枚举 |

### 1.2 通用约定

- 主键：`VARCHAR(36)`，值由应用 `crypto.randomUUID()` 生成。
- 外键：`REFERENCES 表(id) ON DELETE CASCADE`；推荐关联可空字段用 `ON DELETE SET NULL`（如 `bid_recommendations.source_file_id`）。
- 时间：`DATETIME`，默认 `CURRENT_TIMESTAMP`（UTC）。
- **版本语义**：以我方标书驱动项目版本（见 01 第 11 节）；`competitor_bid` 的 `version_no` 仅作归档时点标记。
- **issues 幂等**：每次 Agent 执行前，删除该项目该 version 下同 `source_agent` 的旧 issues 再写入（事务内）。
- **进程重启兜底**：服务启动时将 `status='running'` 的 agent_runs 置为 `failed`。

---

## 2. 实体关系图（ER）

```
users ──< projects ──< files
            │
            ├──< agent_runs
            ├──< issues
            ├──< approvals ──< users(approver_id)
            ├── 1:1 project_reports
            ├── 1:1 competitor_bid_libraries ──< competitor_bid_entries ──< files
            └──< bid_recommendations >── competitor_bid_entries
```

**关系基数**：

| 关系 | 基数 | 外键 |
|------|:---:|------|
| users → projects | 1:N | projects.creator_id → users.id |
| projects → files | 1:N | files.project_id → projects.id |
| projects → agent_runs | 1:N | agent_runs.project_id → projects.id |
| projects → issues | 1:N | issues.project_id → projects.id |
| projects → approvals | 1:N | approvals.project_id → projects.id |
| users → approvals | 1:N | approvals.approver_id → users.id |
| projects → project_reports | 1:1 | project_reports.project_id UNIQUE |
| projects → competitor_bid_libraries | 1:1 | competitor_bid_libraries.project_id UNIQUE |
| competitor_bid_libraries → competitor_bid_entries | 1:N | entries.library_id |
| projects → competitor_bid_entries | 1:N | entries.project_id |
| files → competitor_bid_entries | 1:1 | entries.file_id UNIQUE |
| projects → bid_recommendations | 1:N | recs.target_project_id |
| competitor_bid_entries → bid_recommendations | 1:N | recs.source_entry_id |

---

## 3. 完整 DDL（schema.sql，MySQL 8.0）

```sql
-- 数据库与字符集
CREATE DATABASE IF NOT EXISTS bid_demo
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bid_demo;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL,
  department    VARCHAR(100) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NULL,
  CONSTRAINT chk_users_role CHECK (role IN ('bidder','tech_lead','legal','bid_director','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id           VARCHAR(36) PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  bidder       VARCHAR(200) NULL,
  deadline     DATE NULL,
  region       VARCHAR(100) NULL,
  storage_type VARCHAR(50) NULL,
  capacity_mwh DECIMAL(12,2) NULL,
  power_mw     DECIMAL(12,2) NULL,
  duration_h   DECIMAL(10,2) NULL,
  description  TEXT NULL,
  status       VARCHAR(30) NOT NULL DEFAULT 'draft',
  creator_id   VARCHAR(36) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NULL,
  CONSTRAINT chk_projects_storage_type CHECK (storage_type IN ('residential','commercial','utility','ems_battery')),
  CONSTRAINT chk_projects_status CHECK (status IN ('draft','in_progress','awaiting_approval','approved','archived','rejected')),
  CONSTRAINT fk_projects_creator FOREIGN KEY (creator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文件表
CREATE TABLE IF NOT EXISTS files (
  id            VARCHAR(36) PRIMARY KEY,
  project_id    VARCHAR(36) NOT NULL,
  version_no    INT NOT NULL DEFAULT 1,   -- announcement/our_bid 跟随项目版本；competitor_bid 仅归档时点标记
  file_type     VARCHAR(30) NOT NULL,
  original_name VARCHAR(255) NULL,
  storage_path  VARCHAR(500) NULL,
  storage_url   VARCHAR(500) NULL,
  file_size     BIGINT NULL,
  uploader_id   VARCHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_files_file_type CHECK (file_type IN ('announcement','our_bid','competitor_bid')),
  CONSTRAINT fk_files_project  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agent 运行记录
CREATE TABLE IF NOT EXISTS agent_runs (
  id            VARCHAR(36) PRIMARY KEY,
  project_id    VARCHAR(36) NOT NULL,
  version_no    INT NOT NULL,
  agent_name    VARCHAR(50) NOT NULL,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  input_json    JSON NULL,
  output_json   JSON NULL,
  error_message TEXT NULL,
  started_at    DATETIME NULL,
  finished_at   DATETIME NULL,
  duration_ms   INT NULL,
  CONSTRAINT chk_agent_runs_agent_name CHECK (agent_name IN
    ('parse_announcement','parse_document','quality_check',
     'requirement_coverage','bid_compare','competitor_match')),
  CONSTRAINT chk_agent_runs_status CHECK (status IN ('pending','running','success','failed')),
  CONSTRAINT fk_agent_runs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 问题/差距清单
CREATE TABLE IF NOT EXISTS issues (
  id              VARCHAR(36) PRIMARY KEY,
  project_id      VARCHAR(36) NOT NULL,
  version_no      INT NOT NULL,
  category        VARCHAR(30) NOT NULL,
  severity        VARCHAR(10) NOT NULL,
  field_key       VARCHAR(200) NULL,
  field_label     VARCHAR(200) NULL,
  our_value       TEXT NULL,
  opponent_value  TEXT NULL,
  gap_description TEXT NULL,
  suggestion      TEXT NULL,
  source_agent    VARCHAR(50) NULL,
  is_resolved     TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_issues_category CHECK (category IN ('self_check','requirement_gap','bid_gap')),
  CONSTRAINT chk_issues_severity CHECK (severity IN ('red','yellow','green')),
  CONSTRAINT fk_issues_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 审批记录
CREATE TABLE IF NOT EXISTS approvals (
  id            VARCHAR(36) PRIMARY KEY,
  project_id    VARCHAR(36) NOT NULL,
  version_no    INT NOT NULL,
  level         VARCHAR(30) NOT NULL,
  approver_id   VARCHAR(36) NULL,
  decision      VARCHAR(20) NULL,
  comment       TEXT NULL,
  auto_approved TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_approvals_level    CHECK (level IN ('tech_lead','legal','bid_director')),
  CONSTRAINT chk_approvals_decision CHECK (decision IN ('approved','rejected')),
  CONSTRAINT fk_approvals_project  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_approver FOREIGN KEY (approver_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 项目总报告
CREATE TABLE IF NOT EXISTS project_reports (
  id                      VARCHAR(36) PRIMARY KEY,
  project_id              VARCHAR(36) NOT NULL UNIQUE,
  total_versions          INT NULL,
  total_duration_hours    DECIMAL(8,2) NULL,
  self_check_issue_count  INT NULL,
  requirement_gap_count   INT NULL,
  bid_gap_count           INT NULL,
  version_history_json    JSON NULL,
  issue_statistics_json   JSON NULL,
  final_summary           TEXT NULL,
  generated_at            DATETIME NULL,
  pdf_url                 VARCHAR(500) NULL,
  CONSTRAINT fk_reports_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 对手标书库（每项目一个）
CREATE TABLE IF NOT EXISTS competitor_bid_libraries (
  id           VARCHAR(36) PRIMARY KEY,
  project_id   VARCHAR(36) NOT NULL UNIQUE,
  library_name VARCHAR(200) NULL,
  entry_count  INT NOT NULL DEFAULT 0,
  status       VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NULL,
  CONSTRAINT chk_libraries_status  CHECK (status IN ('active','archived')),
  CONSTRAINT fk_libraries_project  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 对手标书库条目（元数据 + 索引）
CREATE TABLE IF NOT EXISTS competitor_bid_entries (
  id               VARCHAR(36) PRIMARY KEY,
  library_id       VARCHAR(36) NOT NULL,
  project_id       VARCHAR(36) NOT NULL,
  file_id          VARCHAR(36) NOT NULL UNIQUE,
  company_name     VARCHAR(200) NULL,
  industry_domain  VARCHAR(100) NULL,
  project_scale    VARCHAR(100) NULL,
  project_type     VARCHAR(50) NULL,
  tech_params_json JSON NULL,
  feature_vector   JSON NULL,
  index_status     VARCHAR(30) NOT NULL DEFAULT 'indexing',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NULL,
  CONSTRAINT chk_entries_project_type CHECK (project_type IN ('residential','commercial','utility','ems_battery')),
  CONSTRAINT chk_entries_index_status CHECK (index_status IN ('indexing','indexed','failed')),
  CONSTRAINT fk_entries_library FOREIGN KEY (library_id) REFERENCES competitor_bid_libraries(id) ON DELETE CASCADE,
  CONSTRAINT fk_entries_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_entries_file    FOREIGN KEY (file_id)    REFERENCES files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 对标书推荐记录
CREATE TABLE IF NOT EXISTS bid_recommendations (
  id                    VARCHAR(36) PRIMARY KEY,
  target_project_id     VARCHAR(36) NOT NULL,
  source_entry_id       VARCHAR(36) NOT NULL,
  source_file_id        VARCHAR(36) NULL,
  match_score           DECIMAL(5,4) NULL,
  match_features_json   JSON NULL,
  recommendation_reason TEXT NULL,
  status                VARCHAR(30) NOT NULL DEFAULT 'recommended',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NULL,
  CONSTRAINT chk_reco_status CHECK (status IN ('recommended','adopted','dismissed')),
  CONSTRAINT fk_reco_target_project FOREIGN KEY (target_project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_reco_source_entry   FOREIGN KEY (source_entry_id)   REFERENCES competitor_bid_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_reco_source_file    FOREIGN KEY (source_file_id)    REFERENCES files(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 索引
CREATE INDEX idx_files_project      ON files(project_id, version_no);
CREATE INDEX idx_agent_runs_project ON agent_runs(project_id, version_no);
CREATE INDEX idx_issues_project     ON issues(project_id, version_no);
CREATE INDEX idx_approvals_project  ON approvals(project_id, version_no);
CREATE INDEX idx_entries_library    ON competitor_bid_entries(library_id);
CREATE INDEX idx_entries_indexed    ON competitor_bid_entries(index_status);
CREATE INDEX idx_reco_target        ON bid_recommendations(target_project_id);
CREATE INDEX idx_reco_source        ON bid_recommendations(source_entry_id);
```

---

## 4. 枚举值规范

| 枚举 | 取值 |
|------|------|
| users.role | `bidder` / `tech_lead` / `legal` / `bid_director` / `admin` |
| projects.status | `draft` / `in_progress` / `awaiting_approval` / `approved` / `archived` / `rejected` |
| projects.storage_type | `residential` / `commercial` / `utility` / `ems_battery` |
| files.file_type | `announcement` / `our_bid` / `competitor_bid` |
| agent_runs.agent_name | `parse_announcement` / `parse_document` / `quality_check` / `requirement_coverage` / `bid_compare` / `competitor_match` |
| agent_runs.status | `pending` / `running` / `success` / `failed` |
| issues.category | `self_check` / `requirement_gap` / `bid_gap` |
| issues.severity | `red`(🔴) / `yellow`(🟡) / `green`(🟢) |
| approvals.level | `tech_lead` / `legal` / `bid_director` |
| approvals.decision | `approved` / `rejected` |
| competitor_bid_libraries.status | `active` / `archived` |
| competitor_bid_entries.index_status | `indexing` / `indexed` / `failed` |
| bid_recommendations.status | `recommended` / `adopted` / `dismissed` |

覆盖状态（Agent4 输出字段，非表字段）：`covered`(✅) / `missing`(❌) / `not_met`(⚠️)

---

## 5. 种子数据（seed.sql）

> 说明：`seed.sql` 仅供结构参考（含 `<BCRYPT_HASH>` 占位符，不可直接执行）；实际由 `seed.js` 程序化插入，运行时用 `bcrypt.hashSync('123456', 10)` 生成哈希。

```sql
INSERT IGNORE INTO users (id, name, password_hash, role, department) VALUES
  ('u-bidder-001',  '张投标',     '<BCRYPT_HASH>', 'bidder',       '海外投标部'),
  ('u-tech-001',    '李技术',     '<BCRYPT_HASH>', 'tech_lead',    '技术部'),
  ('u-legal-001',   '王法务',     '<BCRYPT_HASH>', 'legal',        '法务部'),
  ('u-director-001','赵主管',     '<BCRYPT_HASH>', 'bid_director', '投标管理部'),
  ('u-admin-001',   '系统管理员', '<BCRYPT_HASH>', 'admin',        'IT部');
```

> 实际 seed 脚本应运行时用 `bcrypt.hashSync('123456', 10)` 生成 `<BCRYPT_HASH>`，不要手写。

---

## 6. 数据访问约定

- 用 `mysql2/promise` 创建连接池（`createPool`），统一 `pool.execute(sql, params)`。
- 事务：`const conn = await pool.getConnection(); await conn.beginTransaction(); ... commit/rollback; conn.release();`。
- 查询参数一律 `?` 占位符（防注入）。
- JSON 字段：MySQL `JSON` 类型由 mysql2 自动序列化/反序列化；应用侧读写 JS 对象即可。
- 时间戳：`new Date()`（mysql2 自动转换为 DATETIME）。

---

## 7. 数据存储方式（三级策略，详见 07）

| 优先级 | 场景 | 实现 |
|:---:|------|------|
| 1 | **云端存储（目标态）** | Docker 部署 MySQL，数据通过 Docker 定时 `mysqldump` 上传到云端对象存储（S3/OSS/MinIO 云端），或直连云数据库（RDS） |
| 2 | **本地 MySQL（兜底）** | Docker 云端不可用时，使用本地 MySQL 8.0 |
| 3 | **自动装配** | 本地无 MySQL 时，`db:provision` 自动安装（优先 Docker 拉镜像，其次按平台包管理器安装） |
