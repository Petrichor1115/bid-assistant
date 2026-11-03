import { Card, Button, Space, Typography } from 'antd';
import type { Recommendation } from '../types';

interface Props {
  recommendation: Recommendation;
  onAdopt: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function RecommendationCard({ recommendation, onAdopt, onDismiss }: Props) {
  return (
    <Card size="small" style={{ marginBottom: 8 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Text strong>{recommendation.company_name}</Typography.Text>
          <Typography.Text type="secondary">匹配度 {(recommendation.match_score * 100).toFixed(0)}%</Typography.Text>
        </Space>
        <Typography.Text type="secondary">{recommendation.recommendation_reason}</Typography.Text>
        <Space>
          {recommendation.status === 'recommended' && (
            <>
              <Button size="small" type="primary" onClick={() => onAdopt(recommendation.id)}>采用</Button>
              <Button size="small" onClick={() => onDismiss(recommendation.id)}>放弃</Button>
            </>
          )}
          {recommendation.status === 'adopted' && <Typography.Text type="success">已采用</Typography.Text>}
          {recommendation.status === 'dismissed' && <Typography.Text type="secondary">已放弃</Typography.Text>}
        </Space>
      </Space>
    </Card>
  );
}
