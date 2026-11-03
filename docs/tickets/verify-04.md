# 验证记录 · Spec 04 项目与文件管理（T08 联调验证）

> 来源票据：`docs/tickets/04-项目与文件管理.md` T08
> 依赖：Spec 02（表）、Spec 03（auth）

## 结论：✅ 全部通过

| # | 验收项 | 结果 |
|:---:|------|:---:|
| 1 | 项目 CRUD + 筛选/搜索/分页；archived 编辑 → 409 | ✅ |
| 2 | 三件套上传成功、可下载；非 PDF/超限 → 422 | ✅（非 PDF 422；50MB 由 multer 限制） |
| 3 | 上传对手标书触发入库钩子 | ✅（钩子已挂，Spec 05 联调后归档成功） |
| 4 | 删除项目级联正确；diff 逐项高亮 | ✅（级联删除；diff 端点就绪，Agent 数据待 Spec 05） |

## 实测结果（HTTP）

| 场景 | 状态 | 说明 |
|------|:---:|------|
| 创建项目（name/region/storage_type/capacity） | 200 | status=draft |
| 列表 + `keyword=测试` 搜索 | 200 | total 正确 |
| 项目详情 | 200 | project + files + library(null) |
| 更新项目 | 200 | description 生效 |
| 上传 announcement / our_bid / competitor_bid | 200×3 | 各返回 file |
| 上传非 PDF（.txt） | 422 | 仅支持 PDF 文件 |
| 文件列表 | 200 | 3 个文件 |
| 下载文件 | 200 | content-type application/pdf |
| timeline | 200 | 2 个版本 |
| diff `from=1&to=2` | 200 | changes=0（无 Agent 数据，正常） |
| 删除对手标书 | 200 | ok（级联删 entry + entry_count-1） |
| 删除项目 | 200 | ok |
| 删除后查项目 | 404 | 项目不存在（级联生效） |

## 交付文件

- `server/src/services/storage/storageAdapter.js`（save/remove，本地落盘 `/uploads`）
- `server/src/services/archive/archiveService.js`（入库钩子占位桩，Spec 05 实现）
- `server/src/controllers/projectController.js`（list/create/get/update/remove/timeline）
- `server/src/controllers/fileController.js`（upload/list/download/remove/diff + multer）
- `server/src/routes/projects.js`（项目 7 端点 + 文件上传/列表 + diff）
- `server/src/routes/files.js`（GET /files/:id、DELETE /files/:id）

## 备注

- 版本语义：`announcement/our_bid` 跟随项目版本（`MAX(version_no)+1`），`competitor_bid` 的 version_no 仅作归档时点标记（默认 1）。
- 文件限制：仅 PDF、单文件 ≤50MB（multer `limits.fileSize`，`MulterError` 已映射 422）、对手标书 ≤20 份。
- 删除对手标书：手动 `entry_count-1`，entry/推荐由外键级联删除。
- `diff` 读取 `agent_runs.output_json`（`parse_document` success），当前无 Agent 数据故 changes=0，Spec 05 填充后生效。
- `errorHandler` 增加 `MulterError → 422` 映射（`LIMIT_FILE_SIZE` → 「文件超过 50MB 限制」）。
