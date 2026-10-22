---
title: "View Frames"
date: 2007-04-01T15:37:42
updated: 2014-01-20T23:04:06Z
url: "2007/04/01/View-Frames"
id: 51
guid: urn:md5:b59fc3c0bc788447a2f47524695d349e
lang: fr
category: "Mozilla"
http: true
templateEngineOverride: html
---

   <p>J'ai commencé le développement d'une nouvelle extension pour Firefox. Cette extension a pour but de mettre en évidences les frames utilisées dans une page.</p>
<p><img src="/pict/viewFrames-ibpn.png" alt="View Frames en action, premier aperçu" /></p>
<p>Les frames sont affichées sous forme d'un arbre, dans une partie masquable ajoutée à l'onglet général de la fenêtre Page Info de Firefox. La frame pour sur laquelle page info a été ouvert est affichée en gras. Quand on fait un double clic sur une frame dans l'arbre, Page Info se recharge pour montrer les info sur cette frame particulière.</p>
<p>La copie d'écran si dessus est faite sur le site de ma banque qui, étant bourré de frames, se prête bien à mes essais.</p>
<p>Sur la page d'accueil, il y a 5 frames, je viens de m'amuser à regarder les balises <code>meta</code> des frames. <code>GENERATOR</code> est particulièrement remarquable&nbsp;:</p>
<ul>
<li>sur la frame principale&nbsp;: <code>MSHTML 6.0.2800.1106</code></li>
<li>sur la frame du menu&nbsp;: <code>Microsoft FrontPage Express 2.0</code></li>
<li>sur la frame d'identification&nbsp;: <code>Microsoft FrontPage 3.0</code></li>
<li>les 2 autres, pas d'info particulières.</li>
</ul>

<p>Je trouve que ces informations font très bien dans le décor pour montrer le professionnalisme de cette banque <img src="/smileys/sourire.png" alt=":-)" />.</p>
