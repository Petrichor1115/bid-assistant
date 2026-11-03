import { Tag } from 'antd';

const MAP: Record<string, { color: string; label: string }> = {
  covered: { color: 'green', label: '✅ 已覆盖' },
  missing: { color: 'red', label: '❌ 缺失' },
  not_met: { color: 'orange', label: '⚠️ 不满足' },
};

export default function CoverageTag({ status }: { status: string }) {
  const m = MAP[status] || { color: 'default', label: status };
  return <Tag color={m.color}>{m.label}</Tag>;
}
