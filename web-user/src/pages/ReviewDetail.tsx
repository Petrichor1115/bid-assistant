import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Table, Tag, Tabs, Typography, message } from 'antd';
import { FileWordOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject } from '../api/project';
import { getResults } from '../api/result';
import PdfViewer from '../components/PdfViewer';
import SeverityTag from '../components/SeverityTag';
import type { FileRecord } from '../types';

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  announcement: { label: '招标公告', color: 'blue' },
  our_bid: { label: '我方标书', color: 'green' },
  competitor_bid: { label: '竞品标书', color: 'orange' },
};

const isWord = (name: string) => /\.(doc|docx)$/i.test(name);
const FileIcon = ({ name }: { name: string }) =>
  isWord(name) ? <FileWordOutlined style={{ color: 'var(--primary)' }} /> : <FilePdfOutlined style={{ color: 'var(--danger)' }} />;

export default function ReviewDetail() {
  const { id = '', versionNo = '' } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [results, setResults] = useState<any>(null);
  const [activeFileId, setActiveFileId] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [highlightColor, setHighlightColor] = useState('#f5222d');

  useEffect(() => {
    getProject(id).then((d) => {
      setProject(d.project);
      const fs: FileRecord[] = d.files || [];
      setFiles(fs);
      if (fs.length) setActiveFileId(fs[0].id);
    });
    getResults(id, { version_no: Number(versionNo) }).then(setResults).catch(() => {});
  }, [id, versionNo]);

  const sevOrder = (s: string) => (s === 'red' ? 0 : s === 'yellow' ? 1 : 2);
  const sevBg = (s: string) => (s === 'red' ? '#fdecea' : s === 'yellow' ? '#fdf3e3' : '#eaf7ef');
  const cmpFields = results?.param_compare?.fields || [];
  const cmpOur = results?.param_compare?.our || {};
  const cmpOpp = results?.param_compare?.opponents?.[0]?.params || {};
  const compareRows = cmpFields.map((f: string) => ({ field: f, our: cmpOur[f], opponent: cmpOpp[f] }));
  const hasRed = [...(results?.self_check || []), ...(results?.bid_gaps || [])].some((i: any) => i.severity === 'red')
    || (results?.coverage || []).some((c: any) => c.our_status === 'missing');
  const verdict = results ? (hasRed ? '不通过' : '通过') : '';

  const locate = (fileType: string, text: string, color = '#f5222d') => {
    const f = files.find((u) => u.file_type === fileType);
    if (f) setActiveFileId(f.id);
    setHighlightText(text);
    setHighlightColor(color);
  };

  const downloadPdf = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${id}/results/pdf?version_no=${versionNo}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `审查结果-${id}-V${versionNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const modifyBid = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/projects/${id}/modify-bid`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
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

  return (
    <div style={{ padding: 24, height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none', marginBottom: 16 }}>
        <Button onClick={() => navigate(-1)}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{project?.name || '-'} · V{versionNo}</Typography.Title>
        <Tag color="blue">审查记录</Tag>
      </div>

      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        <Col span={10} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} bodyStyle={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Tabs
              size="small"
              activeKey={activeFileId}
              onChange={setActiveFileId}
              items={files.map((f) => ({
                key: f.id,
                label: <span><FileIcon name={f.original_name} /> {TYPE_LABEL[f.file_type]?.label || f.file_type}</span>,
              }))}
            />
            <PdfViewer fileId={activeFileId} searchText={highlightText} highlightColor={highlightColor} />
          </Card>
        </Col>

        <Col span={14} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} bodyStyle={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>审查结果</span>
              <Tag color={verdict === '通过' ? 'green' : 'red'} style={{ fontSize: 14, fontWeight: 600 }}>{verdict}</Tag>
              <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button size="small" type="primary" onClick={modifyBid}>一键修改</Button>
                <Button size="small" onClick={downloadPdf}>下载审查结果</Button>
              </div>
            </div>
            {results && (
              <Tabs
                size="small"
                style={{ flex: 1 }}
                items={[
                  {
                    key: 'self',
                    label: `自审 ${results.self_check?.length || 0}`,
                    children: (
                      <div style={{ maxHeight: 520, overflow: 'auto' }}>
                        {[...(results.self_check || [])].sort((a: any, b: any) => sevOrder(a.severity) - sevOrder(b.severity)).map((i: any) => (
                          <div key={i.id} onClick={() => locate('our_bid', i.field_key)} style={{ padding: '12px 14px', background: sevBg(i.severity), borderRadius: 8, marginBottom: 8, fontSize: 13, lineHeight: 1.7, cursor: 'pointer' }}>
                            <SeverityTag severity={i.severity} /> <b>{i.field_key}</b> {i.suggestion || i.gap_description}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: 'gap',
                    label: `招标差距 ${(results.coverage || []).filter((c: any) => c.our_status !== 'covered').length}`,
                    children: (
                      <div style={{ maxHeight: 520, overflow: 'auto' }}>
                        {[...(results.coverage || [])].filter((c: any) => c.our_status !== 'covered').sort((a: any, b: any) => sevOrder(a.our_status === 'missing' ? 'red' : 'yellow') - sevOrder(b.our_status === 'missing' ? 'red' : 'yellow')).map((c: any, idx: number) => (
                          <div key={idx} onClick={() => locate('our_bid', c.req_item)} style={{ padding: '12px 14px', background: sevBg(c.our_status === 'missing' ? 'red' : 'yellow'), borderRadius: 8, marginBottom: 8, fontSize: 13, lineHeight: 1.7, cursor: 'pointer' }}>
                            <SeverityTag severity={c.our_status === 'missing' ? 'red' : 'yellow'} /> <b>{c.req_item}</b> {c.evidence}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: 'bid',
                    label: `竞标差距 ${results.bid_gaps?.length || 0}`,
                    children: (
                      <div style={{ maxHeight: 520, overflow: 'auto' }}>
                        {[...(results.bid_gaps || [])].sort((a: any, b: any) => sevOrder(a.severity) - sevOrder(b.severity)).map((i: any) => (
                          <div key={i.id} onClick={() => locate('competitor_bid', i.field_key)} style={{ padding: '12px 14px', background: sevBg(i.severity), borderRadius: 8, marginBottom: 8, fontSize: 13, lineHeight: 1.7, cursor: 'pointer' }}>
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
                        onRow={(record: any) => ({ onClick: () => locate('our_bid', record.field, '#1677ff'), style: { cursor: 'pointer' } })}
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
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
