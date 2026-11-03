interface Props {
  icon: string;
  name: string;
}

export default function TenderCard({ icon, name }: Props) {
  return (
    <div
      style={{
        border: '1px solid var(--border-light)',
        borderRadius: 8,
        padding: 10,
        flex: '1 1 0',
        minWidth: 96,
        height: 112,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        background: 'var(--bg-card)',
      }}
    >
      <img src={icon} alt={name} style={{ width: 32, height: 32, marginBottom: 8 }} />
      <div style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.5 }}>{name}</div>
    </div>
  );
}
