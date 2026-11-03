const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./src/db');

const USERS = [
  { name: '小林', role: 'bidder', department: '海外投标部' },
  { name: '李技术', role: 'tech_lead', department: '技术部' },
  { name: '王法务', role: 'legal', department: '法务部' },
  { name: '赵主管', role: 'bid_director', department: '投标管理部' },
  { name: '系统管理员', role: 'admin', department: 'IT部' },
];

async function seedUsers() {
  const [[{ cnt }]] = await db.query('SELECT COUNT(*) AS cnt FROM users');
  if (cnt > 0) {
    console.log('users 已存在，跳过用户种子');
    return;
  }
  const hash = bcrypt.hashSync('123456', 10);
  for (const u of USERS) {
    await db.execute(
      'INSERT INTO users (id, name, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), u.name, hash, u.role, u.department]
    );
  }
  console.log('已插入 5 个种子用户');
}

async function seedDemo() {
  const [[{ cnt }]] = await db.query("SELECT COUNT(*) AS cnt FROM projects WHERE id = 'p-demo-001'");
  if (cnt > 0) {
    console.log('示例数据已存在，跳过');
    return;
  }

  const [[{ id: bidderId }]] = await db.query("SELECT id FROM users WHERE role = 'bidder' LIMIT 1");
  if (!bidderId) {
    console.log('无 bidder 用户，跳过示例数据');
    return;
  }

  const libraryId = crypto.randomUUID();
  const fileId = crypto.randomUUID();
  const entryId = crypto.randomUUID();

  await db.execute(
    `INSERT INTO projects (id, name, bidder, deadline, region, storage_type, capacity_mwh, power_mw, duration_h, description, status, creator_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    ['p-demo-001', '德国 50MWh 工商业储能项目', 'EnBW Energy Solutions GmbH', '2025-12-31', '德国', 'commercial', 50, 25, 2, '示例项目：德国 50MWh 工商业储能竞标', bidderId]
  );

  await db.execute(
    `INSERT INTO competitor_bid_libraries (id, project_id, library_name, entry_count, status)
     VALUES (?, ?, ?, 1, 'active')`,
    [libraryId, 'p-demo-001', '对手标书库']
  );

  await db.execute(
    `INSERT INTO files (id, project_id, version_no, file_type, original_name, storage_path, storage_url, file_size, uploader_id)
     VALUES (?, ?, 1, 'competitor_bid', ?, ?, ?, ?, ?)`,
    [fileId, 'p-demo-001', 'Tesla_Megapack_50MWh.pdf', '/storage/uploads/demo-tesla.pdf', '/uploads/demo-tesla.pdf', 1024000, bidderId]
  );

  await db.execute(
    `INSERT INTO competitor_bid_entries (id, library_id, project_id, file_id, company_name, industry_domain, project_scale, project_type, tech_params_json, feature_vector, index_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'indexed')`,
    [
      entryId, libraryId, 'p-demo-001', fileId, 'Tesla', '储能', '50MWh', 'commercial',
      { capacity_mwh: 50, power_mw: 25, duration_h: 2, cycle_life: 6000, efficiency: 95, warranty_years: 10 },
      { project_type: 'commercial', industry_domain: '储能', project_scale: '50MWh', capacity_mwh: 50, power_mw: 25, duration_h: 2 },
    ]
  );

  console.log('已插入示例数据（项目/库/文件/条目）');
}

async function seed() {
  await seedUsers();
  await seedDemo();
  await db.end();
  console.log('seed 完成');
}

seed().catch((err) => {
  console.error('seed failed:', err.message);
  process.exit(1);
});
