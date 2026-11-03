import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { getAdminDashboard } from '../api/dashboard';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { getAdminDashboard().then(setData).catch(() => setData({})); }, []);

  return (
    <Spin spinning={!data}>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="项目总数" value={data?.project_total ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="Agent 运行总数" value={data?.agent_run_total ?? 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="成功率" value={data?.agent_success_rate ?? 0} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="存储占用(MB)" value={((data?.storage_used_bytes ?? 0) / 1048576).toFixed(1)} /></Card></Col>
      </Row>
    </Spin>
  );
}
