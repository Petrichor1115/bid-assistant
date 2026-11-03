import { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import { listAdminFiles } from '../api/files';

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  announcement: { label: '招标文件', color: 'blue' },
  our_bid: { label: '投标文件', color: 'green' },
  competitor_bid: { label: '竞标文件', color: 'orange' },
};

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileManagement() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listAdminFiles().then((d) => setList(d.list || [])).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: '文件名', dataIndex: 'original_name' },
    { title: '所属项目', dataIndex: 'project_name' },
    { title: '文件类型', dataIndex: 'file_type', render: (t: string) => <Tag color={TYPE_MAP[t]?.color}>{TYPE_MAP[t]?.label || t}</Tag> },
    { title: '版本', dataIndex: 'version_no', render: (v: number) => `V${v}` },
    { title: '文件大小', dataIndex: 'file_size', render: (s: number) => formatSize(s) },
    { title: '提交时间', dataIndex: 'created_at', render: (t: string) => (t ? new Date(t).toLocaleString() : '-') },
  ];

  return (
    <Card title="文件管理">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
    </Card>
  );
}
