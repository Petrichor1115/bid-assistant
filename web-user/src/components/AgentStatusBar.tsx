import { Steps } from 'antd';
import type { AgentRun } from '../types';

const MAIN = ['parse_announcement', 'parse_document', 'quality_check', 'requirement_coverage', 'bid_compare'];
const LABELS: Record<string, string> = {
  parse_announcement: '招标公告解析',
  parse_document: '文档解析',
  quality_check: '质量自审',
  requirement_coverage: '要求覆盖度',
  bid_compare: '竞标对比',
};

export default function AgentStatusBar({ runs }: { runs: AgentRun[] }) {
  const statusOf = (name: string): 'wait' | 'process' | 'finish' | 'error' => {
    const list = runs.filter((r) => r.agent_name === name);
    if (!list.length) return 'wait';
    if (list.some((r) => r.status === 'failed')) return 'error';
    if (list.some((r) => r.status === 'running')) return 'process';
    if (list.every((r) => r.status === 'success')) return 'finish';
    return 'wait';
  };

  return (
    <Steps
      size="small"
      items={MAIN.map((name) => ({ title: LABELS[name], status: statusOf(name) }))}
    />
  );
}
