const orchestrator = require('../services/agent/orchestrator');
const { ok, fail } = require('../utils/response');

function stripRun(run) {
  if (!run) return run;
  const { input_json, output_json, ...rest } = run;
  return rest;
}

async function runAll(req, res, next) {
  try {
    const projectId = req.params.id;
    const versionNo = Number(req.body?.version_no || (await orchestrator.getLatestVersion(projectId)));
    // 异步执行（不 await），立即返回；前端轮询 agent/runs 获取进度
    orchestrator.runAll(projectId, versionNo).catch((e) => console.error('runAll 失败:', e.message));
    ok(res, { started: true, version_no: versionNo });
  } catch (e) {
    next(e);
  }
}

async function runSingle(req, res, next) {
  try {
    const projectId = req.params.id;
    const name = req.params.name;
    const versionNo = Number(req.body?.version_no || (await orchestrator.getLatestVersion(projectId)));
    const run = await orchestrator.runSingle(name, projectId, versionNo);
    ok(res, { run: stripRun(run) });
  } catch (e) {
    next(e);
  }
}

async function listRuns(req, res, next) {
  try {
    const versionNo = req.query.version_no ? Number(req.query.version_no) : null;
    const list = await orchestrator.listRuns(req.params.id, versionNo);
    ok(res, { list: list.map(stripRun) });
  } catch (e) {
    next(e);
  }
}

async function getRun(req, res, next) {
  try {
    const run = await orchestrator.getRun(req.params.runId);
    if (!run) return fail(res, 404, 404, '运行记录不存在');
    ok(res, { run });
  } catch (e) {
    next(e);
  }
}

async function retry(req, res, next) {
  try {
    const run = await orchestrator.retry(req.params.runId);
    ok(res, { run: stripRun(run) });
  } catch (e) {
    next(e);
  }
}

module.exports = { runAll, runSingle, listRuns, getRun, retry };
