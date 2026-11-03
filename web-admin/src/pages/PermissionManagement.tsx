import { useEffect, useState } from 'react';
import { Card, Select, Table, Tag, message } from 'antd';
import { listUsers, updateUser } from '../api/users';
import type { User } from '../types';

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  bidder: { label: '投标专员', color: 'blue' },
  tech_lead: { label: '技术负责人', color: 'cyan' },
  legal: { label: '法务', color: 'purple' },
  bid_director: { label: '投标主管', color: 'geekblue' },
  admin: { label: '管理员', color: 'red' },
};

export default function PermissionManagement() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    listUsers({ page: 1, pageSize: 100 }).then((d) => setList(d.list || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onChangeRole = async (id: string, role: string) => {
    await updateUser(id, { role });
    message.success('权限已更新');
    load();
  };

  const columns = [
    { title: '姓名', dataIndex: 'name' },
    { title: '部门', dataIndex: 'department', render: (d: string) => d || '-' },
    {
      title: '权限角色',
      dataIndex: 'role',
      render: (r: string, row: User) => (
        <Select
          value={r}
          style={{ width: 140 }}
          size="small"
          onChange={(v) => onChangeRole(row.id, v)}
          options={Object.entries(ROLE_MAP).map(([value, m]) => ({ value, label: m.label }))}
        />
      ),
    },
    {
      title: '角色标签',
      dataIndex: 'role',
      render: (r: string) => <Tag color={ROLE_MAP[r]?.color}>{ROLE_MAP[r]?.label || r}</Tag>,
    },
  ];

  return (
    <Card title="权限管理">
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} pagination={false} size="small" />
    </Card>
  );
}
