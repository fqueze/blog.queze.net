---
title: "Serveurs DNS ovh... grr"
date: 2006-12-31T04:23:51
updated: 2014-01-20T23:44:05Z
url: "2006/12/31/Serveurs-DNS-ovh...-grr"
id: 77
guid: urn:md5:4fe141ff3d09dc88bf55bba67111030f
http: true
templateEngineOverride: html
---

   <p>Voila le message d'erreur sur lequel se termine ma nuit de configuration de ma passerelle vpn&nbsp;:</p>
<pre>
(queze_f@dd 2359)ssh florian@vpn.queze.net
ssh: vpn.queze.net: No address associated with hostname
(queze_f@dd 2361)ping vpn.queze.net
ping: Cannot resolve "vpn.queze.net" (Host name lookup failure)
</pre>

<p>Requêtes DNS avec <a href="http://www.dnsstuff.com">dnsstuff</a> (site très pratique)&nbsp;:</p>

<pre>
Searching for www.queze.net A record at a.root-servers.net [198.41.0.4]: Got referral to D.GTLD-SERVERS.net. (zone: net.) [took 10 ms]
Searching for www.queze.net A record at D.GTLD-SERVERS.net. [192.31.80.30]: Got referral to ns.queze.net. (zone: queze.net.) [took 46 ms]
Searching for www.queze.net A record at ns.queze.net. [212.27.32.132]: Timed out.  Trying again.
Searching for www.queze.net A record at ns.queze.net. [212.27.32.132]: Timed out.  Trying again.
Searching for www.queze.net A record at dns.queze.net. [213.186.33.102]: Timed out.  Trying again.
Searching for www.queze.net A record at dns.queze.net. [213.186.33.102]: Timed out.  Trying again.
Searching for www.queze.net A record at ns.queze.net. [212.27.32.132]: Timed out.  Trying again.
Searching for www.queze.net A record at dns.queze.net. [213.186.33.102]: Timed out.  Trying again.
</pre>

<pre>
Searching for www.ovh.com A record at b.root-servers.net [192.228.79.201]: Got referral to J.GTLD-SERVERS.NET. (zone: com.) [took 109 ms]
Searching for www.ovh.com A record at J.GTLD-SERVERS.NET. [192.48.79.30]: Got referral to ns.ovh.net. (zone: ovh.com.) [took 235 ms]
Searching for www.ovh.com A record at ns.ovh.net. [212.27.32.132]: Timed out.  Trying again.
Searching for www.ovh.com A record at dns.ovh.net. [213.186.33.102]: Timed out.  Trying again.
Searching for www.ovh.com A record at ns.ovh.net. [212.27.32.132]: Timed out.  Trying again.
Searching for www.ovh.com A record at dns.ovh.net. [213.186.33.102]: Timed out.  Trying again.
Searching for www.ovh.com A record at ns.ovh.net. [212.27.32.132]: Timed out.  Trying again.
Searching for www.ovh.com A record at ns.ovh.net. [212.27.32.132]: Timed out.  Trying again.
</pre>

<pre>
Note that these results are obtained in real-time, meaning that these are <b>not</b> cached results.
These results are what DNS resolvers all over the world will see right now (unless they have cached information).
</pre>

<p>Après les serveurs mails qui mettent des heures pour transférer un email, voici les serveurs DNS complètement down. Merci OVH&nbsp;!</p>

