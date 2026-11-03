import { message } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  label: ReactNode;
  icon?: ReactNode;
}

export default function GreyedItem({ label, icon }: Props) {
  return (
    <div
      onClick={() => message.info('敬请期待')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 6,
        color: '#1d2129',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontSize: 16, display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}
