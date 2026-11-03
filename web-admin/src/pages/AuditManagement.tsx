import { useEffect, useState } from 'react';
import { Card, Table, Tag } from 'antd';
import { listAdminApprovals } from '../api/approvals';

const LEVEL_MAP: Record<string, string> = {
  tech_lead: '技术负责人审核',
  legal: '法务审核',
  bid_director: '投标主管审核',
};

export default function AuditManagement() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listAdminApprovals().then((d) => setList(d.list || [])).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: '项目名称', dataIndex: 'project_name' },
    { title: '版本', dataIndex: 'version_no', render: (v: number) => `V${v}` },
    { title: '审核级别', dataIndex: 'level', render: (l: string) => LEVEL_MAP[l] || l },
    { title: '审核结果', dataIndex: 'decision', render: (d: string) => <Tag color={d === 'approved' ? 'green' : 'red'}>{d === 'approved' ? '已通过' : '已拒绝'}</Tag> },
    { title: '自动审核', dataIndex: 'auto_approved', render: (v: number) => (v ? '是' : '否') },
    { title: '审核时间', dataIndex: 'created_at', render: (t: string) => (t ? new Date(t).toLocaleString() : '-') },
  ];

  return (
    <Card title="审核管理">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={{ pageSize: 10 }} size="small" />
    </Card>
  );
}
