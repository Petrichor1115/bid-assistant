/**
 * 统一错误处理中间件
 * 按 err.status（默认 500）输出统一失败信封。
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  // multer 上传错误映射为 422（业务校验失败）
  if (err.name === 'MulterError') {
    status = 422;
    message = err.code === 'LIMIT_FILE_SIZE' ? '文件超过 50MB 限制' : '文件上传失败';
  }
  res.status(status).json({ code: status, message, data: null });
}

module.exports = errorHandler;
