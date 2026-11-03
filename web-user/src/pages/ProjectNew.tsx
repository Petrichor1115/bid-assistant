import { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, DatePicker, Input, InputNumber, Row, Spin, Table, Tag, Tabs, Typography, Upload, message } from 'antd';
import {
  InboxOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { identifyFiles, uploadFile } from '../api/file';
import { createProject } from '../api/project';
import { runAll, listRuns } from '../api/agent';
import { getResults } from '../api/result';
import PdfViewer from '../components/PdfViewer';
import SeverityTag from '../components/SeverityTag';
import type { AgentRun, FileRecord } from '../types';

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  announcement: { label: '招标公告', color: 'blue' },
  our_bid: { label: '我方标书', color: 'green' },
  competitor_bid: { label: '竞品标书', color: 'orange' },
};

const REVIEW_STEPS = [
  { key: 'extract', label: '文件信息提取' },
  { key: 'self', label: '投标文件审查' },
  { key: 'coverage', label: '招标文件对比' },
  { key: 'compare', label: '竞标文件对比' },
];

interface IdentifiedFile { original_name: string; file_type: string; size: number; }

const EMPTY_INFO = {
  name: '', bidder: '', tender_amount: '', deadline: '',
  our_company: '', our_amount: '', competitor: '', competitor_amount: '',
};

const isWord = (name: string) => /\.(doc|docx)$/i.test(name);
const FileIcon = ({ name }: { name: string }) =>
  isWord(name) ? <FileWordOutlined style={{ color: 'var(--primary)' }} /> : <FilePdfOutlined style={{ color: 'var(--danger)' }} />;

export default function ProjectNew() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [identified, setIdentified] = useState<IdentifiedFile[]>([]);
  const [info, setInfo] = useState(EMPTY_INFO);
  const [identifying, setIdentifying] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [projectId, setProjectId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<FileRecord[]>([]);
  const [activeFileId, setActiveFileId] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [highlightColor, setHighlightColor] = useState('#f5222d');
  const [steps, setSteps] = useState<{ key: string; label: string; done: boolean }[]>(
    REVIEW_STEPS.map((s) => ({ ...s, done: false }))
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const setField = (k: string, v: string | number | undefined) => setInfo((s) => ({ ...s, [k]: v }));

  const onUpload = async (incoming: File[]) => {
    if (!incoming.length) return;
    const combined = [...files, ...incoming];
    setFiles(combined);
    setIdentifying(true);
    try {
      const d = await identifyFiles(combined);
      setIdentified(d.files || []);
      const p = d.project || {};
      setInfo({
        name: p.name || '', bidder: p.bidder || '', tender_amount: p.tender_amount || '',
        deadline: p.deadline || '', our_company: p.our_company || '', our_amount: p.our_amount || '',
        competitor: p.competitor || '', competitor_amount: p.competitor_amount || '',
      });
    } catch {
      message.error('文件识别失败');
    } finally {
      setIdentifying(false);
    }
  };

  const removeFile = (name: string) => {
    setFiles((fs) => fs.filter((f) => f.name !== name));
    setIdentified((list) => list.filter((i) => i.original_name !== name));
  };

  const updateSteps = (runs: AgentRun[]) => {
    const hasSuccess = (name: string) => runs.some((r) => r.agent_name === name && r.status === 'success');
    setSteps([
      { key: 'extract', label: '文件信息提取', done: hasSuccess('parse_announcement') && hasSuccess('parse_document') },
      { key: 'self', label: '投标文件审查', done: hasSuccess('quality_check') },
      { key: 'coverage', label: '招标文件对比', done: hasSuccess('requirement_coverage') },
      { key: 'compare', label: '竞标文件对比', done: hasSuccess('bid_compare') },
    ]);
  };

  const pollRuns = (pid: string) => {
    timerRef.current = setInterval(async () => {
      try {
        const d = await listRuns(pid);
        const runs: AgentRun[] = d.list || [];
        updateSteps(runs);
        const allDone = runs.some((r) => r.agent_name === 'parse_announcement' && r.status === 'success') &&
          runs.some((r) => r.agent_name === 'parse_document' && r.status === 'success') &&
          runs.some((r) => r.agent_name === 'quality_check' && r.status === 'success') &&
          runs.some((r) => r.agent_name === 'requirement_coverage' && r.status === 'success') &&
          runs.some((r) => r.agent_name === 'bid_compare' && r.status === 'success');
        if (allDone) {
          if (timerRef.current) clearInterval(timerRef.current);
          const res = await getResults(pid);
          setReviewResult(res);
          setReviewStatus('done');
        }
      } catch {
        // 忽略轮询错误
      }
    }, 1500);
  };

  const onReview = async () => {
    if (!files.length) {
      message.warning('请先上传文件');
      return;
    }
    setReviewStatus('running');
    setSteps(REVIEW_STEPS.map((s) => ({ ...s, done: false })));
    try {
      const desc = [
        info.tender_amount ? `招标金额:${info.tender_amount}` : '',
        info.our_company ? `投标方:${info.our_company}` : '',
        info.our_amount ? `投标金额:${info.our_amount}` : '',
        info.competitor ? `竞标方:${info.competitor}` : '',
        info.competitor_amount ? `竞标金额:${info.competitor_amount}` : '',
      ].filter(Boolean).join('; ');

      const { project } = await createProject({
        name: info.name || '未命名项目',
        bidder: info.bidder || undefined,
        deadline: info.deadline || undefined,
        description: desc || undefined,
      });
      const uploaded: FileRecord[] = [];
      for (const f of files) {
        const type = identified.find((i) => i.original_name === f.name)?.file_type || 'our_bid';
        const d = await uploadFile(project.id, f, type);
        uploaded.push(d.file);
      }
      setProjectId(project.id);
      setUploadedFiles(uploaded);
      if (uploaded.length) setActiveFileId(uploaded[0].id);

      await runAll(project.id); // 异步，立即返回
      pollRuns(project.id);
    } catch {
      setReviewStatus('idle');
      message.error('审查启动失败，请重试');
    }
  };

  const locateInFile = (fileType: string, text: string, color = '#f5222d') => {
    const f = uploadedFiles.find((u) => u.file_type === fileType);
    if (f) setActiveFileId(f.id);
    setHighlightText(text);
    setHighlightColor(color);
  };

  const downloadResultsPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${projectId}/results/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `审查结果-${projectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const modifyBid = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${projectId}/modify-bid`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '修改后的我方标书.pdf';
      a.click();
      URL.revokeObjectURL(url);
      message.success('修改完成，已下载');
    } catch {
      message.error('修改失败');
    }
  };

  const field = (label: string, key: keyof typeof EMPTY_INFO, node: React.ReactNode) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      {node}
    </div>
  );

  const sevOrder = (s: string) => (s === 'red' ? 0 : s === 'yellow' ? 1 : 2);
  const sevBg = (s: string) => (s === 'red' ? '#fdecea' : s === 'yellow' ? '#fdf3e3' : '#eaf7ef');
  const cmpFields = reviewResult?.param_compare?.fields || [];
  const cmpOur = reviewResult?.param_compare?.our || {};
  const cmpOpp = reviewResult?.param_compare?.opponents?.[0]?.params || {};
  const compareRows = cmpFields.map((f: string) => ({ field: f, our: cmpOur[f], opponent: cmpOpp[f] }));
  const hasRed = [...(reviewResult?.self_check || []), ...(reviewResult?.bid_gaps || [])].some((i: any) => i.severity === 'red')
    || (reviewResult?.coverage || []).some((c: any) => c.our_status === 'missing');
  const verdict = reviewResult ? (hasRed ? '不通过' : '通过') : '';

  return (
    <div style={{ padding: 24, height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 'none', marginBottom: 12 }}>
        <span className="brand-mark">投</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>投标智能助手</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>竞标对比系统</div>
        </div>
      </div>
      <Typography.Title level={4} style={{ margin: '0 0 16px', flex: 'none' }}>新建项目</Typography.Title>
      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* 左列：文件上传 */}
        <Col span={8} style={{ height: '100%' }}>
          <Card title="文件上传" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, overflow: 'auto' }}>
            <Upload.Dragger
              multiple
              accept=".pdf,.doc,.docx"
              beforeUpload={() => false}
              fileList={[]}
              showUploadList={false}
              onChange={(e) => onUpload(e.fileList.map((f) => f.originFileObj as File).filter(Boolean))}
              className="upload-compact"
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 2, height: 16, lineHeight: '16px' }}>
                <InboxOutlined style={{ fontSize: 16 }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 12, margin: 0 }}>点击或拖拽文件上传</p>
            </Upload.Dragger>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
              需上传招标文件、标书和竞品标书三方文件（PDF / Word）
            </div>

            <Spin spinning={identifying} tip="识别中…">
              <div style={{ marginTop: 16 }}>
                {identified.map((f) => (
                  <div key={f.original_name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f0f1f3' }}>
                    <FileIcon name={f.original_name} />
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</span>
                    <Tag color={TYPE_LABEL[f.file_type]?.color}>{TYPE_LABEL[f.file_type]?.label || f.file_type}</Tag>
                    <DeleteOutlined style={{ color: 'var(--text-3)', cursor: 'pointer' }} onClick={() => removeFile(f.original_name)} />
                  </div>
                ))}
              </div>
            </Spin>

            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>项目信息</Typography.Text>
              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={12}>{field('项目名称', 'name', <Input size="small" value={info.name} onChange={(e) => setField('name', e.target.value)} />)}</Col>
                <Col span={12}>{field('招标方', 'bidder', <Input size="small" value={info.bidder} onChange={(e) => setField('bidder', e.target.value)} />)}</Col>
                <Col span={12}>{field('招标金额', 'tender_amount', <InputNumber size="small" style={{ width: '100%' }} value={info.tender_amount ? Number(info.tender_amount) : undefined} onChange={(v) => setField('tender_amount', v ?? undefined)} />)}</Col>
                <Col span={12}>{field('截止时间', 'deadline', <DatePicker size="small" style={{ width: '100%' }} value={info.deadline ? dayjs(info.deadline) : null} onChange={(d) => setField('deadline', d ? d.format('YYYY-MM-DD') : '')} />)}</Col>
                <Col span={12}>{field('投标方', 'our_company', <Input size="small" value={info.our_company} onChange={(e) => setField('our_company', e.target.value)} />)}</Col>
                <Col span={12}>{field('投标金额', 'our_amount', <InputNumber size="small" style={{ width: '100%' }} value={info.our_amount ? Number(info.our_amount) : undefined} onChange={(v) => setField('our_amount', v ?? undefined)} />)}</Col>
                <Col span={12}>{field('竞标方', 'competitor', <Input size="small" value={info.competitor} onChange={(e) => setField('competitor', e.target.value)} />)}</Col>
                <Col span={12}>{field('竞标金额', 'competitor_amount', <InputNumber size="small" style={{ width: '100%' }} value={info.competitor_amount ? Number(info.competitor_amount) : undefined} onChange={(v) => setField('competitor_amount', v ?? undefined)} />)}</Col>
              </Row>
            </div>

            <Button type="primary" block size="large" style={{ marginTop: 16, borderRadius: 8 }} onClick={onReview} loading={reviewStatus === 'running'}>
              一键审查
            </Button>
          </Card>
        </Col>

        {/* 右列：审查窗口 */}
        <Col span={16} style={{ height: '100%' }}>
          <Card title="审查窗口" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, overflow: 'auto' }}>
            {reviewStatus === 'idle' && (
              <div style={{ textAlign: 'center', paddingTop: 120 }}>
                <InboxOutlined style={{ fontSize: 56, color: '#c9cdd4' }} />
                <div style={{ marginTop: 16, color: 'var(--text-3)' }}>等待文件上传中</div>
              </div>
            )}

            {reviewStatus === 'running' && (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: 'var(--text-3)' }}>审查中，请稍候…</div>
                <div style={{ marginTop: 28, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', textAlign: 'left' }}>
                  {steps.map((s) => (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid #f0f1f3' }}>
                      {s.done
                        ? <CheckCircleOutlined style={{ color: '#00b42a', fontSize: 18 }} />
                        : <ClockCircleOutlined style={{ color: '#c9cdd4', fontSize: 18 }} />}
                      <span style={{ fontSize: 14, color: s.done ? '#1d2129' : 'var(--text-3)' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewStatus === 'done' && reviewResult && (
              <Row gutter={16} style={{ height: '100%' }}>
                {/* 左：审查文件（三行：切换/大图/缩略图） */}
                <Col span={10} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Tabs
                    size="small"
                    activeKey={activeFileId}
                    onChange={setActiveFileId}
                    items={uploadedFiles.map((f) => ({
                      key: f.id,
                      label: (
                        <span>
                          <FileIcon name={f.original_name} /> {TYPE_LABEL[f.file_type]?.label || f.file_type}
                        </span>
                      ),
                    }))}
                  />
                  <PdfViewer fileId={activeFileId || uploadedFiles[0]?.id} searchText={highlightText} highlightColor={highlightColor} />
                </Col>

                {/* 右：审查结果（三行：结论/分类切换/问题列表） */}
                <Col span={14} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>审查结果</span>
                    <Tag color={verdict === '通过' ? 'green' : 'red'} style={{ fontSize: 14, fontWeight: 600 }}>{verdict}</Tag>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Button size="small" type="primary" onClick={modifyBid}>一键修改</Button>
                      <Button size="small" onClick={downloadResultsPdf}>下载审查结果</Button>
                    </div>
                  </div>
                  <Tabs
                    size="small"
                    style={{ flex: 1 }}
                    items={[
                      {
                        key: 'self',
                        label: `自审 ${reviewResult.self_check?.length || 0}`,
                        children: (
                          <div style={{ maxHeight: 520, overflow: 'auto' }}>
                            {[...(reviewResult.self_check || [])].sort((a: any, b: any) => sevOrder(a.severity) - sevOrder(b.severity)).map((i: any) => (
                              <div key={i.id} onClick={() => locateInFile('our_bid', i.field_key)} style={{ padding: '12px 14px', background: sevBg(i.severity), borderRadius: 8, marginBottom: 8, fontSize: 13, lineHeight: 1.7, cursor: 'pointer' }}>
                                <SeverityTag severity={i.severity} /> <b>{i.field_key}</b> {i.suggestion || i.gap_description}
                              </div>
                            ))}
                          </div>
                        ),
                      },
                      {
                        key: 'gap',
                        label: `招标差距 ${(reviewResult.coverage || []).filter((c: any) => c.our_status !== 'covered').length}`,
                        children: (
                          <div style={{ maxHeight: 520, overflow: 'auto' }}>
                            {[...(reviewResult.coverage || [])].filter((c: any) => c.our_status !== 'covered').sort((a: any, b: any) => sevOrder(a.our_status === 'missing' ? 'red' : 'yellow') - sevOrder(b.our_status === 'missing' ? 'red' : 'yellow')).map((c: any, idx: number) => (
                              <div key={idx} onClick={() => locateInFile('our_bid', c.req_item)} style={{ padding: '12px 14px', background: sevBg(c.our_status === 'missing' ? 'red' : 'yellow'), borderRadius: 8, marginBottom: 8, fontSize: 13, lineHeight: 1.7, cursor: 'pointer' }}>
                                <SeverityTag severity={c.our_status === 'missing' ? 'red' : 'yellow'} /> <b>{c.req_item}</b> {c.evidence}
                              </div>
                            ))}
                          </div>
                        ),
                      },
                      {
                        key: 'bid',
                        label: `竞标差距 ${reviewResult.bid_gaps?.length || 0}`,
                        children: (
                          <div style={{ maxHeight: 520, overflow: 'auto' }}>
                            {[...(reviewResult.bid_gaps || [])].sort((a: any, b: any) => sevOrder(a.severity) - sevOrder(b.severity)).map((i: any) => (
                              <div key={i.id} onClick={() => locateInFile('competitor_bid', i.field_key)} style={{ padding: '12px 14px', background: sevBg(i.severity), borderRadius: 8, marginBottom: 8, fontSize: 13, lineHeight: 1.7, cursor: 'pointer' }}>
                                <SeverityTag severity={i.severity} /> <b>{i.field_key}</b> {i.gap_description || i.suggestion}
                              </div>
                            ))}
                          </div>
                        ),
                      },
                      {
                        key: 'compare',
                        label: '对比表格',
                        children: (
                          <Table
                            size="small"
                            rowKey="field"
                            pagination={false}
                            onRow={(record: any) => ({ onClick: () => locateInFile('our_bid', record.field, '#1677ff'), style: { cursor: 'pointer' } })}
                            columns={[
                              { title: '参数名', dataIndex: 'field', render: (v: any) => <a>{v}</a> },
                              { title: '我方参数', dataIndex: 'our', render: (v: any) => String(v ?? '-') },
                              { title: '竞标参数', dataIndex: 'opponent', render: (v: any) => String(v ?? '-') },
                            ]}
                            dataSource={compareRows}
                          />
                        ),
                      },
                    ]}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
