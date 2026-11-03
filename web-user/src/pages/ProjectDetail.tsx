import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Space, Table, Tag, Timeline, Typography, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, getTimeline } from '../api/project';
import { listFiles } from '../api/file';
import { listRuns, runAll } from '../api/agent';
import { archive } from '../api/report';
import { listIssues } from '../api/result';
import { submitApproval, listApprovals } from '../api/approval';
import type { AgentRun, FileRecord, Issue, Project } from '../types';

const FILE_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  announcement: { label: '招标文件', color: 'blue' },
  our_bid: { label: '投标文件', color: 'green' },
  competitor_bid: { label: '竞标文件', color: 'orange' },
};

const LEVEL_LABEL: Record<string, string> = {
  tech_lead: '技术负责人审核',
  legal: '法务审核',
  bid_director: '投标主管审核',
};

function parseDesc(desc?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!desc) return map;
  for (const part of desc.split(';')) {
    const idx = part.indexOf(':');
    if (idx > 0) map[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return map;
}

function formatSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>();

  const load = useCallback(() => {
    getProject(id).then((d) => setProject(d.project));
    listFiles(id).then((d) => setFiles(d.list || []));
    listRuns(id).then((d) => setRuns(d.list || []));
    listIssues(id, { pageSize: 1000 }).then((d) => setIssues(d.list || []));
    listApprovals(id).then((d) => setApprovals(d.list || []));
    getTimeline(id).then((d) => setVersions((d.list || []).map((v: any) => v.version_no)));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const desc = parseDesc(project?.description);
  const reviewVersions = [...new Set(runs.map((r) => r.version_no))].sort((a, b) => b - a);

  const onReReview = async () => { await runAll(id); message.success('已开始重新审查'); load(); };
  const onSubmitApproval = async () => { try { await submitApproval(id); message.success('已提交审核'); load(); } catch { /* 拦截器已提示 */ } };
  const onArchive = async () => { await archive(id); message.success('已归档'); load(); };

  const verdictOf = (v: number) => {
    const vIssues = issues.filter((i) => i.version_no === v);
    const hasRed = vIssues.some((i) => i.severity === 'red');
    return hasRed ? '不通过' : '通过';
  };

  const downloadPdf = async (versionNo?: number) => {
    try {
      const token = localStorage.getItem('token');
      const url = `/api/projects/${id}/results/pdf` + (versionNo ? `?version_no=${versionNo}` : '');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `审查结果-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(u);
    } catch {
      message.error('下载失败');
    }
  };

  const versionFiles = selectedVersion ? files.filter((f) => f.version_no === selectedVersion) : files;

  const fileColumns = [
    { title: '文件名', dataIndex: 'original_name' },
    { title: '文件类型', dataIndex: 'file_type', render: (t: string) => <Tag color={FILE_TYPE_LABEL[t]?.color}>{FILE_TYPE_LABEL[t]?.label || t}</Tag> },
    { title: '提交时间', dataIndex: 'created_at', render: (t: string) => (t ? new Date(t).toLocaleString() : '-') },
    { title: '文件大小', dataIndex: 'file_size', render: (s: number) => formatSize(s) },
  ];

  const reviewColumns = [
    { title: '审查版本', render: (_: any, v: number) => <b>V{v}</b> },
    { title: '审查结果', render: (_: any, v: number) => <Tag color={verdictOf(v) === '通过' ? 'green' : 'red'}>{verdictOf(v)}</Tag> },
    {
      title: '审查状态',
      render: (_: any, v: number) => {
        const rs = runs.filter((r) => r.version_no === v);
        const ok = rs.length > 0 && rs.every((r) => r.status === 'success');
        return <Tag color={ok ? 'green' : 'red'}>{ok ? '完成' : '部分失败'}</Tag>;
      },
    },
    {
      title: '审查时间',
      render: (_: any, v: number) => {
        const rs = runs.filter((r) => r.version_no === v);
        return rs[0]?.started_at ? new Date(rs[0].started_at).toLocaleString() : '-';
      },
    },
    {
      title: '操作',
      render: (_: any, v: number) => (
        <Space>
          <a onClick={() => navigate(`/projects/${id}/review/${v}`)}>查看</a>
          <a onClick={() => downloadPdf(v)}>下载审查结果</a>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 第一行：基本信息 + 按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>{project?.name || '-'}</Typography.Title>
            <Descriptions column={4} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label="招标方">{project?.bidder || '-'}</Descriptions.Item>
              <Descriptions.Item label="招标金额">{desc['招标金额'] || '-'}</Descriptions.Item>
              <Descriptions.Item label="截止时间">{project?.deadline || '-'}</Descriptions.Item>
              <Descriptions.Item label="我方投标金额">{desc['投标金额'] || '-'}</Descriptions.Item>
              <Descriptions.Item label="竞标方">{desc['竞标方'] || '-'}</Descriptions.Item>
              <Descriptions.Item label="竞标金额">{desc['竞标金额'] || '-'}</Descriptions.Item>
            </Descriptions>
          </div>
          <Space direction="vertical" style={{ width: 140 }}>
            <Button type="primary" block onClick={onReReview}>重新审查</Button>
            <Button block onClick={onSubmitApproval}>提交审核</Button>
            <Button danger block onClick={onArchive}>项目归档</Button>
          </Space>
        </div>
      </Card>

      {/* 第二行：文件列表 */}
      <Card title="文件列表" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 8 }}>
          <Button type={selectedVersion === undefined ? 'primary' : 'default'} size="small" onClick={() => setSelectedVersion(undefined)}>全部</Button>
          {versions.map((v) => (
            <Button key={v} type={selectedVersion === v ? 'primary' : 'default'} size="small" onClick={() => setSelectedVersion(v)}>V{v}</Button>
          ))}
        </Space>
        <Table rowKey="id" columns={fileColumns} dataSource={versionFiles} pagination={false} size="small" />
      </Card>

      {/* 第三行：审查记录 */}
      <Card title="审查记录" style={{ marginBottom: 16 }}>
        <Table rowKey={(r) => String(r)} columns={reviewColumns} dataSource={reviewVersions} pagination={false} size="small" />
      </Card>

      {/* 审核进度 */}
      <Card title="审核进度">
        {approvals.length ? (
          <Timeline
            items={approvals.map((a) => ({
              color: a.decision === 'approved' ? 'green' : 'red',
              children: (
                <div>
                  <b>{LEVEL_LABEL[a.level] || a.level}</b>
                  <Tag style={{ marginLeft: 8 }} color={a.decision === 'approved' ? 'green' : 'red'}>{a.decision === 'approved' ? '已通过' : '已拒绝'}</Tag>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{a.created_at ? new Date(a.created_at).toLocaleString() : ''}</div>
                </div>
              ),
            }))}
          />
        ) : (
          <Typography.Text type="secondary">尚未提交审核</Typography.Text>
        )}
      </Card>
    </div>
  );
}
