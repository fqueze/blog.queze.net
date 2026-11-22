// Defaults for drafts, only built by `npm run serve`: draft/<slug>/index.md
// is shown at /draft/<slug>/, with the review mode (see lib/drafts.js).
import { loadDraftData } from '../lib/drafts.js';

export default {
  layout: 'draft.njk',
  eleventyComputed: {
    slug: data => data.page.filePathStem.split('/')[2],
    permalink: data => data.permalink || `/draft/${data.slug}/index.html`,
    draftInfo: data => loadDraftData(data.slug),
  },
};
