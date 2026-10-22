---
title: "Firefox is awesome"
date: 2014-07-27T22:15:00
updated: 2014-07-27T20:15:58Z
url: "2014/07/27/Firefox-is-awesome"
id: 132
guid: urn:md5:533d3601d2c15f2311e17c0ac291b418
lang: en
category: "Mozilla"
comments_open: true
http: true
templateEngineOverride: html
---
<p>"<em>Hey,
you know what? Firefox is awesome!</em>" someone exclaimed at the other end
of the <a title="La Coroutine" href="http://www.lacoroutine.org/">coworking space</a> a few weeks ago. This piqued my curiosity, and I
moved closer to see what she was so excited about.</p>
<p>When
I saw the feature she was delighted of finding, it reminded me a
similar situation several years ago. In high school, I was trying to
convince a friend to switch from IE to Mozilla. The arguments about
respecting web standards didn't convince him. He tried Mozilla anyway to
please me, and found one feature that excited him.<br />
He
had been trying to save some images from webpages, and for some reason
it was difficult to do (possibly because of context menu hijacking,
which was common at the time, or maybe because the images were displayed
as a background, …). He had even written some Visual Basic code to
parse the saved HTML source code and find the image urls, and then
downloaded them, but the results weren't entirely satisfying.<br />
Now
with Mozilla, he could just right click, select "View Page Info", click
on the "Media" tab, and find a list of all the images of the page. I
remember how excited he looked for one second, until he clicked a
background image in the list and the preview stayed blank; he then
clicked the "Save as" button anyway and… nothing happened. Turns out
that "Save as" button was just producing an error in the Error Console.
He then looked at me, very disappointed, and said that my Mozilla isn't
ready yet.<br />
After that disappointment, I didn't insist much on him using Mozilla instead of IE (I think he did switch anyway a few weeks or months later).</p>
<p>A few months later, as I had time during summer vacations, I tried to
create an add-on for the last thing I could do with IE but not Firefox:
list the hostnames that the browser connects to when loading a page (the
add-on, <a href="https://addons.mozilla.org/en-US/firefox/addon/view-dependencies/">View Dependencies</a>, is on AMO). I used this to maintain a <a href="http://en.wikipedia.org/wiki/Hosts_%28file%29">hosts file</a> that was blocking ads on the network's gateway.<br />
Working
on this add-on project caused me to look at the existing Page Info code
to find ideas about how to look through the resources loaded by the
page. While doing this, I stumbled on the problem that was causing
background image previews to not be displayed. Exactly 10 years ago, I
created a patch, created a bugzilla account (I had been lurking on
bugzilla for a while already, but without creating an account as I
didn't feel I should have one until I had something to contribute), and
<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=229441#c12">attached the patch</a> to the existing <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=229441">bug</a> about this background preview issue.<br />
Two days later, the patch was reviewed (thanks db48x!), I addressed the
review comment, attached a new patch, and it was checked-in.<br />
I remember how excited I was to verify the next day that the bug was gone
in the next nightly, and how I checked that the code in the new nightly
was actually using my patch.</p>
<p>A couple months later, I <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=239472">fixed the "Save as" button</a> too in time for Firefox 1.0.</p>
<p>Back to 2014. The reason why someone in my coworking space was finding
Firefox so awesome is that "<em>You can click "View Page Info", and then
view all the images of the page and save them.</em>" Wow. I hadn't heard
anybody talking to me about Page Info in years. I did use it a lot
several years ago, but don't use it that much these days. I do agree
with her that <strong>Firefox is awesome</strong>, not really because it can save images
(although that's a great feature other browsers don't have), but <strong>because
anybody can make it better</strong> for his/her own use, and by doing so making
it awesome <strong>for millions of other people</strong> now but also in the future. Like
I did, ten years ago.</p>