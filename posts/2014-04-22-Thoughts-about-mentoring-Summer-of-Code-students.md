---
title: "Thoughts about mentoring Summer of Code students"
date: 2014-04-22T22:24:00
updated: 2014-04-22T20:24:27Z
url: "2014/04/22/Thoughts-about-mentoring-Summer-of-Code-students"
id: 129
guid: urn:md5:f988c1a1e11d55d66fbc4b715c02da18
lang: en
category: "Mozilla"
comments_open: true
http: true
templateEngineOverride: html
---
<div class="" id="magicdomid4"><span class="author-g-db1yqiaaskssz122zlos">I've
mentored Google Summer of Code students 3 years in a row, and I would
like to share with new GSoC mentors what I've learned, in the hope that
it can help them get more out of the summer. I'm going to assume that
most mentors share these 3 goals:</span></div><ul><li><span class="author-g-db1yqiaaskssz122zlos">get usable code at the end of the summer</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">train long term contributors who will stay active after the end of the summer</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">avoid spending disproportionate amounts of time mentoring.</span></li>
</ul><div class="" id="magicdomid10"><span class="author-g-db1yqiaaskssz122zlos">I
can't overstate how important it is to give the student good working
habits from the very beginning. If you setup a good working relationship
from the beginning, you are on for an awesome summer. If you let a
student do things that frustrate you without sending immediate feedback
about it, you'll both suffer during the whole summer.</span></div><div class="" id="magicdomid12"><span class="author-g-db1yqiaaskssz122zlos">Here are some frequent problems that are likely to happen if you don't pay enough attention in the beginning:</span></div><ul><li><span class="author-g-db1yqiaaskssz122zlos">Because of the way school works, students are used to hiding their work
until it's ready to be evaluated. Training them to show
work-in-progress code so that you can provide early feedback and
effectively help them takes time. You'll likely need to ask "show me the
code, please" several times, encourage them, and comfort them that it's
OK to show unfinished non-working code.</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">Students are used to receiving feedback from one person, and are likely
to send their work only to their mentor when requesting feedback or
expecting evaluation. Encourage the student to discuss the project with
all the relevant people and more generally to interact with the
community; avoid private discussion of technical matters. Doing this has
2 interesting consequences: the time you'll spend mentoring the student
will be dramatically reduced because the mentoring load will be spread
across all your team (for me this often meant that when my student asked
a question on IRC, he received a good and timely answer before I had
even read the question!), and the student will feel like he's part of
your team, which increases the likelihood of staying around after the
summer.</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">Unless given specific directions, students tend to work on a branch or
on a repository somewhere, and think about merging their code or getting
a review only at the end of the summer. It's common to see student
applications where the schedule says that they will do all the coding
work, and then get a review during the last week of the summer to land
the code. Experienced Mozilla developers knows there's no way sending a
several-months-of-work-worth patch to someone's review queue and
expecting a timely review will work. But students usually dramatically
underestimate both the time it takes to get a review AND the time it
takes to address the feedback (probably because at school they hand
their work and only expect a grade, or a pass/fail in return). As a
mentor it's your job to ensure they get their code through review. Urge
students to write small patches, and get them reviewed as soon as
possible. Students (and other developers ;)) will be tempted to 'just
add one more little feature before attaching the patch'. Resist! Filing a
new bug is easy. If the schedule of a student involves writing code
without submitting it for review and inclusion, this raises a red flag
for me: is there really no way to break this down to smaller pieces that
could land separately? Don't hesitate to rediscuss the schedule with
the student if you aren't fully happy with it.</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">Given that the students are being paid money to participate in GSoC, it
makes sense that lots of students will consider summer of code as
"work", and have money be the primary motivator; which means that once
they get the final payment, they disappear. This feeling can't be
avoided in all cases, but if we can get the student to instead feel that
the money is an opportunity to not do any other work during that time
to focus full-time on volunteering for a project they care about, the
student is likely to stay around for much longer than the summer. This
can be done by treating the student more like a volunteer than like
someone paid to be on your team. Get the student to have code landing
early, and often. Get the student addicted to restarting his nightly
build and seeing his code is in use there. Encourage the student to not
only fix things directly related to his GSoC project, but to also spend a
few hours here and there fixing his own itches and looking into other
bugs that make the product better for his own use cases.</span></li>
</ul><div class="" id="magicdomid18"><span class="author-g-db1yqiaaskssz122zlos">Here
is one suggestion to get students started: during the community
bounding period, assign them a 'small' project to warm up. The ideal
characteristics of such a project are:</span></div><ul><li><span class="author-g-db1yqiaaskssz122zlos">will get the student to go through all the processes of your team
(using bugzilla, attaching patches, requesting review, handling review
comments, …)</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">will get the student to touch code areas that will be relevant during the summer.</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">can be completed by the student before the ends of the community
bounding period (think of it as a 2-weeks project, but size it like
something you would do in a rainy week-end. Remember that most of the
time spent by the student will not be actual coding, but learning to
interact with your team, and this is the very reason why this project is
done during the community bounding period).</span></li>
<li><span class="author-g-db1yqiaaskssz122zlos">once this small project lands, it will be highly visible, and will
cause the student to receive appreciation from other people in your
team/community.</span></li>
</ul><div class="" id="magicdomid23"><span class="author-g-db1yqiaaskssz122zlos">It's
not always possible to find a project fitting perfectly here, but it's
usually possible to find something close enough to fit the purpose of
getting the student started. The Instantbird team will be using this
'small community bounding project' approach to starting the mentoring
relationship for the third time this year.</span></div><div class="" id="magicdomid25"><span class="author-g-db1yqiaaskssz122zlos">I
tend to think that getting the student started on the right track is
the most important thing a mentor needs to do, and if it's done
correctly the rest of the mentoring is easy and pleasurable.</span></div>