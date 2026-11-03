import { useEffect, useState } from 'react';

interface Props {
  fileId: string;
  height?: number;
}

/**
 * PDF 预览：带鉴权取流 → blob URL → iframe（隐藏工具栏，像图片展示）。
 */
export default function PdfPreview({ fileId, height = 200 }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/files/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('加载失败');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (error) return <div style={{ color: 'var(--text-3)', fontSize: 12 }}>预览失败</div>;
  if (!url) return <div style={{ color: '#c9cdd4', fontSize: 12 }}>加载中…</div>;
  return (
    <iframe
      src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
      style={{ width: '100%', height, border: '1px solid #f0f1f3', borderRadius: 8, background: '#fff' }}
      title="文件预览"
    />
  );
}
