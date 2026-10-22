---
title: "Converting old Mac minis into CentOS Instantbird build slaves"
date: 2014-07-25T23:24:00
updated: 2014-07-25T21:25:40Z
url: "2014/07/25/Converting-old-Mac-minis-into-CentOS-Instantbird-build-slaves"
id: 131
guid: urn:md5:2db95fe73b4c893332b305ae8950eaa8
lang: en
category: "Mozilla"
comments_open: true
http: true
templateEngineOverride: html
comments:
  - id: 71205
    date: 2015-06-09T23:56:53
    author: "Florian"
    content: "<p>Since Bug 1167201, we also need: yum install GConf2-devel</p>"
---
<p>A while ago, I received a few <a href="http://armenzg.blogspot.de/2014/05/do-you-need-used-mac-mini-for-your.html">retired Mozilla minis</a>. Today 2 of them started their new life as CentOS6 build slaves for Instantbird, which means <a href="http://blog.instantbird.org/2014/07/linux-nightly-builds-back/">we now have Linux nightlies again</a>! Our previous Linux build slave, running CentOS5, was no longer able to build nightlies based on the current mozilla-central code, and this is the reason why we haven't had Linux nightlies since March. We know it's been a long wait, but to help our dear Linux testers forgive us, we started offering 64bit nightly builds!</p>
<p>For the curious, and for future reference, here are the steps I followed to install these two new build slaves:</p>
<h2>Partition table</h2>
<p>The Mac minis came with a GPT partition table and an hfs+ partition that we don't want. While the CentOS installer was able to detect them, the grub it installed there didn't work. The solution was to convert the GPT partition table to the MBR older format. To do this, boot into a modern linux distribution (I used an Ubuntu 13.10 live dvd that I had around), install <code>gdisk</code> (<code>sudo apt-get update &amp;&amp; sudo apt-get gdisk</code>) and use it to edit the disk's partition table:</p>

<p><code>sudo gdisk /dev/sda</code><br />Press '<code>r</code>' to start recovery/transformation, '<code>g</code>' to convert from GPT to MBR, '<code>p</code>' to see the resulting partition table, and finally '<code>w</code>' to write the changes to disk (instructions initially from <a href="http://www.firewing1.com/blog/2012/03/05/how-convert-gpt-disk-layout-ms-dosmbr-layout-without-data-loss-and-gigabyte-hybrid">here</a>).<br />Exit gdisk.<br />Now you can check the current partition table using gparted. At this point I deleted the hfs+ partition.</p>

<h2>Installing CentOS</h2>
<p>The version of CentOS needed to use the current Mozilla build tools is CentOS 6.2. We tried before using another (slightly newer) version, and we never got it to work.</p>
<p>Reboot on a CentOS 6.2 livecd (press the '<code>c</code>' key at startup to force the mac mini to look for a bootable CD).<br />Follow the instructions to install CentOS on the hard disk.<br />I customized the partition table a bit (50000MB for <code>/</code>, 2048MB of swap space, and the rest of the disk for <code>/home</code>).</p>
<p>The only non-obvious part of the CentOS install is that the boot loaded needs to be installed on the MBR rather than on the partition where the system is installed. When the installer asks where grub should be installed, set it to /dev/sda (the default is /dev/sha2, and that won't boot). Of course I got this wrong in my first attempts.</p>
<h2>Installing Mozilla build dependencies</h2>
<p>First, install an editor that is usable to you. I typically use emacs, so: <code>sudo yum install emacs</code></p>
<p>The Mozilla Linux build slaves use a specifically tweaked version of gcc so that the produced binaries have low runtime dependencies, but the compiler still has the build time feature set of gcc 4.7. If you want to use something as old as CentOS6.2 to build, you <strong>need</strong> this specific compiler.</p>
<p>The good thing is, there's a yum repository publicly available where all the customized mozilla packages are available. To install it, create a file named <code>/etc/yum.repos.d/mozilla.repo</code> and make it contain this:</p>
<pre>[mozilla]
name=Mozilla
baseurl=http://puppetagain.pub.build.mozilla.org/data/repos/yum/releng/public/CentOS/6/<em>x86_64</em>/
enabled=1
gpgcheck=0</pre><p>Adapt the <code>baseurl</code> to finish with <code>i386</code> or <code>x86_64</code> depending on whether you are making a 32 bit or 64 bit slave.</p>
<p>After saving this file, you can check that it had the intended effect by running this comment to list the packages from the mozilla repository: <code>repoquery -q --repoid=mozilla -a</code><br /><br />You want to install the version of gcc473 and the version of mozilla-python27 that appear in that list.</p>
<p>You also need several other build dependencies. <a href="https://developer.mozilla.org/en-US/">MDN </a>has <a href="https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Linux_Prerequisites#RedHat_Enterprise_Linux_%28RHEL%29.2FCentOS.2FFedora">a page listing them</a>:</p>
<code>yum groupinstall 'Development Tools' 'Development Libraries' 'GNOME Software Development'</code><br />
<code>yum install mercurial autoconf213 glibc-static libstdc++-static yasm wireless-tools-devel mesa-libGL-devel alsa-lib-devel libXt-devel gstreamer-devel gstreamer-plugins-base-devel pulseaudio-libs-devel</code><p>
Unfortunately, two dependencies were missing on that list (I've now fixed the page):
<br /><code>yum install gtk2-devel dbus-glib-devel</code></p>

<p>At this point, the machine should be ready to build Firefox.</p>
<p>Instantbird, because of libpurple, depends on a few more packages:<br /><code>yum install avahi-glib-devel krb5-devel</code></p>
<p>And it will be useful to have ccache:<br />
<code>yum install ccache</code></p>
<h2>Installing the buildbot slave</h2>
<p>First, install the buildslave command, which unfortunately doesn't come as a yum package, so you need to install easy_install first:</p>
<p><code>yum install python-setuptools python-devel mpfr<br />easy_install buildbot-slave</code></p>
<p>python-devel and mpfr here are build time dependencies of the buildbot-slave package, and not having them installed will cause compiling errors while attempting to install buildbot-slave.</p>
<p>We are now ready to actually install the buildbot slave. First let's create a new user for buildbot:</p>

<code><p>adduser buildbot<br />su buildbot<br />cd /home/buildbot</p>

</code><p>Then the command to create the local slave is:</p>
<p><code>buildslave create-slave --umask=022 /home/buildbot/buildslave buildbot.instantbird.org:9989 linux-s<em>N password</em></code></p>
<p>The buildbot slave will be significantly more useful if it starts automatically when the OS starts, so let's edit the crontab (<code>crontab -e</code>) to add this entry:<br /><code>@reboot PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/buildslave start /home/buildbot/buildslave</code></p>
<p>The reason why the PATH environment variable has to be set here is that the default path doesn't contain /usr/local/bin, but that's where the mozilla-python27 packages installs python2.7 (which is required by <code>mach</code> during builds).</p>
<p>One step in the Instantbird builds configured on our buildbot use <code>hg clean --all</code> and this requires the purge mercurial extension to be enabled, so let's edit <code>~buidlbot/.hgrc</code> to look like this:<br /><code>$ cat ~/.hgrc <br />[extensions]<br />purge =</code></p>
<p>Finally, ssh needs to be configured so that successful builds can be uploaded automatically. Copy and adapt <code>~buildbot/.ssh</code> from an existing working build slave. The files that are needed are <code>id_dsa</code> (the ssh private key) and <code>known_hosts</code> (so that ssh doesn't prompt about the server's fingerprint the first time we upload something).</p>
<p>Here we go, working Instantbird linux build slaves! Figuring out all these details for our first CentOS6 slave took me a few evenings, but doing it again on the second slave was really easy.</p>