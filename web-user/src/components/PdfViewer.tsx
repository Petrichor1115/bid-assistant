import { useEffect, useState } from 'react';

interface TextItem { str: string; x: number; y: number; w: number; h: number; }
interface PageInfo { url: string; width: number; height: number; items: TextItem[]; }

interface Props {
  fileId: string;
  searchText?: string;
  highlightColor?: string;
}

let workerReady = false;

/**
 * PDF 查看器：渲染所有页 → 当前页大图 + 底部缩略图；支持按文本红框高亮。
 */
export default function PdfViewer({ fileId, searchText, highlightColor = '#f5222d' }: Props) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPages([]);
    setCurrent(0);

    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist');
        if (!workerReady) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
          workerReady = true;
        }
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/files/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('加载失败');
        const buf = await res.arrayBuffer();
        const task = pdfjs.getDocument({ data: new Uint8Array(buf) });
        const doc = await task.promise;

        const list: PageInfo[] = [];
        const scale = 1.5;
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

          const tc = await page.getTextContent();
          const items: TextItem[] = tc.items
            .filter((it: any) => typeof it.str === 'string' && it.str.trim())
            .map((it: any) => ({
              str: it.str,
              x: it.transform[4] * scale,
              y: viewport.height - it.transform[5] * scale - (it.height || 12) * scale,
              w: (it.width || 20) * scale,
              h: (it.height || 12) * scale,
            }));

          list.push({ url: canvas.toDataURL('image/png'), width: viewport.width, height: viewport.height, items });
        }
        await doc.destroy();
        if (!cancelled) setPages(list);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fileId]);

  const words = (searchText || '').toLowerCase().replace(/_/g, ' ').split(/\s+/).filter(Boolean);
  const page = pages[current];
  const matched = page && words.length
    ? page.items.filter((it) => words.some((w) => it.str.toLowerCase().includes(w)))
    : [];

  if (error) return <div style={{ color: 'var(--text-3)', fontSize: 12 }}>预览失败</div>;
  if (loading) return <div style={{ color: '#c9cdd4', fontSize: 12 }}>加载中…</div>;
  if (!pages.length) return <div style={{ color: 'var(--text-3)', fontSize: 12 }}>无页面</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* 当前页大图 + 红框高亮 */}
      <div style={{ position: 'relative', border: '1px solid #f0f1f3', borderRadius: 8, overflow: 'hidden', background: '#fafbfc', flex: 1, minHeight: 0 }}>
        <img src={page.url} alt={`第 ${current + 1} 页`} style={{ width: '100%', display: 'block' }} />
        {matched.length > 0 && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox={`0 0 ${page.width} ${page.height}`}
            preserveAspectRatio="none"
          >
            {matched.map((it, i) => (
              <rect key={i} x={it.x} y={it.y} width={it.w} height={it.h} fill="none" stroke={highlightColor} strokeWidth={2.5} />
            ))}
          </svg>
        )}
      </div>

      {/* 缩略图 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 4, flex: 'none' }}>
        {pages.map((p, i) => (
          <img
            key={i}
            src={p.url}
            alt={`缩略图 ${i + 1}`}
            onClick={() => setCurrent(i)}
            style={{
              width: 48,
              height: 60,
              objectFit: 'cover',
              cursor: 'pointer',
              border: i === current ? '2px solid var(--primary)' : '1px solid #e5e6eb',
              borderRadius: 4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
