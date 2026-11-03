const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../src/config');
const { createCloudStorage } = require('../src/services/storage/cloudStorage');

const KEY = 'bid_demo_latest.sql';

async function sync() {
  const storage = createCloudStorage();
  if (!storage) {
    console.log('未配置 CLOUD_STORAGE_DRIVER，云端同步禁用');
    return;
  }
  const dumpFile = path.join(os.tmpdir(), 'bid_demo_dump.sql');
  const pwd = config.db.password ? `-p${config.db.password}` : '';
  try {
    execSync(`mysqldump -h ${config.db.host} -P ${config.db.port} -u ${config.db.user} ${pwd} ${config.db.name} > ${dumpFile}`, { stdio: 'inherit' });
  } catch (e) {
    // 宿主机无 mysqldump 时，回退到 mysql 容器内执行
    console.log('本机无 mysqldump，改用 docker exec 容器导出...');
    execSync(`docker exec bid-demo-mysql-1 sh -c "mysqldump -u root -proot123456 bid_demo" > ${dumpFile}`, { stdio: 'inherit' });
  }
  const data = fs.readFileSync(dumpFile);
  await storage.upload(KEY, data);
  console.log(`cloud sync 完成 → ${KEY}（${data.length} bytes）`);
}

sync().catch((e) => {
  console.error('cloud sync 失败:', e.message);
  process.exit(1);
});
