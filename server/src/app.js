const fs = require('fs');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { fail } = require('./utils/response');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 通用中间件
app.use(cors());
app.use(express.json());

// 上传文件静态访问：/uploads/{uuid}
fs.mkdirSync(config.storage.dir, { recursive: true });
app.use('/uploads', express.static(config.storage.dir));

// 路由挂载
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/projects'));
app.use('/api', require('./routes/files'));
app.use('/api', require('./routes/agent'));
app.use('/api', require('./routes/library'));
app.use('/api', require('./routes/results'));
app.use('/api', require('./routes/approvals'));
app.use('/api', require('./routes/reports'));
app.use('/api', require('./routes/dashboard'));

// 404 兜底：未匹配任何路由时返回统一信封
app.use((req, res) => fail(res, 404, 404, 'Not Found'));

// 统一错误处理
app.use(errorHandler);

module.exports = app;
