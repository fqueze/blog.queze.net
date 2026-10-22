---
title: "Catching flickering regressions"
date: 2017-12-05T20:47:00
updated: 2017-12-05T19:47:59Z
url: "2017/12/05/Catching-flickering-regressions"
id: 140
guid: urn:md5:7d0dae7c1e8cd58ce5d996e477e35506
lang: en
category: "Mozilla"
tags: ["performance"]
comments_open: true
http: true
templateEngineOverride: html
---
<p>For Firefox 57, as part of the Photon Performance project, one of the
things we worked on was dramatically reducing flickering in the main
browser window. We focused especially on what happens when opening the
first browser window during startup, and when opening new browser
windows.<br /><br />To identify bugs, we <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1372518#c0" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=https://bugzilla.mozilla.org/show_bug.cgi?id%3D1372518%23c0&amp;source=gmail&amp;ust=1512589545257000&amp;usg=AFQjCNGmtWyKTq358nomUf_azbiQZPlKng">looked frame by frame at video recordings</a>.
This was good enough to file bugs for an initial exploration, but was
time consuming, and won't help us to keep these interactions flicker
free going forward.<br /><br />I'm happy to announce that these two
interactions are now covered by automated flickering tests that will
catch any regression there:<br /><a href="https://searchfox.org/mozilla-central/source/browser/base/content/test/performance/browser_startup_flicker.js" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=https://searchfox.org/mozilla-central/source/browser/base/content/test/performance/browser_startup_flicker.js&amp;source=gmail&amp;ust=1512589545257000&amp;usg=AFQjCNEVtLKbH5HRh1TQq3LB7ev-6Vcx8Q">https://searchfox.org/mozilla-<wbr>central/source/browser/base/co<wbr>ntent/test/performance/browser<wbr>_startup_flicker.js</a><br /><a href="https://searchfox.org/mozilla-central/source/browser/base/content/test/performance/browser_windowopen_flicker.js" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=https://searchfox.org/mozilla-central/source/browser/base/content/test/performance/browser_windowopen_flicker.js&amp;source=gmail&amp;ust=1512589545257000&amp;usg=AFQjCNGqEpUmnoTJ-gr-8V1DbkCqhwIqzQ">https://searchfox.org/mozilla-<wbr>central/source/browser/base/co<wbr>ntent/test/performance/browser<wbr>_windowopen_flicker.js</a><br /><br />These tests currently contain whitelists of known bugs (blocking <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1421456" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=https://bugzilla.mozilla.org/show_bug.cgi?id%3D1421456&amp;source=gmail&amp;ust=1512589545257000&amp;usg=AFQjCNEogQEuEbaHV7CgJU5AiOeB2146zw">bug 1421456</a>).</p>
Here is how these tests work:<br /><ul><li>as soon as the window we care about is created, we add a MozAfterPaint event listener to it.</li>
<li>for each received MozAfterPaint event, we capture a screenshot of the window using <a href="https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawWindow" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawWindow&amp;source=gmail&amp;ust=1512589545257000&amp;usg=AFQjCNF4_r45yxxCGeu1Bq4Cevns0REsGg">CanvasRenderingContext2D.drawW<wbr>indow()</a>.</li>
<li>remove the event listener after the window is done loading and after several Services.tm.idleDispatchToMain<wbr>Thread callbacks to ensure that the window has settled.</li>
<li>compare the pixel data of each of the captured frames to identify areas that have changed.</li>
<li>for changed areas, see if they are whitelisted, if not make the test
fail and dump base64 encoded data urls of the before/after screenshots,
so that the test failure can be visually debugged.</li>
</ul><div dir="ltr">We
currently cover only the startup and window opening cases, but I expect
us to add similar tests to more areas in the future. Each time we spend
effort reducing flickering in some area of our UI, we should add tests
for it to prevent regression.</div>