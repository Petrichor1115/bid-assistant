const { execSync } = require('child_process');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');

async function canConnect() {
  try {
    const conn = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
    });
    await conn.end();
    return true;
  } catch {
    return false;
  }
}

function tryDocker() {
  try {
    execSync('docker compose --project-directory .. up -d mysql', { cwd: __dirname, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 数据库自动装配：云 MySQL → Docker → 本地 → 自动安装提示 → migrate。
 */
async function provision() {
  if (config.cloudDbUrl) {
    console.log('已配置 CLOUD_DB_URL，使用云 MySQL，跳过本地准备');
  } else if (!(await canConnect())) {
    console.log('本地 MySQL 未就绪，尝试 Docker 拉起...');
    if (!tryDocker()) {
      console.log('Docker 不可用，等待本地 MySQL...');
      await new Promise((r) => setTimeout(r, 3000));
      if (!(await canConnect())) {
        console.error('未检测到可用 MySQL。请手动安装 MySQL 8.0（或 Docker）：');
        console.error('  Windows: winget install Oracle.MySQL');
        console.error('  macOS:   brew install mysql');
        console.error('  Linux:   apt/yum install mysql-server');
        console.error('安装后创建用户 root/root123456 并启动服务。');
        process.exit(1);
      }
    }
  }

  console.log('数据库就绪，执行 migrate...');
  execSync('node scripts/migrate.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('db:provision 完成');
}

provision().catch((e) => {
  console.error('provision 失败:', e.message);
  process.exit(1);
});
