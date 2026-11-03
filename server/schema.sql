-- ============================================================
-- 标书智能审核对比系统 · MySQL 8.0 完整 DDL
-- 库名 bid_demo，10 张表 + 8 个索引，InnoDB + utf8mb4
-- 幂等：表用 IF NOT EXISTS；索引内联在 CREATE TABLE 内，保证重复执行不报错
-- ============================================================

CREATE DATABASE IF NOT EXISTS bid_demo
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bid_demo;

-- 1. 用户表
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

-- 2. 项目表
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

-- 3. 文件表
CREATE TABLE IF NOT EXISTS files (
  id            VARCHAR(36) PRIMARY KEY,
  project_id    VARCHAR(36) NOT NULL,
  version_no    INT NOT NULL DEFAULT 1,
  file_type     VARCHAR(30) NOT NULL,
  original_name VARCHAR(255) NULL,
  storage_path  VARCHAR(500) NULL,
  storage_url   VARCHAR(500) NULL,
  file_size     BIGINT NULL,
  uploader_id   VARCHAR(36) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_files_file_type CHECK (file_type IN ('announcement','our_bid','competitor_bid')),
  CONSTRAINT fk_files_project  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploader_id) REFERENCES users(id),
  INDEX idx_files_project (project_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Agent 运行记录
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
  CONSTRAINT fk_agent_runs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_agent_runs_project (project_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 问题/差距清单
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
  CONSTRAINT fk_issues_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_issues_project (project_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 审批记录
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
  CONSTRAINT fk_approvals_approver FOREIGN KEY (approver_id) REFERENCES users(id),
  INDEX idx_approvals_project (project_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 项目总报告
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

-- 8. 对手标书库（每项目一个）
CREATE TABLE IF NOT EXISTS competitor_bid_libraries (
  id           VARCHAR(36) PRIMARY KEY,
  project_id   VARCHAR(36) NOT NULL UNIQUE,
  library_name VARCHAR(200) NULL,
  entry_count  INT NOT NULL DEFAULT 0,
  status       VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NULL,
  CONSTRAINT chk_libraries_status CHECK (status IN ('active','archived')),
  CONSTRAINT fk_libraries_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. 对手标书库条目（元数据 + 索引）
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
  CONSTRAINT fk_entries_file    FOREIGN KEY (file_id)    REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_entries_library (library_id),
  INDEX idx_entries_indexed (index_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. 对标书推荐记录
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
  CONSTRAINT fk_reco_source_file    FOREIGN KEY (source_file_id)    REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_reco_target (target_project_id),
  INDEX idx_reco_source (source_entry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
