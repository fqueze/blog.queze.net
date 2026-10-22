---
title: "Et un navigateur pourri, un !"
date: 2006-05-23T20:29:27
updated: 2014-01-20T23:44:05Z
url: "2006/05/23/Et-un-navigateur-pourri,-un-!"
id: 83
guid: urn:md5:e31401920b1aba5fa62358d419ba571f
http: true
templateEngineOverride: html
---

   <p>Je viens, en analysant les logs d'apache de trouver pour la première fois une trace du passage sur le site <a href="http://naturailes.queze.net">naturailes.queze.net</a> d'un navigateur incompatible avec le système de protection d'images utilisé.</p>
<p>Ce navigateur est sans surprise ... IE&nbsp;! Enfin j'avais fait un gros effort pour obtenir la compatibilité avec IE6, IE5, ... Donc là, il s'agit d'une version exotique d'IE&nbsp;!</p>
<pre>Mozilla/4.0 (compatible; MSIE 5.22; Mac_PowerPC)</pre>
<p>Problème constaté&nbsp;: ce navigateur ne charge pas correctement les images de fond (css). J'ai dans la feuille de style par exemple <code>#csa{[...];background-image:url('Imgpm5nem.jpg');}</code>. Et dans le log d'apache, je retrouve, ô surprise, <code>"GET /'Imgpm5nem.jpg' HTTP/1.1" 404</code>.</p>
<p>Alors là, je me suis dit que peut-être qu'il y avait une erreur dans ma syntaxe et qu'elle était tolérée par d'autre navigateurs. (ma feuille de style étant valide d'après le validateur du W3C, je n'y croyais quand même pas trop <img src="/smileys/clin_d'oeil.png" alt=";-)" />). Je suis donc allé vérifier sur le site du W3C dans la spécification CSS2. La plus part de leurs exemples semblent utiliser des double-quotes et non des simple-quotes, mais l'explication est très claire sur ce point&nbsp;:</p>
<blockquote><p>The format of a URI value is 'url(' followed by optional whitespace followed by an optional single quote (') or double quote (") character followed by the URI itself, followed by an optional single quote (') or double quote (") character followed by optional whitespace followed by ')'. The two quote characters must be the same.</p></blockquote>
<p>Ma feuille de style est donc valide, et ce navigateur pourri. Bilan&nbsp;: mes sites sont incompatibles avec IE mac 5.22 <img src="/smileys/sourire2.png" alt="^^" />.</p>
