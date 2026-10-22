// Defaults for all posts. The URL is /post/<url>, by default the date and
// the file name without its date prefix, e.g. 2027/01/31/My-new-post.
const pad = n => String(n).padStart(2, '0');

export default {
  layout: 'post.njk',
  eleventyComputed: {
    url: data => data.url || (d => `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/` +
                                   `${pad(d.getUTCDate())}/${data.page.fileSlug}`)(data.page.date),
    permalink: data => `/post/${data.url}.html`,
  },
};
