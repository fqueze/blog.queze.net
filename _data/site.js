// Blog settings, as they were in Dotclear.
export default {
  name: 'Florian Quèze',
  description: "Florian Quèze's blog, talking about Mozilla, Instantbird, Summer of Code, Ami 6 cars, ...",
  lang: 'en',
  host: 'blog.queze.net',
  // Feeds need absolute URLs. Posts imported from Dotclear have 'http: true'
  // in their front matter, to keep their old http:// links and GUIDs so that
  // feed readers don't see them as new. Other posts use https.
  url: 'http://blog.queze.net',
  httpsUrl: 'https://blog.queze.net',
  author: { name: 'Florian Quèze', url: 'http://blog.queze.net' },
  timezone: 'Europe/Paris',
  // Atom feed ID and last update of the Dotclear blog.
  feedId: 'urn:md5:d59fad53f8b1c54effe51c1e5b249670',
  updated: '2026-03-22 03:43:22',
  updatedTimezone: 'Europe/Berlin',
  dateFormat: '%A, %B %e %Y',
  timeFormat: '%H:%M',
  postsPerPage: 10,
  postsPerFeed: 20,
  // Categories, in display order. 'url' is used in /category/<url>.
  // Unlisted categories aren't in the sidebar and have no feed; they are for
  // unlisted posts (imported from www.queze.net, mostly by other authors).
  categories: [
    { url: 'Mozilla', title: 'Mozilla', desc: '<p>Posts related to Mozilla activities</p>' },
    { url: 'Voitures-anciennes', title: 'Voitures anciennes', desc: '' },
    { url: 'Voitures-anciennes/Ami-6', title: 'Ami 6', desc: '' },
    { url: 'Divers', title: 'Divers', desc: '' },
    { url: 'LR2T', title: 'LR2T', desc: '<p>Les remarques de Tintin</p>', unlisted: true },
    { url: 'Images', title: 'Images', desc: '', unlisted: true },
    { url: 'Romain', title: 'Romain', desc: '<p>Catégorie pour que Rom1 puisse ploukiser ... euh je veux dire poster, en tout indépendance.</p>', unlisted: true },
  ],
};
