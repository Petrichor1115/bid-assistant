const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../src/config');
const { createCloudStorage } = require('../src/services/storage/cloudStorage');

const KEY = 'bid_demo_latest.sql';

async function restore() {
  const storage = createCloudStorage();
  if (!storage) {
    console.log('未配置 CLOUD_STORAGE_DRIVER，云端恢复禁用');
    return;
  }
  const data = await storage.download(KEY);
  const dumpFile = path.join(os.tmpdir(), 'bid_demo_restore.sql');
  fs.writeFileSync(dumpFile, data);
  const pwd = config.db.password ? `-p${config.db.password}` : '';
  try {
    execSync(`mysql -h ${config.db.host} -P ${config.db.port} -u ${config.db.user} ${pwd} < ${dumpFile}`, { stdio: 'inherit' });
  } catch (e) {
    // 宿主机无 mysql 客户端时，回退到 mysql 容器内执行
    console.log('本机无 mysql 客户端，改用 docker exec 容器导入...');
    execSync(`docker exec -i bid-demo-mysql-1 sh -c "mysql -u root -proot123456 bid_demo" < ${dumpFile}`, { stdio: 'inherit' });
  }
  console.log('cloud restore 完成');
}

restore().catch((e) => {
  console.error('cloud restore 失败:', e.message);
  process.exit(1);
});
