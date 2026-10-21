// Shared rounds board, stored in Vercel Blob.
// Each score is its own blob, so simultaneous submissions never overwrite each other.
// Everything the board shows is encoded in the pathname, so GET needs only one list() call.
//   scores/<9999999 - score>-<time in centiseconds>-<right>-<id>-<base64url name>
const { put, list } = require('@vercel/blob');

const PREFIX = 'scores/';
const TOTAL = 10, MAX_SCORE = 10 * 50 + 10 * 300 + 2000;
const pad = (n, w) => String(n).padStart(w, '0');
const enc = s => Buffer.from(s, 'utf8').toString('base64url');
const dec = s => Buffer.from(s, 'base64url').toString('utf8');

function parse(pathname){
  const parts = pathname.slice(PREFIX.length).split('-');
  if(parts.length < 5) return null;
  const [inv, cs, right, id] = parts, name = dec(parts.slice(4).join('-'));
  return { id, name, score: 9999999 - Number(inv), time: Number(cs) / 100, right: Number(right) };
}

async function top(limit){
  const rows = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for(const b of page.blobs){ const r = parse(b.pathname); if(r) rows.push(r); }
    cursor = page.hasMore ? page.cursor : undefined;
  } while(cursor && rows.length < 10000);
  rows.sort((a, b) => b.score - a.score || a.time - b.time);
  return { rows: rows.slice(0, limit), count: rows.length };
}

module.exports = async (req, res) => {
  try {
    if(req.method === 'GET'){
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 8));
      const { rows, count } = await top(limit);
      res.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=10');
      return res.status(200).json({ scores: rows, count });
    }
    if(req.method === 'POST'){
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const name = String(b.name || 'Apple').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 14) || 'Apple';
      const score = Math.round(Number(b.score)), right = Math.round(Number(b.right)), time = Number(b.time);
      if(!(score >= 0 && score <= MAX_SCORE) || !(right >= 0 && right <= TOTAL) || !(time > 0 && time < 100000)){
        return res.status(400).json({ error: 'Invalid score' });
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const pathname = `${PREFIX}${pad(9999999 - score, 7)}-${pad(Math.round(time * 100), 7)}-${pad(right, 2)}-${id}-${enc(name)}`;
      await put(pathname, JSON.stringify({ name, score, right, time, at: new Date().toISOString() }), {
        access: 'private', addRandomSuffix: false, contentType: 'application/json'
      });
      const { rows, count } = await top(8);
      const rank = rows.findIndex(r => r.id === id);
      return res.status(201).json({ id, scores: rows, count, rank: rank >= 0 ? rank + 1 : null });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch(e){
    console.error(e);
    return res.status(500).json({ error: 'Board unavailable' });
  }
};
