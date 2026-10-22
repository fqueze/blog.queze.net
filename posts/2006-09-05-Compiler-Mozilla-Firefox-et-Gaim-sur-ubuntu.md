---
title: "Compiler Mozilla Firefox et Gaim sur ubuntu"
date: 2006-09-05T13:56:02
updated: 2014-01-20T23:04:34Z
url: "2006/09/05/Compiler-Mozilla-Firefox-et-Gaim-sur-ubuntu"
id: 55
guid: urn:md5:20dd0446862e8e26b219af89544e1115
lang: fr
category: "Mozilla"
http: true
templateEngineOverride: html
---

   <p>Ça fait déjà quelques fois que je tâtonne pour compiler Firefox sur ubuntu, alors cette fois ci, j'ai noté les noms des paquets que j'ai installés pour que ça fonctionne.</p>
<p><code>sudo apt-get install gcc g++ libgtk2.0-dev libidl-dev libxt-dev libcurl3-dev</code></p>
<p>Voila, il n'y a plus qu'à suivre <a href="http://developer.mozilla.org/en/docs/Build_Documentation">les instructions</a> et ça devrait marcher <img src="/smileys/sourire.png" alt=":-)" />.</p>

<hr />
<p>Et pour Gaim&nbsp;:</p>
<p>Le minimum pour que ./configure fonctionne&nbsp;: <code>sudo apt-get install intltool</code>. Le Gaim alors obtenu est sans SSL, donc sans MSN et sans GTalk <img src="/smileys/pense.png" alt=":-/" />.</p>
<p>Et si on veut que ça soit vraiment bien...&nbsp;:<br />
<code>sudo apt-get build-dep gaim</code></p>
<blockquote><p>
Les NOUVEAUX paquets suivants seront installés&nbsp;:
  build-essential cdbs comerr-dev indent libao-dev libaspell-dev libaudiofile-dev libbonobo2-dev libcamel1.2-dev
  libebook1.2-dev libedata-book1.2-dev libedataserver1.2-dev libesd0-dev libgconf2-dev libgcrypt11-dev libgnome2-dev
  libgnomevfs2-dev libgnutls11-dev libgpg-error-dev libgtkspell-dev libhesiod0 libkadm55 libkrb5-dev libltdl3 libltdl3-dev
  libnspr-dev libopencdk8-dev liborbit2-dev libpopt-dev libstartup-notification0-dev libtasn1-2-dev libxml2-dev libxss-dev
  libzephyr-dev libzephyr3 tcl8.4-dev tk8.4-dev
</p></blockquote>
<p>Et&nbsp;: <code>sudo apt-get install libgadu-dev libsilc-dev libhowl-dev dbus-1-dev</code></p>
<h3>Edité le 2006-09-09 à 18:12:08.</h3><h3>Edité le 2007-03-21 à 16:27:42.</h3>
