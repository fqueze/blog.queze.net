---
title: "Instantbird bugs should now go to bugzilla.mozilla.org"
date: 2014-01-21T20:07:00
updated: 2014-01-21T21:18:56Z
url: "2014/01/21/Instantbird-bugs-should-now-go-to-bugzilla.mozilla.org"
id: 123
guid: urn:md5:e287ae672deb32212d91ebe88d107341
lang: en
category: "Mozilla"
comments_open: true
http: true
templateEngineOverride: html
comments:
  - id: 2
    date: 2014-01-24T20:58:14
    author: "Matěj Cepl"
    site: "http://matej.ceplovi.cz/blog"
    content: "<p>How much data you would loose with XML export of <a href=\"https://bugzilla.instantbird/buglist.cgi?quicksearch=ALL\" title=\"https://bugzilla.instantbird/buglist.cgi?quicksearch=ALL\">https://bugzilla.instantbird/buglis...</a> (unfortunately &amp;ctype=xml doesn't work, so I cannot give you full URL; not sure whether <a href=\"https://bugzilla.instantbird/buglist.cgi?quicksearch=ALL&amp;ctype=rdf\" title=\"https://bugzilla.instantbird/buglist.cgi?quicksearch=ALL&amp;ctype=rdf\">https://bugzilla.instantbird/buglis...</a> or rss are not missing something significant).</p>"
  - id: 3
    date: 2014-01-24T21:28:45
    author: "Florian Quèze"
    site: "http://blog.queze.net"
    me: true
    content: |-
      <p>Matěj, I don't really know (as we haven't explored that route) but it's possible not much would be lost (maybe some of the bug history).</p>
      <p>Downloading the content of bugzilla.instantbird.org wasn't the difficult part of the migration.</p>
---
<p>From 2007 to late 2013, Instantbird bugs were tracked on bugzilla.instantbird.org. This was fine as long as Instantbird was completely separate from all other Mozilla products, but when Instantbird's chat backend was re-used to add instant messaging to Thunderbird, we started having bugs that were relevant for both Instantbird and Thunderbird. Having them in two separate bug trackers was messy and caused lots of duplicates.</p>
<p>We started discussing this at MozCampEU2012 in Warsaw. It quickly became apparent that getting a product created for Instantbird and another one for the chat core wasn't a problem, but that importing our existing bugs would require more work. The plan at this time was to import the existing BIO (bugzilla.instantbird.org) database into BMO (bugzilla.mozilla.org). Unfortunately, while it seems bugzilla already supports importing bugs from plenty of other bug trackers, it doesn't support importing bugs from itself. Some people from the BMO team thought writing such an importer would be a nice and not-very-difficult project, so they agreed to work on it. We <a title="Bug 749586 - Import bugzilla.instantbird.org into bugzilla.mozilla.org" href="https://bugzilla.mozilla.org/show_bug.cgi?id=749586">filed a bug</a> to figure out the details. And nothing happened for months, because there were (understandably) higher priorities for the BMO team. Ten months later, the BMO team concluded that they were unlikely to ever get time for this project, and suggested we work on another solution instead: using <a href="https://wiki.mozilla.org/Bugzilla:REST_API">BzAPI</a> to do the import ourselves. This was more work than we could get done immediately, so we kept that in mind for later. <a href="http://clokep.blogspot.com/">Patrick Cloke</a> started experimenting with BzAPI but couldn't get enough of my and others' attention to complete the project.</p>
<p>In December 2013, we decided to move forward with the import, and <a title="Bug 951944 - New products and components for the import of bugs from bugzilla.instantbird.org" href="https://bugzilla.mozilla.org/show_bug.cgi?id=951944">requested the creation of the products</a> just before the holidays. We drafted a plan in which we broke down the work that needed to happen in several steps that could each be performed by a (relatively) simple and independent script:</p>
<ol><li>first, download all the data from bugzilla.mozilla.org in JSON, create a file for the data of each bug</li>
<li>slice the content of each file from 1. into a stream of events (each event is an action performed by the bugzilla users).</li>
<li>transform the sliced events into events that would apply on BMO (eg. change product names when they don't match exactly on BIO and BMO)</li>
<li>merge the events of all bugs into a single file; without duplicates (eg. when marking a bug as a duplicate of another bug, this creates events on both bugs, but we only need to import one, the other happens automatically).</li>
<li>replay events on BMO: this needs to create a map of new bug and attachment numbers, and replace them automatically in comments.</li>
</ol>
<p>The plan looked simple on paper (well, on <a href="https://etherpad.mozilla.org/bugzilla-instantbird-merge-bzapi">an etherpad</a>). Reality got in the way, with plenty of not-really-expected complications:</p>
<ul><li>BzAPI has lots of documented (eg. can't create an attachment at the same time as filing a bug; can't set the component without also setting the product, ...) and undocumented (eg. UTF8 is supported when filing a bug or adding comments, but not when commenting on an attachment) limitations.</li>
<li>The format of data downloaded from BzAPI is significantly different from the format of data we need to send it to do changes. This is especially true for attachment flags.</li>
<li>Sometimes the values in bug fields don't match what's in the history of events that happened to the bug. This problem occurs when users changed their bugzilla email address, when products got renamed. The worst case we had to deal with was a target milestone that was renamed, then a new target milestone was created with the original name, and some bug's milestone was changed from the renamed milestone to the new milestone with the original name. This caused an interesting complication because we ended up with changes where the mapped value was the same before and after the change.</li>
<li>We initially started using the js shell for our scripts, but to do HTTP requests, we needed XPCOM, so we switched to xpcshell instead. Unfortunately, <a title="Bug 962208 - xpcshell's readline function truncates its result after 255 characters" href="https://bugzilla.mozilla.org/show_bug.cgi?id=962208">xpcshell's readline() function truncates input data after 255 characters</a>. Later I discovered that <a title="Bug 933885 - xpcshell's dump() mangles non-ASCII output" href="https://bugzilla.mozilla.org/show_bug.cgi?id=933885">xpcshell doesn't handle UTF8 input/output</a> by default, and had to use nsIScriptableUnicodeConverter for that.</li>
</ul>
<p>Our scripts are all in the <a href="http://hg.instantbird.org/bio-merge/">bio-merge</a> hg repository. The result of step 4. is a 120MB text file with each line being the JSON representation of an event that needs to be replayed. We tested replaying events on bugzilla-dev.allizom.org first for a single bug, then for a few set of bugs that had dependencies. Finally we replayed our whole set of bugs (2294 bugs, 20984 events), and after fixing the issues that surfaced during that test run, we were ready to do the final import.</p>
<p>The final import took 848 minutes to complete (14 hours). 240 events failed to replay because some components didn't have on BMO the exact names the script expected. I fixed the script and replayed these again.</p>
<p>We finished by adding comments in all existing BIO bugs giving the new URL, and closed BIO (it's now read-only).&nbsp; As of <span class="bz_comment_time">2013-12-30, new Instantbird bugs should be filed on bugzilla.mozilla.org, in the <a href="https://bugzilla.mozilla.org/enter_bug.cgi?product=Instantbird">Instantbird</a> product for UI bugs, in the <a href="https://bugzilla.mozilla.org/enter_bug.cgi?product=Chat%20Core">Chat Core</a> product for backend issue (this part of the code is shared with Thunderbird), and in the <a href="https://bugzilla.mozilla.org/enter_bug.cgi?product=Instantbird Servers">Instantbird Servers</a> product of issues with our servers.<br /></span></p>