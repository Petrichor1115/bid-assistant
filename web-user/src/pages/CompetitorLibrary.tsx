import { useEffect, useState } from 'react';
import { Button, Card, Table, Tag, message } from 'antd';
import { useParams } from 'react-router-dom';
import { getLibrary, matchLibrary, getRecommendations, adoptRecommendation } from '../api/library';

export default function CompetitorLibrary() {
  const { id = '' } = useParams();
  const [library, setLibrary] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);

  const load = () => {
    getLibrary(id).then((d) => { setLibrary(d.library); setEntries(d.entries || []); });
    getRecommendations(id).then((d) => setRecs(d.list || []));
  };
  useEffect(() => { load(); }, [id]);

  const onMatch = async () => { await matchLibrary(id); message.success('匹配完成'); load(); };

  const entryColumns = [
    { title: '公司', dataIndex: 'company_name' },
    { title: '行业', dataIndex: 'industry_domain' },
    { title: '规模', dataIndex: 'project_scale' },
    { title: '类型', dataIndex: 'project_type' },
    { title: '索引状态', dataIndex: 'index_status', render: (v: string) => <Tag color={v === 'indexed' ? 'green' : v === 'failed' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  const recColumns = [
    { title: '公司', dataIndex: 'company_name' },
    { title: '得分', dataIndex: 'match_score', render: (v: number) => (v * 100).toFixed(0) + '%' },
    { title: '理由', dataIndex: 'recommendation_reason' },
    { title: '状态', dataIndex: 'status' },
    { title: '操作', render: (_: any, r: any) => r.status === 'recommended' ? <a onClick={() => adoptRecommendation(r.id).then(load)}>采用</a> : null },
  ];

  return (
    <div>
      <Card title={`对手标书库（${library?.entry_count || 0} 条）`} extra={<Button type="primary" onClick={onMatch}>智能匹配</Button>} style={{ marginBottom: 16 }}>
        <Table rowKey="id" columns={entryColumns} dataSource={entries} pagination={false} size="small" />
      </Card>
      <Card title="推荐列表">
        <Table rowKey="id" columns={recColumns} dataSource={recs} pagination={false} size="small" />
      </Card>
    </div>
  );
}
