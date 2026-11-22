// Defaults for drafts, only built by `npm run serve`: draft/<name>.md or
// draft/<name>/index.md is shown at /draft/<name>/, with the review mode
// (see lib/drafts.js).
import { loadDraftData } from '../lib/drafts.js';

export default {
  layout: 'draft.njk',
  eleventyComputed: {
    // Not page.filePathStem, which drops the date prefix of file names.
    slug: data => data.page.inputPath.replace(/^\.\/draft\/|(\/index)?\.\w+$/g, ''),
    permalink: data => data.permalink || `/draft/${data.slug}/index.html`,
    draftInfo: data => loadDraftData(data.slug),
  },
};
