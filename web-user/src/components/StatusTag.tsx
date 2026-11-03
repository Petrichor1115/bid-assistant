import { Tag } from 'antd';

const MAP: Record<string, string> = {
  draft: 'default',
  in_progress: 'blue',
  awaiting_approval: 'orange',
  approved: 'green',
  archived: 'default',
  rejected: 'red',
};

export default function StatusTag({ status }: { status: string }) {
  return <Tag color={MAP[status] || 'default'}>{status}</Tag>;
}
