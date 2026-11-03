import { useEffect, useState } from 'react';
import { Card, Select, Space, Table, Tabs, Tag, message } from 'antd';
import { useParams } from 'react-router-dom';
import { getResults, updateIssue } from '../api/result';
import { getRecommendations, adoptRecommendation, dismissRecommendation } from '../api/library';
import SeverityTag from '../components/SeverityTag';
import CoverageTag from '../components/CoverageTag';
import RecommendationCard from '../components/RecommendationCard';
import type { Results } from '../types';

export default function BidCompareResult() {
  const { id = '' } = useParams();
  const [results, setResults] = useState<Results | null>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [opponentFileId, setOpponentFileId] = useState<string | undefined>();

  const load = () => {
    getResults(id, { opponent_file_id: opponentFileId }).then(setResults).catch(() => message.error('加载失败'));
    getRecommendations(id).then((d) => setRecs(d.list || [])).catch(() => {});
  };
  useEffect(load, [id, opponentFileId]);

  const onResolve = async (issueId: string) => { await updateIssue(issueId, true); message.success('已标记解决'); load(); };

  const selfColumns = [
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <SeverityTag severity={v} /> },
    { title: '字段', dataIndex: 'field_key' },
    { title: '当前值', dataIndex: 'our_value' },
    { title: '建议', dataIndex: 'suggestion' },
    { title: '操作', render: (_: any, r: any) => r.is_resolved ? <Tag>已解决</Tag> : <a onClick={() => onResolve(r.id)}>标记解决</a> },
  ];
  const coverageColumns = [
    { title: '要求', dataIndex: 'req_item' },
    { title: '分类', dataIndex: 'category' },
    { title: '状态', dataIndex: 'our_status', render: (v: string) => <CoverageTag status={v} /> },
    { title: '证据', dataIndex: 'evidence' },
  ];
  const gapColumns = [
    { title: '严重度', dataIndex: 'severity', render: (v: string) => <SeverityTag severity={v} /> },
    { title: '字段', dataIndex: 'field_key' },
    { title: '我方', dataIndex: 'our_value' },
    { title: '对手', dataIndex: 'opponent_value' },
    { title: '描述', dataIndex: 'gap_description' },
    { title: '建议', dataIndex: 'suggestion' },
  ];

  const paramData = (results?.param_compare.opponents || []).map((o) => {
    const row: Record<string, unknown> = { field: o.company_name };
    for (const f of results?.param_compare.fields || []) row[f] = `${o.params[f] ?? '-'}`;
    return row;
  });
  const ourRow: Record<string, unknown> = { field: '我方' };
  for (const f of results?.param_compare.fields || []) ourRow[f] = `${results?.param_compare.our[f] ?? '-'}`;
  const paramColumns = [
    { title: '对比项', dataIndex: 'field' },
    ...(results?.param_compare.fields || []).map((f) => ({ title: f, dataIndex: f })),
  ];

  return (
    <div>
      {recs.length > 0 && (
        <Card title="推荐对标书" size="small" style={{ marginBottom: 16 }}>
          {recs.map((r) => (
            <RecommendationCard key={r.id} recommendation={r} onAdopt={(rid) => { adoptRecommendation(rid).then(load); }} onDismiss={(rid) => { dismissRecommendation(rid).then(load); }} />
          ))}
        </Card>
      )}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <span>对手切换：</span>
          <Select
            style={{ width: 240 }}
            placeholder="默认最新归档一份"
            allowClear
            value={opponentFileId}
            onChange={setOpponentFileId}
            options={(results?.opponents || []).map((o) => ({ value: o.file_id, label: o.company_name || o.file_id }))}
          />
        </Space>
        <Tabs
          items={[
            {
              key: 'self',
              label: `自审问题 (${results?.self_check.length || 0})`,
              children: <Table rowKey="id" columns={selfColumns} dataSource={results?.self_check || []} pagination={false} size="small" />,
            },
            {
              key: 'coverage',
              label: `招标要求覆盖度 (${results?.coverage.length || 0})`,
              children: <Table rowKey="req_item" columns={coverageColumns} dataSource={results?.coverage || []} pagination={false} size="small" />,
            },
            {
              key: 'gaps',
              label: `竞标差距 (${results?.bid_gaps.length || 0})`,
              children: <Table rowKey="id" columns={gapColumns} dataSource={results?.bid_gaps || []} pagination={false} size="small" />,
            },
            {
              key: 'param',
              label: '参数对比表',
              children: <Table rowKey="field" columns={paramColumns} dataSource={[ourRow, ...paramData]} pagination={false} size="small" />,
            },
          ]}
        />
      </Card>
    </div>
  );
}
