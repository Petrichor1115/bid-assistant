import { useEffect, useState } from 'react';
import { Button, Card, Col, DatePicker, Input, Row, Select, Space, Tag, Typography, Empty, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listProjects } from '../api/project';
import StatusTag from '../components/StatusTag';
import type { Project } from '../types';

const STORAGE_TYPES = [
  { value: 'residential', label: '户用储能' },
  { value: 'commercial', label: '工商业储能' },
  { value: 'utility', label: '大型储能' },
  { value: 'ems_battery', label: 'EMS/电池包' },
];

const STATUSES = [
  { value: 'draft', label: '草稿' },
  { value: 'in_progress', label: '进行中' },
  { value: 'awaiting_approval', label: '待审批' },
  { value: 'approved', label: '已审批' },
  { value: 'archived', label: '已归档' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '进行中', color: 'blue' },
  in_progress: { label: '进行中', color: 'blue' },
  awaiting_approval: { label: '审批中', color: 'orange' },
  approved: { label: '已通过', color: 'green' },
  archived: { label: '已归档', color: 'default' },
  rejected: { label: '已驳回', color: 'red' },
};

export default function ProjectList() {
  const navigate = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageType, setStorageType] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [keyword, setKeyword] = useState('');

  const load = () => {
    setLoading(true);
    listProjects({
      storage_type: storageType || undefined,
      status: status || undefined,
      created_from: dateRange?.[0],
      created_to: dateRange?.[1],
      keyword: keyword || undefined,
    })
      .then((d) => setList(d.list || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [storageType, status, dateRange]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>项目列表</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/new')}>新建项目</Button>
      </div>

      {/* 筛选 + 搜索 */}
      <Space wrap size={12} style={{ marginBottom: 16, width: '100%' }}>
        <Select
          placeholder="储能类型"
          allowClear
          style={{ width: 140 }}
          options={STORAGE_TYPES}
          value={storageType}
          onChange={setStorageType}
        />
        <Select
          placeholder="项目状态"
          allowClear
          style={{ width: 140 }}
          options={STATUSES}
          value={status}
          onChange={setStatus}
        />
        <DatePicker.RangePicker
          placeholder={['立项时间起', '立项时间止']}
          onChange={(dates) => {
            setDateRange(dates && dates[0] && dates[1]
              ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
              : null);
          }}
        />
        <Input.Search
          placeholder="搜索项目名称"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => { setKeyword(v); load(); }}
        />
      </Space>

      {/* 项目卡片 */}
      <Spin spinning={loading}>
        {list.length ? (
          <Row gutter={[16, 16]}>
            {list.map((p) => (
              <Col span={8} key={p.id}>
                <Card
                  hoverable
                  onClick={() => navigate(`/projects/${p.id}`)}
                  bodyStyle={{ padding: 16 }}
                  style={{ height: 160, display: 'flex', flexDirection: 'column' }}
                >
                  <Typography.Text strong style={{ fontSize: 15 }} ellipsis={{ tooltip: p.name }}>
                    {p.name}
                  </Typography.Text>
                  <div style={{ height: 52, marginTop: 6, overflow: 'hidden', color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.6 }}>
                    {p.description || '暂无项目简介'}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Tag color={STATUS_MAP[p.status]?.color} style={{ marginRight: 0 }}>{STATUS_MAP[p.status]?.label || p.status}</Tag>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      最近编辑 {dayjs(p.updated_at || p.created_at).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无项目" />
        )}
      </Spin>
    </div>
  );
}
