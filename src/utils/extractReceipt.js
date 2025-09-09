export async function extractReceipt(base64Receipt) {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Receipt }),
  });

  const raw = await res.text().catch(() => '');
  if (!res.ok) {
    console.error('[extractReceipt] HTTP', res.status, raw);
    try {
      const { error, details } = JSON.parse(raw || '{}');
      throw new Error(details || error || 'extract failed');
    } catch {
      throw new Error(raw || 'extract failed');
    }
  }

  try {
    const { text } = JSON.parse(raw);
    return text;
  } catch {
    console.error('[extractReceipt] Non-JSON success payload:', raw);
    return raw;
  }
}
