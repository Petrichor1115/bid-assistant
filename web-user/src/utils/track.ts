/**
 * 统一埋点函数：事件命名 {模块}_{动作}，MVP 本地 console/存储。
 */
export function track(event: string, params?: Record<string, unknown>) {
  const payload = {
    event,
    ts: Date.now(),
    user_id: JSON.parse(localStorage.getItem('user') || 'null')?.id,
    ...params,
  };
  console.log('[track]', payload);
  try {
    const arr = JSON.parse(localStorage.getItem('__track') || '[]');
    arr.push(payload);
    localStorage.setItem('__track', JSON.stringify(arr.slice(-100)));
  } catch {
    // ignore
  }
}
