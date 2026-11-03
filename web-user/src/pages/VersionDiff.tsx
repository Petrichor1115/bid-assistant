import { useEffect, useState } from 'react';
import { Card, Descriptions, Select, Space, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { getTimeline, getDiff } from '../api/project';

export default function VersionDiff() {
  const { id = '' } = useParams();
  const [versions, setVersions] = useState<number[]>([]);
  const [from, setFrom] = useState<number>();
  const [to, setTo] = useState<number>();
  const [changes, setChanges] = useState<any[]>([]);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    getTimeline(id).then((d) => {
      const vs = (d.list || []).map((x: any) => x.version_no).sort((a: number, b: number) => a - b);
      setVersions(vs);
      if (vs.length >= 2) { setFrom(vs[0]); setTo(vs[vs.length - 1]); }
    });
  }, [id]);

  useEffect(() => {
    if (from && to) getDiff(id, from, to).then((d) => { setChanges(d.changes || []); setSummary(d.summary || ''); });
  }, [id, from, to]);

  return (
    <Card title="版本 Diff">
      <Space style={{ marginBottom: 16 }}>
        <span>From:</span>
        <Select style={{ width: 120 }} value={from} onChange={setFrom} options={versions.map((v) => ({ value: v, label: `V${v}` }))} />
        <span>To:</span>
        <Select style={{ width: 120 }} value={to} onChange={setTo} options={versions.map((v) => ({ value: v, label: `V${v}` }))} />
        <Tag color="blue">{summary}</Tag>
      </Space>
      <Descriptions column={1} bordered size="small">
        {changes.map((c) => (
          <Descriptions.Item key={c.field} label={c.field}>
            <Tag color={c.change_type === 'added' ? 'green' : c.change_type === 'removed' ? 'red' : 'orange'}>{c.change_type}</Tag>
            {String(c.from_value ?? '-')} → {String(c.to_value ?? '-')}
          </Descriptions.Item>
        ))}
        {!changes.length && <Descriptions.Item label="无变化">两个版本间无字段差异</Descriptions.Item>}
      </Descriptions>
    </Card>
  );
}
