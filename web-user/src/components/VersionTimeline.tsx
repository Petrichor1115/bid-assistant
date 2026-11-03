import { Timeline } from 'antd';

interface VersionItem {
  version_no: number;
  file_count: number;
  agent_status?: string | null;
  created_at?: string;
}

export default function VersionTimeline({ versions }: { versions: VersionItem[] }) {
  return (
    <Timeline
      items={versions.map((v) => ({
        children: (
          <div>
            <b>V{v.version_no}</b>
            <span style={{ marginLeft: 8, color: '#888' }}>文件 {v.file_count} 份</span>
            {v.agent_status ? <span style={{ marginLeft: 8, color: '#888' }}>· {v.agent_status}</span> : null}
          </div>
        ),
      }))}
    />
  );
}
