import { useEffect, useState } from 'react';
import { Button, Card, Descriptions, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { getReport, pdfUrl } from '../api/report';
import { getTimeline } from '../api/project';
import VersionTimeline from '../components/VersionTimeline';

export default function ProjectReport() {
  const { id = '' } = useParams();
  const [report, setReport] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    getReport(id).then((d) => setReport(d.report)).catch(() => {});
    getTimeline(id).then((d) => setTimeline(d.list || []));
  }, [id]);

  return (
    <Card title="项目总报告" extra={report ? <Button type="primary" icon={<DownloadOutlined />} href={pdfUrl(id)} target="_blank">导出 PDF</Button> : null}>
      {report ? (
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="总版本数">{report.total_versions}</Descriptions.Item>
          <Descriptions.Item label="累计耗时(小时)">{report.total_duration_hours}</Descriptions.Item>
          <Descriptions.Item label="自审问题">{report.self_check_issue_count}</Descriptions.Item>
          <Descriptions.Item label="招标差距">{report.requirement_gap_count}</Descriptions.Item>
          <Descriptions.Item label="竞标差距">{report.bid_gap_count}</Descriptions.Item>
          <Descriptions.Item label="摘要" span={2}><Typography.Text>{report.final_summary}</Typography.Text></Descriptions.Item>
        </Descriptions>
      ) : (
        <Typography.Text type="secondary">尚未归档，暂无报告。请先在项目详情中「提交审批」并「项目归档」。</Typography.Text>
      )}
      <Card title="版本时间线" style={{ marginTop: 16 }} size="small">
        <VersionTimeline versions={timeline} />
      </Card>
    </Card>
  );
}
