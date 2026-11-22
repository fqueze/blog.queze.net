# blog.queze.net

Florian Quèze's blog, formerly running on Dotclear 2.6, now built with
[Eleventy](https://www.11ty.dev/) and published with GitHub Pages.
URLs, feeds (including item GUIDs) and look are the same as on the old blog.
Comments are shown read-only; search uses DuckDuckGo restricted to the site.

## Rebuild

```sh
npm install
npm run build        # writes _site/
```

Pushing to `main` runs `.github/workflows/eleventy_build.yml`, which builds the
site and publishes `_site/` to the `gh-pages` branch. In the repository's
Settings > Pages, the source must be the `gh-pages` branch (custom domain:
blog.queze.net, from the `CNAME` file).

## Add a post

Create `posts/YYYY-MM-DD-Some-title.md`:

```markdown
---
title: Some title
date: 2027-01-31T14:00:00
category: Mozilla
tags: [performance]
---
The post, in Markdown.
```

- `date` is the local (Paris) time, without timezone.
- The URL is `/post/2027/01/31/Some-title` (date + file name); set `url:` to choose another one.
- `category` is one of the `url` values of `categories` in `_data/site.js`; it and `tags` are optional.
- Imported posts have extra fields: `id` and `guid` (from Dotclear), `http: true`
  (their feed links stay on http:// so that feed readers don't show them again),
  `comments`, and `templateEngineOverride: html` as their body is HTML.
- `unlisted: true` keeps a post out of the home page, archives, tags, feeds and
  previous/next links: it's only reachable by its URL and its category page, if
  that category is also `unlisted` in `_data/site.js` (then not in the sidebar,
  and without feed). Used by the posts imported from www.queze.net.
- `author:` replaces the default author (Florian Quèze) on the post.

## Drafts and review

Write a draft as `draft/<name>.md` (like a post; `date` is ignored), with its
images in `draft/<name>/` (or write it as `draft/<name>/index.md`).
`npm run serve` shows the drafts at http://localhost:8080/draft/ (they aren't
in `npm run build`).

On a draft page, select text to comment on it; comments are saved in
`draft/<name>/data.json`. The banner buttons copy them as a prompt for Claude.
"Publish" writes `posts/<today>-<slug>.md` dated now (a date prefix of
`<name>` is dropped), copies the images to `pict/`, and shows the git commands
to push it. Adapted from combien-consomme.fr.

## Layout

- `posts/`: one Markdown file per post, with comments in the front matter.
- `_data/site.js`: blog settings and categories.
- `lib/blog.js`, `lib/dotclear.js`: listings, archives, feeds, dates, computed like Dotclear did.
- `*.njk`, `_includes/`: templates reproducing the Dotclear default theme.
- `pict/`, `smileys/`, `public/`, `themes/`: media and theme.
- `_data/floblogRedirects.json`, `floblog-redirects.njk`: redirect pages for the URLs
  of the older www.queze.net blog that old links use on this site (`/cat10.html`,
  `/a29-….html`…). The mapping is a copy of `_data/redirects.json` of the
  www.queze.net repository.
- `import/`: Dotclear export and conversion to `posts/`, and `floblog.mjs` importing
  the www.queze.net posts that weren't in Dotclear (not used by the build).
- `tools/compare.mjs [http://old-blog]`: crawl the old blog and `_site/`, and report
  missing URLs and differences in visible text and feed entries.
