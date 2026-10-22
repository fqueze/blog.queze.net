---
title: "Avec un portable tout neuf, les compilations vont plus vite (oui, c'est évident) :-)"
date: 2007-02-25T21:55:14
updated: 2014-01-20T23:04:06Z
url: "2007/02/25/Avec-un-portable-tout-neuf,-les-compilations-vont-plus-vite-(oui,-c-est-évident)-:-)"
id: 53
guid: urn:md5:648643e41cae6fa604580dcf57009e13
lang: fr
category: "Mozilla"
http: true
templateEngineOverride: html
---

   <p>Comparaison du temps de compilation de Firefox sur mon MacBook flambant neuf (pas tout à fait flamblant, mais il a quand même bien chauffé <img src="/smileys/clin_d'oeil.png" alt=";-)" />) et sur mes autres ordinateurs&nbsp;:</p>

<table border="1">
 <tr><th>Ordinateur</th><th>CPU</th><th>RAM</th><th>OS</th><th>Temps utilisateur</th><th>Temps système</th><th>Temps total</th></tr>
 <tr><td>MacBook</td><td>Core 2 Duo 2Ghz</td><td>1Go DDR2</td><td>MacOS X 10.4.8</td><td>25m33.791s</td><td>5m8.470s</td><td>33m58.034s</td></tr>
 <tr><td>MacBook (make -j4)</td><td>Core 2 Duo 2Ghz</td><td>1Go DDR2</td><td>MacOS X 10.4.8</td><td>26m47.943s</td><td>5m31.670s</td><td>22m38.931s</td></tr>
 <tr><td>PC portable</td><td>Pentium M Dothan 1,6Ghz</td><td>512Mo DDR</td><td>Linux (Gentoo)</td><td>33m42.210s</td><td>3m17.152s</td><td>39m10.044s</td></tr>
 <tr><td>PC fixe</td><td>Pentium 4C 2,4Ghz</td><td>1Go DDR</td><td>Linux (Ubuntu 6.10)</td><td>44m8.958s</td><td>2m22.149s</td><td>55m51.320s</td></tr>
 <tr><td>Nouveau PC Fixe</td><td>Core 2 Duo E8200 @2,66Ghz</td><td>4Go DDR2</td><td>Linux (Ubuntu 7.10)</td><td>22m56.950s</td><td>1m25.837s</td><td>25m58.866s</td></tr>
 <tr><td>Nouveau PC Fixe (make -j4)</td><td>Core 2 Duo E8200 @2,66Ghz</td><td>4Go DDR2</td><td>Linux (Ubuntu 7.10)</td><td>20m6.299s</td><td>1m18.653s</td><td>14m41.593s</td></tr>
</table>

<p>
 <img src="/pict/about-eroda.png" alt="MacBook Core2Duo 2Ghz 1Go de DDR2 667Mhz" />
</p>
<h3>Edité le 2007-03-10 à 17:23:08.</h3><h3>Edité le 2008-04-15 à 22:38:35.</h3>
