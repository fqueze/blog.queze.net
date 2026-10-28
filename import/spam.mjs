// Spam heuristics shared by review-comments.mjs and floblog.mjs.
// c: { content, author, site, me, dt }, post: { title, content, dt }.
// A score >= 2 means likely spam.

export const text = html => (html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ')
                                 .replace(/\s+/g, ' ').trim();
const STOP = new Set(('about above after again against because before being below between could ' +
  'doing during every first further having other really should their theirs there these ' +
  'those through under until where which while would yours always never still since ' +
  'think thing things people something'). split(' '));
const words = s => new Set((s.toLowerCase().match(/\p{L}{5,}/gu) || []).filter(w => !STOP.has(w)));

const KEYWORDS = /\b(casino|poker|slots?|betting|viagra|cialis|pharma\w*|adult|nude|porn\w*|sex\w*|webcams?|escort|lingerie|dating|loans?|insurance|dentist|replica|crypto|bitcoin|forex|vpn|torrent|seo|download)\b/gi;
const PHRASES = /(resist commenting|perfectly written|surfing online|worth enough for me|webmasters and bloggers|great article|nice post|keep up the good work|thanks for sharing|url=\[|\[url)/gi;
const SUSPICIOUS_URL = /(facebook\.com|youtube\.com|drive\.google\.com|goo\.gl|bit\.ly|duckdns|\.xyz\b|\.vin\b|lnwshop|wordpress\.com\/\d{4}|^https?:\/\/\d+\.\d+\.\d+\.\d+)/i;

export function spamCheck(c, post) {
  const reasons = [];
  let score = 0;
  const add = (points, reason) => { score += points; reasons.push(reason); };
  if (c.me) return { score, reasons };
  const body = text(c.content);

  const links = (c.content.match(/<a\s/g) || []).length;
  if (links >= 10) add(3, `${links} links`);
  else if (links >= 3) add(1, `${links} links`);

  const keywords = [...new Set([...(body + ' ' + c.author).matchAll(KEYWORDS)].map(m => m[0].toLowerCase()))];
  if (keywords.length) add(2, `spam keywords: ${keywords.join(', ')}`);

  const phrases = [...new Set([...c.content.matchAll(PHRASES)].map(m => m[0].toLowerCase()))];
  if (phrases.length) add(2, `spam phrases: ${phrases.join(', ')}`);

  const site = (c.site || '').trim();
  if (site && (/^[\p{Ll}\d]+( [\p{Ll}\d]+)?$/u.test(c.author) ||
               /\.\w{2,4}$|^\d+\.\d+\.\d+\.\d+$/.test(c.author)))
    add(1, `generic author name with a website: ${c.author}`);
  if (site && SUSPICIOUS_URL.test(site))
    add(1, `suspicious author URL: ${site}`);
  else if (site && new URL(site).pathname.length > 30)
    add(1, `author URL to a deep page: ${site}`);

  const commentWords = words(body);
  if (commentWords.size >= 8) {
    const postWords = words(post.title + ' ' + text(post.content));
    const shared = [...commentWords].filter(w => postWords.has(w)).length;
    if (shared / commentWords.size < 0.15)
      add(1, `unrelated to the post (${shared}/${commentWords.size} words in common)`);
  }

  const years = (Date.parse(c.dt) - Date.parse(post.dt)) / (365.25 * 24 * 3600 * 1000);
  if (years > 2) add(1, `posted ${Math.floor(years)} years after the post`);

  return { score, reasons };
}

