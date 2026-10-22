---
title: "Protéger un javascript contre la lecture dans un navigateur"
date: 2006-02-03T20:13:14
updated: 2014-01-20T23:44:05Z
url: "2006/02/03/Protéger-un-javascript-contre-la-lecture-dans-un-navigateur"
id: 86
guid: urn:md5:4936b15e5f57b54f5d1ae6e7dfc45242
http: true
templateEngineOverride: html
---

   <p>Pour rendre difficile la lecture d'un fichier contentant uniquement un script javascript dans un navigateur, ajouter&nbsp;:</p>
<pre>
//&lt;script&gt;self.location = 'about:blank';&lt;/script&gt;
</pre>
<p>Comme ça quand le fichier est chargé comme une page web, la page disparait instantannément et quand il est chargé normalement comme un simple fichier javascript, cette ligne est considérée comme un commentaire.</p>
<p>Il est souhaitable de mettre entre <code>&lt;!--</code> <code>//--&gt;</code> le script réel contenu dans le fichier pour éviter que celui ne soit affiché un court instant.</p>
<p>Protection trouvée sur un script de <code>paypopup.com</code>. Ce site a réussi à m'ouvrir une fenêtre de popup sur Firefox 1.5&nbsp;!! (ça faisait des mois que je n'avais plus vu de popup).</p>

