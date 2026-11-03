const fs = require('fs');
const path = require('path');
const config = require('../../config');

/**
 * 本地文件存储统一接口。
 * save(fileBuffer, destName) -> { path, url }
 * remove(storagePath)
 */
const storageAdapter = {
  save(fileBuffer, destName) {
    const destPath = path.join(config.storage.dir, destName);
    fs.writeFileSync(destPath, fileBuffer);
    return { path: destName, url: `/uploads/${destName}` };
  },
  remove(storagePath) {
    if (!storagePath) return;
    const p = path.join(config.storage.dir, storagePath);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  },
};

module.exports = storageAdapter;
