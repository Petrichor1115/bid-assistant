/**
 * 统一响应信封
 * 成功：{ code: 0, message: 'ok', data }
 * 失败：{ code, message, data: null }（code 与 HTTP 状态码一致）
 */

function ok(res, data) {
  return res.json({ code: 0, message: 'ok', data });
}

function fail(res, status, code, message) {
  const httpStatus = status || 500;
  const errCode = code !== undefined && code !== null ? code : httpStatus;
  const errMsg = message || (httpStatus === 404 ? 'Not Found' : 'Internal Server Error');
  return res.status(httpStatus).json({ code: errCode, message: errMsg, data: null });
}

module.exports = { ok, fail };
