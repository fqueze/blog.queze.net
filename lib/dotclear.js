// Helpers reproducing Dotclear 2.6 / Clearbricks behaviors.

// PHP's rawurlencode, keeping slashes (Dotclear's html::sanitizeURL).
export const encode = s => encodeURIComponent(s)
  .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  .replace(/%2F/g, '/');
export const escapeHTML = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Dates: Dotclear stores post_dt/comment_dt as local wall time in their timezone.
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                'September', 'October', 'November', 'December'];
const pad = n => String(n).padStart(2, '0');
// "YYYY-MM-DD HH:MM:SS" read as if it were UTC, like PHP's strtotime with TZ=UTC.
export const ts = dt => Date.parse(dt.replace(' ', 'T') + 'Z');
// Offset in seconds of timezone tz at UTC timestamp t (Dotclear's dt::getTimeOffset).
export function tzOffset(tz, t) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(t));
  const get = type => +parts.find(p => p.type === type).value;
  return (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'),
                   get('second')) - t) / 1000;
}
export function strftime(format, t) {
  const d = new Date(t);
  return format.replace(/%([a-zA-Z%])/g, (m, c) => ({
    a: DAYS[d.getUTCDay()].slice(0, 3), A: DAYS[d.getUTCDay()],
    b: MONTHS[d.getUTCMonth()].slice(0, 3), B: MONTHS[d.getUTCMonth()],
    d: pad(d.getUTCDate()), e: String(d.getUTCDate()).padStart(2, ' '),
    m: pad(d.getUTCMonth() + 1), Y: d.getUTCFullYear(),
    H: pad(d.getUTCHours()), M: pad(d.getUTCMinutes()), S: pad(d.getUTCSeconds()), '%': '%',
  })[c] ?? m);
}
const offsetString = (o, sep) =>
  (o < 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 3600)) + sep + pad(Math.abs(o) % 3600 / 60);
export const iso8601 = (t, tz) => strftime('%Y-%m-%dT%H:%M:%S', t) + offsetString(tzOffset(tz, t), ':');
export const rfc822 = (t, tz) => strftime('%a, %d %b %Y %H:%M:%S ', t) + offsetString(tzOffset(tz, t), '');

// Dotclear's text::cutString: cut at a word boundary.
export function cutString(str, l) {
  const words = str.split(/(\s+)/u);
  if ([...words[0]].length >= l) return [...words[0]].slice(0, l).join('');
  let res = '';
  for (const w of words) {
    if ([...res].length + [...w].length > l) break;
    res += w;
  }
  return res.trim();
}


// Dotclear's html::absoluteURLs, used in feeds.
export function absoluteURLs(html, root) {
  const host = root.replace(/^([a-z]{3,}:\/\/)(.*?)\/(.*)$/, '$1$2');
  return html.replace(
    /((?:action|background|cite|classid|codebase|data|href|longdesc|profile|src|usemap)=")(.*?)(")/gs,
    (m, before, url, after) => {
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) && !url.startsWith('//')) {
        if (url.startsWith('/')) url = host + url;
        else if (url.startsWith('#')) url = root + url;
        else if (root.endsWith('/')) url = root + url;
        else url = root.replace(/\/[^/]*$/, '') + '/' + url;
      }
      return before + url + after;
    });
}
