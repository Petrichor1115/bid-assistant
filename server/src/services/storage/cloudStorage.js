const config = require('../../config');

class S3Storage {
  constructor() {
    // 懒加载 SDK，仅配置 s3 时才 require
    const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
    this.client = new S3Client({
      region: config.cloudStorage.endpoint ? 'auto' : 'us-east-1',
      endpoint: config.cloudStorage.endpoint || undefined,
      credentials: { accessKeyId: config.cloudStorage.accessKey, secretKey: config.cloudStorage.secretKey },
    });
    this.bucket = config.cloudStorage.bucket;
    this.cmds = { PutObjectCommand, GetObjectCommand };
  }
  async upload(key, data) {
    await this.client.send(new this.cmds.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data }));
  }
  async download(key) {
    const r = await this.client.send(new this.cmds.GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await r.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
}

class OssStorage {
  constructor() {
    const OSS = require('ali-oss');
    this.client = new OSS({
      region: config.cloudStorage.endpoint || undefined,
      bucket: config.cloudStorage.bucket,
      accessKeyId: config.cloudStorage.accessKey,
      accessKeySecret: config.cloudStorage.secretKey,
    });
  }
  async upload(key, data) {
    await this.client.put(key, data);
  }
  async download(key) {
    const r = await this.client.get(key);
    return Buffer.from(r.content);
  }
}

class MinioStorage {
  constructor() {
    const Minio = require('minio');
    const ep = config.cloudStorage.endpoint || 'localhost:9000';
    const [host, portStr] = ep.split(':');
    const useSSL = ep.startsWith('https://');
    this.client = new Minio.Client({
      endPoint: host.replace(/^https?:\/\//, ''),
      port: Number(portStr || (useSSL ? 443 : 9000)),
      useSSL,
      accessKey: config.cloudStorage.accessKey,
      secretKey: config.cloudStorage.secretKey,
    });
    this.bucket = config.cloudStorage.bucket;
  }
  async upload(key, data) {
    await this.client.putObject(this.bucket, key, data);
  }
  async download(key) {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
  }
}

/**
 * 云端对象存储统一接口：upload(key, data) / download(key) -> data。
 * 未配置 CLOUD_STORAGE_DRIVER 时返回 null（云端同步禁用）。
 */
function createCloudStorage() {
  switch (config.cloudStorage.driver) {
    case 's3':
      return new S3Storage();
    case 'oss':
      return new OssStorage();
    case 'minio':
      return new MinioStorage();
    default:
      return null;
  }
}

module.exports = { createCloudStorage };
