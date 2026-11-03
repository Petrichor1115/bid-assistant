import { useEffect, useState } from 'react';
import { Card, Input, Space, Table, Tag } from 'antd';
import { listProjects } from '../api/projects';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '进行中', color: 'blue' },
  in_progress: { label: '进行中', color: 'blue' },
  awaiting_approval: { label: '审批中', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  archived: { label: '已归档', color: 'default' },
  rejected: { label: '已驳回', color: 'red' },
};

export default function ProjectManagement() {
  const [list, setList] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    listProjects({ page: 1, pageSize: 100, keyword: keyword || undefined })
      .then((d) => setList(d.list || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const columns = [
    { title: '项目名称', dataIndex: 'name' },
    { title: '招标方', dataIndex: 'bidder' },
    { title: '储能类型', dataIndex: 'storage_type' },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={STATUS_MAP[s]?.color}>{STATUS_MAP[s]?.label || s}</Tag> },
    { title: '截止时间', dataIndex: 'deadline' },
    { title: '创建时间', dataIndex: 'created_at', render: (t: string) => (t ? new Date(t).toLocaleString() : '-') },
  ];

  return (
    <Card title="项目管理">
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索项目名称" allowClear onSearch={(v) => { setKeyword(v); load(); }} style={{ width: 240 }} />
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
    </Card>
  );
}
