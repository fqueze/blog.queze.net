import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import site from './_data/site.js';
import { buildBlog } from './lib/blog.js';
import { cutString, escapeHTML } from './lib/dotclear.js';

export default function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });

  for (const path of ['pict', 'smileys', 'public', 'themes', 'feed/rss2.xsl', 'CNAME', '.nojekyll'])
    eleventyConfig.addPassthroughCopy(path);

  // Everything the listings, archives and feeds need, computed from the posts.
  eleventyConfig.addCollection('blog', api => buildBlog(api.getFilteredByGlob('posts/*.md'), site));

  // Old URLs have no extension: /post/2017/12/05/foo is served by GitHub
  // Pages from post/2017/12/05/foo.html.
  eleventyConfig.addFilter('htmlFile', path =>
    path == '/' ? '/index.html' : decodeURIComponent(path) + '.html');
  eleventyConfig.addFilter('decodeURI', decodeURIComponent);
  eleventyConfig.addFilter('cutString', cutString);
  // Same escaping as Dotclear's encode_xml, for feed content.
  eleventyConfig.addFilter('xml', escapeHTML);

  // Some pages are also directories (/archive and /archive/2017/12). In case
  // GitHub Pages redirects /archive to /archive/ instead of serving
  // archive.html, also provide archive/index.html.
  eleventyConfig.on('eleventy.after', ({ dir }) => {
    const walk = d => {
      for (const name of readdirSync(d)) {
        const path = join(d, name);
        if (!statSync(path).isDirectory()) continue;
        if (existsSync(path + '.html') && !existsSync(join(path, 'index.html')))
          copyFileSync(path + '.html', join(path, 'index.html'));
        walk(path);
      }
    };
    walk(dir.output);
  });

  return {
    templateFormats: ['njk', 'md'],
  };
}
