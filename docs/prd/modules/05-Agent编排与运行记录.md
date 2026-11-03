# M5 · Agent 编排与运行记录（子 PRD）

> 模块定位：Agent 触发、实时执行状态与运行历史。MVP 以项目详情内嵌组件承载（运行历史页本版移除，日志/重试由 API 承载）。后端编排逻辑见 [05-Agent编排与Prompt设计.md](./05-Agent编排与Prompt设计.md)。

## 模块范围

| 项 | 内容 |
|----|------|
| 功能 5.1 | Agent 触发（一键跑/单跑/智能匹配） |
| 组件 5.2 | Agent 执行状态条（内嵌项目详情） |
| 页面 5.3 | Agent 运行记录（本版移除独立页面） |

**接口**：`POST /api/projects/:id/agent/run`、`POST /api/projects/:id/agent/:agentName/run`、`GET /api/projects/:id/agent/runs`、`GET /api/agent/runs/:runId`、`POST /api/agent/runs/:runId/retry`。

---

## 功能 5.1 Agent 触发

### 1. 功能说明
- [一键跑全流程]：顺序执行 5 个主流程 Agent（1→2→3→4→5），Agent6 按需单独触发。
- 单 Agent 触发（调试）：可选任意 agentName 单独跑。
- 触发后创建 agent_runs，前端进入轮询监控。

### 2. 交互流程
```
点击 [一键跑] → POST agent/run → 状态条开始轮询 → 各 Agent 依次 pending→running→success/failed → 完成后刷新结果入口
```

### 3. 接口

| 方法 | 路径 | 入参 | 出参 |
|------|------|------|------|
| POST | /api/projects/:id/agent/run | `{version_no}` | `{runs}` |
| POST | /api/projects/:id/agent/:name/run | `{version_no}` | `{run}` |

### 4. 异常
- 运行中重复触发 → 前端禁用按钮；部分失败 → 状态条标红可重试。

### 5. 权限
- bidder/admin；其他角色不可见按钮。

### 6. 埋点
- `agent_run_click`（参数 agent=all|name）。

### 7. 验收
- 触发后 agent_runs 创建、状态流转正确。

---

## 组件 5.2 Agent 执行状态条

### 1. 功能说明
- 实时展示主流程 5 个 Agent 的执行步骤与耗时；Agent6 匹配结果在对手标书库/推荐卡片单独展示。

### 2. 交互流程
```
轮询 GET agent/runs（1~2s）→ Steps 高亮当前 Agent → 全部 success 完成 / 有 failed 标红
```

### 3. 字段与组件定义

| 字段 | 组件 | 说明 |
|------|------|------|
| agent_name | Steps 步骤项 | 5 个主流程 Agent |
| status | Step 状态 | wait/process/finish/error |
| duration_ms | 文本 | 各 Agent 耗时 |

### 4. 接口
- `GET /api/projects/:id/agent/runs?version_no=`（轮询）。

### 5. 异常
- failed：红色 error 步骤 + Tooltip 显示 error_message；页面离开清理轮询定时器；服务重启后 running→failed 展示"服务重启中断"。

### 6. 权限
- bidder/admin 可见。

### 7. UI/UX
- 横向 Steps，超出可横向滚动；完成绿色、失败红色。

### 8. 埋点
- `agent_status_view`（进入监控）。

### 9. 验收
- 轮询刷新正确、失败态正确、定时器正确清理。

---

## 页面 5.3 Agent 运行记录（本版移除，API 保留）

> 本版移除独立页面（导航不再入口）；`GET /api/projects/:id/agent/runs`、`GET /api/agent/runs/:runId`、`POST /api/agent/runs/:runId/retry` 仍保留，供状态条与后续迭代使用。

### 1. 页面核心功能说明
- 每个项目每次运行的完整日志（输入/输出/错误/耗时）；失败项 [重试]。

### 2. 交互流程
```
进入（或项目详情入口）→ 列表按时间倒序 → 点行展开详情（input/output JSON）→ 失败行 [重试]
```

### 3. 字段与组件定义

| 字段 | 组件 | 说明 |
|------|------|------|
| agent_name | 文本 | Agent 标识 |
| version_no | Tag | 版本 |
| status | Tag | 状态 |
| started_at/finished_at/duration_ms | 文本 | 时间与耗时 |
| error_message | 文本(红) | 失败原因 |
| input_json/output_json | Collapse + JSON 展示 | 详情 |
| 操作 | Button | [重试]（仅 failed） |

### 4. 接口

| 方法 | 路径 | 出参 |
|------|------|------|
| GET | /api/projects/:id/agent/runs?version_no= | `{list}` |
| GET | /api/agent/runs/:runId | `{run}`（含输入输出） |
| POST | /api/agent/runs/:runId/retry | `{run}` |

### 5. 异常
- 重试前确认；重试后刷新列表；空态"暂无运行记录"。

### 6. 权限
- bidder/admin；其他角色不可见（菜单隐藏）。

### 7. UI/UX
- Table + 展开行；JSON 格式化展示；重试按钮 loading。

### 8. 埋点
- `agent_history_view`、`agent_retry_click`（参数 run_id）。

### 9. 验收
- 日志完整可追溯；重试幂等（先删同 version+source_agent 旧 issues 再写）。
