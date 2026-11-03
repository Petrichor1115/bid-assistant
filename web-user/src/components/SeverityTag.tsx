import { Tag } from 'antd';

const MAP: Record<string, { color: string; label: string }> = {
  red: { color: 'red', label: '🔴 致命' },
  yellow: { color: 'gold', label: '🟡 重要' },
  green: { color: 'green', label: '🟢 次要' },
};

export default function SeverityTag({ severity }: { severity: string }) {
  const m = MAP[severity] || { color: 'default', label: severity };
  return <Tag color={m.color}>{m.label}</Tag>;
}
