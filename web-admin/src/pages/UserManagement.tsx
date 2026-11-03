import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { listUsers, createUser, updateUser, deleteUser } from '../api/users';
import type { User } from '../types';

export default function UserManagement() {
  const [list, setList] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm();

  const load = (p = page) => {
    listUsers({ page: p, pageSize: 10 }).then((d) => { setList(d.list); setTotal(d.total); });
  };
  useEffect(() => { load(1); }, []);

  const onSave = async (values: any) => {
    if (editing) await updateUser(editing.id, values);
    else await createUser(values);
    message.success('保存成功');
    setOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const onDelete = async (id: string) => {
    await deleteUser(id);
    message.success('已删除');
    load();
  };

  const columns = [
    { title: '姓名', dataIndex: 'name' },
    { title: '角色', dataIndex: 'role' },
    { title: '部门', dataIndex: 'department' },
    { title: '操作', render: (_: any, r: User) => (
      <Space>
        <a onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</a>
        <a onClick={() => onDelete(r.id)}>删除</a>
      </Space>
    ) },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新建用户</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={list} pagination={{ current: page, pageSize: 10, total, onChange: (p) => { setPage(p); load(p); } }} />
      <Modal open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} title={editing ? '编辑用户' : '新建用户'}>
        <Form form={form} onFinish={onSave} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label={editing ? '密码（留空不修改）' : '密码'} rules={editing ? [] : [{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={[{ value: 'bidder', label: 'bidder' }, { value: 'tech_lead', label: 'tech_lead' }, { value: 'legal', label: 'legal' }, { value: 'bid_director', label: 'bid_director' }, { value: 'admin', label: 'admin' }]} />
          </Form.Item>
          <Form.Item name="department" label="部门"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
