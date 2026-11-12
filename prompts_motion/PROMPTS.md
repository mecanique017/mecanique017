# Prompts motion design — prompt-motion.com

Collecte du 05/11/2026 : **239 pages** (233 prompts, 5 skills, 1 template). Après suppression des doublons, il reste **197 prompts différents**. Les données brutes sont dans `prompts.json`.

Les textes sont recopiés tels quels (souvent en anglais) et appartiennent à leurs auteurs : le lien vers le post d'origine est donné pour chacun.

## Sommaire
- [1. Template amélioré (showreel)](#1-template-amélioré-showreel)
- [2. Prompts détaillés (les plus utiles)](#2-prompts-détaillés-les-plus-utiles)
- [3. Skills Claude Code](#3-skills-claude-code)
- [4. Prompts courts](#4-prompts-courts)

## 1. Template amélioré (showreel)

### The showreel prompt
Source : https://prompt-motion.com/templates/showreel

```text
<direction>
A 15-second motion design showreel that proves you are a world-class motion designer. Concept: your pick (e.g. "ink becomes type becomes architecture"). Commit to it and name it in one line before you start. Every shot is made out of the previous one: shapes, type and color transform into the next scene instead of cutting or fading.
One typeface (Geist, Inter or a bold display face from Google Fonts), a palette of at most three colors plus black and white, one consistent camera language.
Show range: kinetic type, shape morphing, a 2D-to-3D moment, a data or UI moment, and an end title. Give each one an equal share of the time.
Banned: particle bursts, glows, lens flares, camera shake, RGB split, crossfades, generic gradients, bouncy easing, holds longer than half a second, anything that looks like a template.
</direction>

<structure>
120 BPM, something happens on every beat.
First bar: hook. Then one technique per bar, each flowing out of the last. Last full bar: the strongest moment. Final half bar: end title, and the final frame matches the first so it loops.
</structure>

<build>
1\. One HTML file at 1920x1080. Every style is computed from time inside window.seek(t): no CSS animations, no timers, no state carried between frames.
2\. Use spring and exponential easing written as functions of time. Blur follows speed and direction on fast moves.
3\. Write a soundtrack in code with the Web Audio API (OfflineAudioContext): a kick on every beat, a riser into the last full bar, a hit on each scene change. Render it to WAV.
4\. Render with Playwright at 60fps, 3 subframes per frame blended with ffmpeg tmix for motion blur, then mux the audio.
5\. Before the full render, render one frame per beat and look at them. Fix anything cluttered, off the beat, overlapping or hard to read.
</build>

<start>
Tell me the concept and show a beat-by-beat storyboard, then build it without asking me anything else. Give me the final MP4.
</start>
```

## 2. Prompts détaillés (les plus utiles)

Ce sont des cahiers des charges complets : direction artistique, timeline, build, pièges. Ils sont classés du plus long au plus court.

### Taxtello bookkeeping app film
*@daniel_haida · Remotion · Sep 27, 2026* — tags : Product UI, Charts
Source : https://prompt-motion.com/daniel-haida-8691d4
Post d'origine : https://x.com/daniel_haida/status/2104139720829636937

```text
You are the senior motion designer, product designer and Remotion engineer for Taxtello.

Your task is to create a genuinely premium, Apple-level product film for Taxtello.

This is NOT a generic SaaS explainer.
This is NOT a feature walkthrough.
This is NOT a startup template animation.

I want a maximum 15-second brand/product showreel that makes Taxtello look like a mature, expensive, beautifully designed financial product.

Think:

Apple product launch film
× premium fintech
× editorial motion design
× restrained Stripe-like product presentation
× Taxtello's own visual identity

The desired reaction is:

“Wait, this is a German bookkeeping app?”

The film should feel expensive.

────────────────────────────────────
REPO / SOURCE OF TRUTH
────────────────────────────────────

First inspect the real repositories before designing anything.

Main product:
/taxtello/main

Existing Remotion project:
/taxtello/beta-motion

Important real brand sources:

/taxtello/main/public/css/app/_00-tokens.css
/taxtello/main/docs/design/TOKENS.md
/taxtello/main/public/taxtello-wordmark.png
/taxtello/main/public/icons.svg

Existing current product screenshots can be found under:

/taxtello/main/artifacts/smoke-ui-smoke/

Prefer the newest valid screenshots/current source over stale artifacts.

There is already an existing 24-second Remotion hero animation in
/taxtello/beta-motion.

DO NOT replace it.
DO NOT regress it.
DO NOT force its current AI-connections storyline into this new film.

Create a new independent composition for this task, e.g.

TaxtelloShowreel15

You may reuse good infrastructure, fonts, rendering utilities, motion primitives,
easing curves, asset loading and QA infrastructure from beta-motion where useful.

But creatively this should be a new film.

Before implementation, inspect the actual Taxtello UI and understand the product.

Do not invent functionality that does not exist.

────────────────────────────────────
REAL TAXTELLO VISUAL LANGUAGE
────────────────────────────────────

Use the real design system.

Core palette:

Background:
#0c0f1a

Elevated surfaces:
#111525
#131722
#1a2032

Primary brand gold:
#e8b84b

Gold highlight:
#f5d07a

Gold depth:
#9b6d18

Primary text:
#e8eaf2

Strong warm white:
#f6f4eb

Secondary text:
#8b93b5

Positive:
#34d399

Negative/error only where semantically necessary:
#f87171

Typography:
Plus Jakarta Sans

Numbers / financial values where appropriate:
JetBrains Mono

Use the actual Taxtello wordmark and/or Taxtello mark.
Do not redraw or approximate the logo.

Taxtello's gold should feel like a precious accent, not a yellow UI flood.

Think:
dark metal
warm gold
glass
ink
precision
quiet confidence

NOT:
cyberpunk
crypto
neon
gaming
generic AI purple
rainbow gradients

────────────────────────────────────
CORE CREATIVE RULES
────────────────────────────────────

Follow these rules ruthlessly:

1\. ONE SHOT = ONE IDEA.

2\. Every scene needs room to breathe.

3\. The product UI is the hero.

4\. Do not plaster explanatory copy everywhere.

5\. Do not use hard cuts unless there is a deliberate reason.

6\. Prefer object-driven transitions:
a card becomes the next card,
a chart line becomes a connector,
a receipt becomes a booking,
a number becomes another interface element,
the camera moves through the product.

7\. Use premium easing.
No linear movement.

8\. Motion should overlap naturally.
Elements should not all start and stop at exactly the same frame.

9\. Use depth sparingly:
perspective,
soft parallax,
scale,
foreground/background separation,
controlled depth of field if achievable.

10\. NO effect exists simply because it looks cool.

11\. No particle spam.

12\. No fake glassmorphism everywhere.

13\. No excessive blur.

14\. No pointless 3D spinning cards.

15\. No constant zooming.

16\. No 20 different animation styles.

17\. No bouncing UI.

18\. No giant marketing paragraph.

19\. Do not imitate a particular Apple commercial shot-for-shot.
Capture the philosophy and production quality instead.

The visual confidence should come from restraint.

────────────────────────────────────
FORMAT
────────────────────────────────────

Primary master:

1920 × 1080
60 fps
16:9
H.264
maximum duration: 15.0 seconds

Target runtime:
approximately 14.0–15.0 seconds.

It must work as a social-media product reveal even without sound.

If practical AFTER the master is finished, also create a deliberately recomposed
vertical/social variant.

Do not merely crop the desktop composition.

But the desktop master is the priority.

────────────────────────────────────
STORY / EMOTIONAL ARC
────────────────────────────────────

Do not make this a list of five features.

It should feel like one continuous thought:

CHAOS → CONTROL → CLARITY → TAXTELLO

The first 1.5 seconds must already look premium.

The first meaningful product moment should happen by ~2 seconds.

No five-second logo intro.

Possible narrative direction:

“Everything about your business, finally in one place.”

But SHOW this instead of explaining it.

I want approximately four visual ideas across the whole film.

Use the strongest REAL Taxtello surfaces you find in the repository.

Strong candidates include:

• Finanzcockpit / Dashboard
• Rechnungen
• Belege
• Bank / matching
• Steuergesundheit / tax overview

You do NOT need to show all of them.

Choose the visually strongest combination.

────────────────────────────────────
SUGGESTED 15-SECOND STORYBOARD
────────────────────────────────────

Treat this as a strong starting point, not a rigid template.

0.00 – 1.20

BLACK / NAVY.

A tiny warm-gold glint appears.

The glint elegantly reveals either the Taxtello mark or a fragment of the
wordmark.

No generic logo fade.

Think machined precision.

The camera moves through or past the mark and the UI begins to emerge from it.

Very little or no copy.

─────────────────

1.20 – 4.40

FINANCIAL CONTROL.

Reveal the actual Taxtello Cockpit as a dimensional product surface.

Not just a screenshot placed on screen.

Reconstruct/crop/layer it so individual interface regions can animate.

The hero financial number resolves crisply.
The chart draws in.
Supporting metrics settle slightly later.

Use subtle stagger.

A single line of copy may appear, for example:

“Alles im Blick.”

or another equally short German phrase if you find something more fitting.

Maximum ~3–4 words.

The interface must remain recognizable as the real product.

─────────────────

4.40 – 7.50

DOCUMENT / BOOKKEEPING TRANSFORMATION.

Use a visual object from the previous scene as the transition.

Example:

A gold chart point expands into the corner of a receipt/card.
The camera follows it.
A receipt/document enters.
Taxtello identifies or organizes it.
The document snaps elegantly into its corresponding booking / financial record.

Use magnetic alignment and precision.

No cheesy scanner laser.

No floating paper tornado.

Possible micro-copy:

“Belege. Erledigt.”

Only if it improves the scene.

─────────────────

7.50 – 10.70

MONEY / INVOICES.

Morph or transition naturally into the real Rechnungen interface.

Use one strong moment:

an invoice status changes,
a payment resolves,
an amount moves into place,
or the overview assembles itself.

Numbers should feel tactile and precise.

Use JetBrains Mono where this matches the actual product.

Gold highlights the active state.

Green is used only for a genuinely positive semantic state.

Potential copy:

“Geld. Im Griff.”

Again: optional and extremely short.

─────────────────

10.70 – 12.80

TAX / CLARITY.

Transition into the real Taxtello tax-health / financial guidance surface.

Do not claim that Taxtello magically guarantees correct taxes.

Communicate visibility and control.

Example:

multiple noisy signals collapse into one calm, structured tax overview.

Potential copy:

“Steuern im Blick.”

This scene should feel calmer than the previous scene.

The rhythm briefly slows.

─────────────────

12.80 – 15.00

BRAND PAYOFF.

Pull the camera outward.

The UI compresses or folds into one beautiful Taxtello product object / surface.

Darkness returns around it.

The gold Taxtello wordmark resolves.

One short brand line underneath.

Explore strong final lines such as:

“Dein Business. Klar.”

“Buchhaltung. Unter Kontrolle.”

“Einfach mehr Überblick.”

“Alles fürs Business. An einem Ort.”

Choose based on the actual product positioning you find in the repo.

Do not use a line simply because I suggested it.

The final frame must have enough stillness to register.

End confidently.

No giant bouncing CTA.

────────────────────────────────────
TRANSITIONS
────────────────────────────────────

This is one of the most important parts.

I want transitions that make the viewer think:

“Of course the next scene came from that.”

Good:

chart line → document edge
gold pill → invoice button
financial number → amount in invoice
card edge → next surface
camera push through interface element
shared geometry
mask reveal using actual product shapes

Bad:

crossfade
random wipe
spin transition
glitch
whip-pan every two seconds
generic SaaS slide-left
zoom-blur spam

Direct cuts are allowed only when a deliberate rhythmic impact benefits the film.

────────────────────────────────────
MOTION
────────────────────────────────────

Motion needs weight.

Use curves comparable to:

cubic-bezier(0.16, 1, 0.3, 1)

where appropriate.

Different elements should have subtly different arrival times.

Prefer:

anticipation
overshoot below ~2%
settling
motion continuation
shared velocity between scenes

Avoid cartoon springiness.

Camera movement should feel like a high-end macro product shoot.

Imagine we are filming a physical premium object even though it is software.

────────────────────────────────────
LIGHTING / MATERIAL
────────────────────────────────────

Use extremely subtle environmental lighting.

Possible treatments:

• soft gold rim lighting
• dark navy falloff
• faint ambient bloom
• soft specular highlight passing across a surface
• restrained vignette
• subtle grain if it materially helps

Keep the interface crisp.

Do NOT blur the product just to look cinematic.

No fake glossy reflections that destroy legibility.

────────────────────────────────────
TYPOGRAPHY
────────────────────────────────────

Use very little copy.

No sentence should compete with the product.

Headlines should generally fit on one line.

Use Plus Jakarta Sans.

Strong typography may occasionally scale very large and become a transition
device itself.

Avoid generic motion-graphics behavior where every word animates independently.

Typography should move as designed objects.

────────────────────────────────────
SOUND / RHYTHM
────────────────────────────────────

Design the motion as if it were cut to approximately 115–120 BPM:
premium, kinetic, sophisticated, not frantic.

Important moments should land musically.

Suggested sound language:

• low soft impact for major reveal
• restrained tactile UI clicks
• subtle metallic/glass tonal tick
• soft low-frequency movement during camera transitions
• elegant resolved tone at the logo payoff

Avoid:

• huge cinematic trailer boom
• EDM risers
• loud whooshes everywhere
• stock “tech interface” sounds
• rap beat
• aggressive bass

If there is no legally safe music/audio asset in the project, DO NOT pull
copyrighted audio from the internet.

Deliver the visual master without copyrighted music and create a concise cue
sheet describing where music/SFX should hit.

If suitable safe/local audio exists, use it.

────────────────────────────────────
REAL PRODUCT ONLY
────────────────────────────────────

This is critical.

Inspect current main.

Do not invent screens.

Do not invent metrics that imply real customer data.

Use clearly synthetic/demo-safe values if required.

Do not accidentally expose any personal, test-user or production information.

Reuse the visual structure of the actual Taxtello UI.

If a screen needs to be motion-separated, recreate it faithfully in React from
the real design system instead of simply scaling a giant screenshot.

The result should still look unmistakably like Taxtello.

────────────────────────────────────
IMPLEMENTATION EXPECTATIONS
────────────────────────────────────

Work directly in:

/taxtello/beta-motion

Create the new composition alongside the existing one.

Keep existing compositions working.

Structure the new work cleanly.

Prefer reusable primitives for:

• camera surface
• product frame
• masked transitions
• text reveals
• UI region reveals
• ambient lighting
• shared-element transitions

Avoid one 1,500-line component.

Use deterministic Remotion animation driven by frame/time.

No setTimeout.
No nondeterministic animations.

Respect 60 fps throughout.

Use interpolation/spring/easing deliberately.

────────────────────────────────────
DO NOT STOP AFTER FIRST IMPLEMENTATION
────────────────────────────────────

This is a visual task.

You MUST review the actual rendered output.

Required workflow:

1\. Inspect repository and real brand/product.

2\. Write a concise storyboard with:
\- exact timestamps
\- key visual
\- transition logic
\- copy
\- intended emotional rhythm

3\. Implement it.

4\. Run typecheck / relevant checks.

5\. Render representative frames at roughly:
0.0 s
1.0 s
2.5 s
4.5 s
6.5 s
8.5 s
10.5 s
12.5 s
14.0 s
14.8 s

6\. VISUALLY INSPECT THOSE IMAGES.

Do not merely confirm that rendering succeeded.

Ask:

Does this look like an Apple-tier product film?

Does anything look like a template?

Is there too much on screen?

Is the product legible?

Are transitions logically connected?

Does Taxtello gold feel premium?

Does every frame look composed?

7\. Fix visual weaknesses.

8\. Render the complete film.

9\. Inspect multiple exact decoded frames from the final MP4, not only browser
screenshots.

10\. Iterate again if necessary.

Do not declare success because the code compiles.

The deliverable is the FILM.

────────────────────────────────────
QUALITY BAR
────────────────────────────────────

Reject your own result if it feels like:

• a SaaS template
• a PowerPoint animation
• a website screen recording
• a generic Remotion demo
• a crypto advertisement
• an AI-generated promo template
• five screenshots sliding around
• excessive marketing copy

Every important frame should be good enough to use as a still advertisement.

I would rather have:

3 extraordinary visual moments

than

10 mediocre feature animations.

────────────────────────────────────
FINAL DELIVERABLES
────────────────────────────────────

Provide:

1\. Final storyboard
2\. New Remotion composition source
3\. 1920×1080 / 60fps final MP4
4\. Poster/final frame
5\. Contact sheet with representative frames from the film
6\. Exact runtime
7\. List of real Taxtello assets/screens used
8\. Brief explanation of the motion language
9\. Any remaining visual compromises
10\. Commands to reproduce the render

Save outputs in a clearly named directory such as:

/taxtello/beta-motion/out/showreel-15/

Do not deploy anything.
Do not modify production data.
Do not merge anything.

Go all out creatively, but exercise ruthless restraint.

Make Taxtello look expensive.
```

### Launch video remake comparison
*@notdwd · Sep 28, 2026* — tags : Product UI, Photos, Music
Source : https://prompt-motion.com/notdwd-c2037d
Post d'origine : https://x.com/notdwd/status/2104401208958230764

```text
<inputs>
Ask me for: my product name, a logo (or let you draw a simple mark), my brand colours (or pull them from my logo), the one-line thing a user types into the prompt box, the page that answers it (title + 2–3 sentences with one key phrase), two feature names for the stacked cards, and a music track. If I skip any, use the defaults: product "Frame by Frame" living inside its Whop hub, a viewfinder mark (four corner brackets around a bold "FF"), prompt "Make a launch video for my app", a lesson page titled "2.1 Choose a reference", cards "Launch" and "Sound", and Mixkit's free house track "Rising Forest" slowed to 124 BPM.
</inputs>

<direction>
A 12 second square product sting, 1080x1080, frame numbers at 29.97 fps (f0–f359), master rendered at 59.94 fps. Apple-keynote feel: soft, white, bright blue, glassy. The camera never cuts on a still frame: every shot enters already moving (exponential ease-out, 12–19% of the remaining distance per frame) and leaves on an accelerating move or a blur ramp. Blur follows speed and direction on every move.
Palette: my brand colours mapped onto these roles; if I give none, use page #FDFDFB, haze #B7CFEB, ice #E6F0FA, deep blue #294376 → #769CC2 sky gradient, navy #1E2F52, accent blues #2F6BFF / #3CC8F0 / mint #4ED6A0, white. Type: Inter (400/500/600/700). No purple, violet, magenta or orange anywhere.
Story: the product header rises out of a blue haze inside a light app window → a cursor glides in, turns to face where it's going, grows on hover and clicks the logo → hard cut on the music drop to the app icon with four squares orbiting into a cross → the icon collapses into a Mac menu bar → the cursor clicks the menu-bar icon, a frosted glass prompt box springs out and the prompt types → whip-tilt up through a light-blue flash into the answer page scrolling into place → a card rises over it → blur-dissolve to two stacked cards with giant frosted-glass titles → blur-dissolve to the lone logo disc → hard cut to a black end card with a glowing wordmark.
Banned: crossfades, frozen frames (except one hold in S7), stock UI kits, glows on UI text, Math.random, anything that looks like a template.
</direction>

<structure>
Coordinates are px on the 1080 stage. Music beat k = 0.048 + 0.4838·k s (124 BPM, one beat = 14.5 frames). The three hard cuts f72, f101, f159 land 2 frames before a beat: keep these exact frames.
S1 f0–71, header + window + click: haze #B7CFEB fading to #FDFDFB by f28, keep a blue floor glow #DBEEFD at the bottom. Header on one line: logo disc ⌀132 (#FBFCFE, 1px rim #E8E8EA, dark mark), the product name (Inter 500), a dark capsule pill "on Whop" (#2F2E2F, white text); the whole lockup spans x474–1063, centre line rises y932 (f0) → 776 (f2) → 683 (f5) → 608 (f10) → 546 (f24) → 536 (f37), drifting 1 px/frame after. Name appears f2 blurred, pill f4–5 heavily blurred and sliding 15 px left as it sharpens. A light hub window (radius 93, fill #FCFDFF, top band #F1F6FF, blue inner floor glow) fades in around it: opacity 0 to f14, 0.53 f15, 0.7 f19, 1.0 f24; top-left corner (408,405), runs off the right and bottom. Inside: a search pill in the top band, a left icon column (Courses icon at (537,739), faded Chat icon at (537,900)), and a course card from (764,700) off-frame with its cover image, title and "Course · 8 lessons". Cursor (black macOS arrow, white outline, 32x39) appears f27 at (891,393), glides left decelerating to (770,383) f44, rotates to point down-left f47–51 as it dives, lands on the disc's lower right (629,564) f56 → (587,546) f59 → (555,531) f71; grows ×1.55 on hover from f56; a soft ice ring (#D5F3FF → #F7FEFF, outer ⌀174) lights around the disc from f53. Camera zooms about (540,540): 1.0 f46 → 1.2 f60 ease-in-out, holds f61, then eases out accelerating to 1.04 at f71 while the cursor presses (shrinks 15% f69–71).
S2 f72–100, icon + orbit: navy squircle app icon (#294376 → #1E2F52, white mark), 276 px at f72 shrinking ease-out to 178 px by f86, radius 28% of width, on a grey halo disc #E9E9E7 growing ⌀240 (f75) → 326 (f86). Four 92 px squares (radius 26) spin in counter-clockwise, decelerating, and lock into a cross at orbit radius ≈216 by f86: white (1px #E3E8EF edge + faint shadow) left, #2F6BFF top, #3CC8F0 right, #4ED6A0 bottom. f88–100: the icon shrinks accelerating to ≈40 px, the squares slide into a row on its right (white slips behind the icon), blur ramps 0.3 → 6 px.
S3 f101–158, menu bar + prompt: white page above a black laptop bezel band (y425–475, top highlight #686866), a dark navy menu bar (y477–538), wallpaper below = the blue sky gradient with thin white line art (one big circle, two horizontal lines, one vertical, a four-point sparkle at a crossing, soft teal glow top-right). Menu bar right cluster in white: Wi-Fi, battery, toggles, the product mark at x531–584, three ⌀36 dots #2F6BFF / #3CC8F0 / #4ED6A0 at x612, 661, 709, "Mon Jun 22 9:41 AM" 34 px. Enters blurred 3 px and settling by f110. Cursor rises from below (f102), sits on the mark, presses f113–117. Camera pans content right +125 px f115–130 (fastest f118–120). A frosted glass box (white-blue glass over the sky, bright top rim, radius 60) springs out from under the mark f116: width peaks 744 at f126 and settles 726x228 by f138 around x196–922, y568–797. The prompt types from f121 (first legible "Make ") to f150 (complete) at about 1 char/frame with a 1-frame hold every 2–3 chars; caret always on; three white outline icons along the bottom; send button #2F6BFF ⌀51 with a white up arrow. From f136 the whole scene drifts up, accelerating into a whip-tilt (f158 moving ≈25 px/frame, vertical blur ≈6–8 px) while the page tints #E6F4FE over f154–158.
S4 f159–186, answer page: a light course lesson page (breadcrumb, title, body): text column x120, body 47 px Inter 400 grey #BCBCBA, line pitch 58, one key phrase ("frame for frame") in black 600. It arrives smeared and 420 px low, scrolls up with offsets 420, 315, 210, 170, 140, 116, 96, 81 (f166) … 14 (f175) … 0 (f180), then creeps −6 px by f186. Blur 24 px (f159) → 1.5 (f165) → 0. Flash #E2F4FE fading to #FDFDFB by f165. A cursor pointing straight up rides the scroll and stops under the key phrase (≈(450,591) f180), then drifts right.
S5 f187–214, card: a white card (x203–878, runs off the bottom) rises over the page: cover image 627x536 inset 24 px, radius 64, a light grabber bar at its top centre, caption semibold 38 px black, sub-caption grey 23 px. Cover top y642 (f187) → 456 (f191) → 395 (f196) → 369 (f200) → 348 (f205), then keeps drifting up ~4 px/frame. Card blur peaks 3.8 px at f189, sharp by f201; the page behind blurs to ≈2.5 px. Exit f207–214: card shrinks ~5% and rises while the whole frame blurs 1 → 7 px; cut at the blur peak.
S6 f215–244, two cards: white page, two stacked cards 538x348 (radius 57, gap 36) centred on x540, top card settling at y168 by f230, bottom at y552. Each: cover art (no text baked into it), a frosted pill top-left ("Module 3" / "Module 5"), a frosted round "•••" top-right, and a huge bold title along the bottom edge made of frosted glass (a blurred, lightened copy of the image clipped to the letters, cut off by the card's bottom edge): "Launch" and "Sound". Both enter blurred 12 px and sharp by f224; the top card enters 8% large and rises from y264; the bottom card rises from y927, staggered behind it. They drift up 3 px/frame f230–238, then accelerate up and blur out into the cut.
S7 f245–300, logo disc: page #FDFDFB, disc ⌀168 #F6F6F6 with the dark mark, rises into the centre (top y569 f245 → 491 f250 → 468 f255 → 456 f269) with a vertical smear on the cut frame, holds still f269–287 (the only frozen stretch), then shrinks accelerating to ⌀123 at f300.
S8 f301–359, end card: black radial background (#020204 corners, ≈#272729 around the word), the wordmark in Inter 600, white #F3F3F5 with a tight glow plus a wide soft halo, centred (540,540). Word width: ≈1650 px f301 (horizontally smeared, zoom streaks) → 1350 f302 → 1110 f303 → 1049 f304 → 734 f309 → 678 f311 → 563 f320 → 516 f342 (≈1 px/frame shrink) → 492 f350, then collapses ease-in: 450 f355 → 267 f359 with blur rising to 3.5 px. The film ends mid-collapse.
</structure>

<build>
1\. One HTML page, 1080x1080, drawn by seek(t) as a pure function of the frame number. No CSS transitions, no timers, no Math.random (seeded hashes only). Shots register as {f0, f1, render(localFrame)}.
2\. Every value is continuous in the frame number (the 59.94 master renders half frames): animate with keyframe tables kf(frame, [[f, value], ...], ease) and per-frame lookup tables with linear interpolation. No Math.floor on motion.
3\. Blur: CSS filter blur for round blur, SVG feGaussianBlur with separate x/y stdDeviation for directional smears. Zoom smear on the end card = 20–30 scaled, faded copies of the word. Frosted glass = a blurred, lightened copy of what's behind, clipped to the shape.
4\. Cursor: one SVG macOS arrow (black fill, white outline, soft shadow) with rotation and scale, reused in S1, S3, S4.
5\. Sound (no voice), exactly 12.075 s: music at 124 BPM, soft intro, the drop at 2.47 s (beat 5, the f72 cut leads it by 2 frames). Synthesized SFX: soft impact 0.10 s; whooshes peaking at the cuts 2.402, 3.370, 5.305, 10.043 s; transition hits exactly on 6.240 s and 8.175 s; clicks at 2.33 and 3.83 s; very quiet key ticks every ~32 ms over 4.04–5.00 s; a soft shimmer at 10.05 s. Master to −14 LUFS, true peak −1 dBTP, no fade except the last 60 ms.
6\. Render with Playwright (one screenshot per frame, fonts loaded first), encode H.264 yuv420p at 60000/1001, mux the audio.
</build>

<gotchas>
Measure text only after the fonts load. A long product name won't fit where a 5-letter name did: scale the whole lockup (disc gap, name, pill) to fit the span x474–1063, don't let the pill fall off-frame. A white orbit square vanishes on the white page without a 1px edge and a faint shadow. Don't put images with their own text inside the S6 cards, or the glass title doubles up. Keep the cut frames exact even where they don't sit on a beat. Nothing freezes except S7 f269–287. Heavy blur tables can wipe a shape out completely: if a frame looks empty, lower the blur until the shape still reads.
</gotchas>

<start>
Ask me for the inputs. Then show me 4 stills (f40 header in the window, f86 icon cross, f150 finished prompt, f230 the two cards) before you render the full film.
</start>
```

### Frame by Frame launch video
*@notdwd · Sep 27, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/notdwd-7de38a
Post d'origine : https://x.com/notdwd/status/2104229441211969685

```text
<inputs>
Ask me for: my product name, a logo (or let you draw a simple mark), the one-line thing a user types into the prompt box, the page that answers it (title + 2–3 sentences with one key phrase), two feature names for the stacked cards, and a music track. If I skip any, use the defaults: product "Frame by Frame" living inside its Whop hub, a viewfinder mark (four corner brackets around a bold "FF"), prompt "Make a launch video for my app", a lesson page titled "2.1 Choose a reference", cards "Launch" and "Sound", and Mixkit's free house track "Rising Forest" slowed to 124 BPM.
</inputs>

<direction>
A 12 second square product sting, 1080x1080, frame numbers at 29.97 fps (f0–f359), master rendered at 59.94 fps. Apple-keynote feel: soft, white, bright blue, glassy. The camera never cuts on a still frame: every shot enters already moving (exponential ease-out, 12–19% of the remaining distance per frame) and leaves on an accelerating move or a blur ramp. Blur follows speed and direction on every move.
Palette: page #FDFDFB, haze #B7CFEB, ice #E6F0FA, deep blue #294376 → #769CC2 sky gradient, navy #1E2F52, accent blues #2F6BFF / #3CC8F0 / mint #4ED6A0, white. Type: Inter (400/500/600/700). No purple, violet, magenta or orange anywhere.
Story: the product header rises out of a blue haze inside a light app window → a cursor glides in, turns to face where it's going, grows on hover and clicks the logo → hard cut on the music drop to the app icon with four squares orbiting into a cross → the icon collapses into a Mac menu bar → the cursor clicks the menu-bar icon, a frosted glass prompt box springs out and the prompt types → whip-tilt up through a light-blue flash into the answer page scrolling into place → a card rises over it → blur-dissolve to two stacked cards with giant frosted-glass titles → blur-dissolve to the lone logo disc → hard cut to a black end card with a glowing wordmark.
Banned: crossfades, frozen frames (except one hold in S7), stock UI kits, glows on UI text, Math.random, anything that looks like a template.
</direction>

<structure>
Coordinates are px on the 1080 stage. Music beat k = 0.048 + 0.4838·k s (124 BPM, one beat = 14.5 frames). The three hard cuts f72, f101, f159 land 2 frames before a beat: keep these exact frames.
S1 f0–71, header + window + click: haze #B7CFEB fading to #FDFDFB by f28, keep a blue floor glow #DBEEFD at the bottom. Header on one line: logo disc ⌀132 (#FBFCFE, 1px rim #E8E8EA, dark mark), the product name (Inter 500), a dark capsule pill "on Whop" (#2F2E2F, white text); the whole lockup spans x474–1063, centre line rises y932 (f0) → 776 (f2) → 683 (f5) → 608 (f10) → 546 (f24) → 536 (f37), drifting 1 px/frame after. Name appears f2 blurred, pill f4–5 heavily blurred and sliding 15 px left as it sharpens. A light hub window (radius 93, fill #FCFDFF, top band #F1F6FF, blue inner floor glow) fades in around it: opacity 0 to f14, 0.53 f15, 0.7 f19, 1.0 f24; top-left corner (408,405), runs off the right and bottom. Inside: a search pill in the top band, a left icon column (Courses icon at (537,739), faded Chat icon at (537,900)), and a course card from (764,700) off-frame with its cover image, title and "Course · 8 lessons". Cursor (black macOS arrow, white outline, 32x39) appears f27 at (891,393), glides left decelerating to (770,383) f44, rotates to point down-left f47–51 as it dives, lands on the disc's lower right (629,564) f56 → (587,546) f59 → (555,531) f71; grows ×1.55 on hover from f56; a soft ice ring (#D5F3FF → #F7FEFF, outer ⌀174) lights around the disc from f53. Camera zooms about (540,540): 1.0 f46 → 1.2 f60 ease-in-out, holds f61, then eases out accelerating to 1.04 at f71 while the cursor presses (shrinks 15% f69–71).
S2 f72–100, icon + orbit: navy squircle app icon (#294376 → #1E2F52, white mark), 276 px at f72 shrinking ease-out to 178 px by f86, radius 28% of width, on a grey halo disc #E9E9E7 growing ⌀240 (f75) → 326 (f86). Four 92 px squares (radius 26) spin in counter-clockwise, decelerating, and lock into a cross at orbit radius ≈216 by f86: white (1px #E3E8EF edge + faint shadow) left, #2F6BFF top, #3CC8F0 right, #4ED6A0 bottom. f88–100: the icon shrinks accelerating to ≈40 px, the squares slide into a row on its right (white slips behind the icon), blur ramps 0.3 → 6 px.
S3 f101–158, menu bar + prompt: white page above a black laptop bezel band (y425–475, top highlight #686866), a dark navy menu bar (y477–538), wallpaper below = the blue sky gradient with thin white line art (one big circle, two horizontal lines, one vertical, a four-point sparkle at a crossing, soft teal glow top-right). Menu bar right cluster in white: Wi-Fi, battery, toggles, the product mark at x531–584, three ⌀36 dots #2F6BFF / #3CC8F0 / #4ED6A0 at x612, 661, 709, "Mon Jun 22 9:41 AM" 34 px. Enters blurred 3 px and settling by f110. Cursor rises from below (f102), sits on the mark, presses f113–117. Camera pans content right +125 px f115–130 (fastest f118–120). A frosted glass box (white-blue glass over the sky, bright top rim, radius 60) springs out from under the mark f116: width peaks 744 at f126 and settles 726x228 by f138 around x196–922, y568–797. The prompt types from f121 (first legible "Make ") to f150 (complete) at about 1 char/frame with a 1-frame hold every 2–3 chars; caret always on; three white outline icons along the bottom; send button #2F6BFF ⌀51 with a white up arrow. From f136 the whole scene drifts up, accelerating into a whip-tilt (f158 moving ≈25 px/frame, vertical blur ≈6–8 px) while the page tints #E6F4FE over f154–158.
S4 f159–186, answer page: a light course lesson page (breadcrumb, title, body): text column x120, body 47 px Inter 400 grey #BCBCBA, line pitch 58, one key phrase ("frame for frame") in black 600. It arrives smeared and 420 px low, scrolls up with offsets 420, 315, 210, 170, 140, 116, 96, 81 (f166) … 14 (f175) … 0 (f180), then creeps −6 px by f186. Blur 24 px (f159) → 1.5 (f165) → 0. Flash #E2F4FE fading to #FDFDFB by f165. A cursor pointing straight up rides the scroll and stops under the key phrase (≈(450,591) f180), then drifts right.
S5 f187–214, card: a white card (x203–878, runs off the bottom) rises over the page: cover image 627x536 inset 24 px, radius 64, a light grabber bar at its top centre, caption semibold 38 px black, sub-caption grey 23 px. Cover top y642 (f187) → 456 (f191) → 395 (f196) → 369 (f200) → 348 (f205), then keeps drifting up ~4 px/frame. Card blur peaks 3.8 px at f189, sharp by f201; the page behind blurs to ≈2.5 px. Exit f207–214: card shrinks ~5% and rises while the whole frame blurs 1 → 7 px; cut at the blur peak.
S6 f215–244, two cards: white page, two stacked cards 538x348 (radius 57, gap 36) centred on x540, top card settling at y168 by f230, bottom at y552. Each: cover art (no text baked into it), a frosted pill top-left ("Module 3" / "Module 5"), a frosted round "•••" top-right, and a huge bold title along the bottom edge made of frosted glass (a blurred, lightened copy of the image clipped to the letters, cut off by the card's bottom edge): "Launch" and "Sound". Both enter blurred 12 px and sharp by f224; the top card enters 8% large and rises from y264; the bottom card rises from y927, staggered behind it. They drift up 3 px/frame f230–238, then accelerate up and blur out into the cut.
S7 f245–300, logo disc: page #FDFDFB, disc ⌀168 #F6F6F6 with the dark mark, rises into the centre (top y569 f245 → 491 f250 → 468 f255 → 456 f269) with a vertical smear on the cut frame, holds still f269–287 (the only frozen stretch), then shrinks accelerating to ⌀123 at f300.
S8 f301–359, end card: black radial background (#020204 corners, ≈#272729 around the word), the wordmark in Inter 600, white #F3F3F5 with a tight glow plus a wide soft halo, centred (540,540). Word width: ≈1650 px f301 (horizontally smeared, zoom streaks) → 1350 f302 → 1110 f303 → 1049 f304 → 734 f309 → 678 f311 → 563 f320 → 516 f342 (≈1 px/frame shrink) → 492 f350, then collapses ease-in: 450 f355 → 267 f359 with blur rising to 3.5 px. The film ends mid-collapse.
</structure>

<build>
1\. One HTML page, 1080x1080, drawn by seek(t) as a pure function of the frame number. No CSS transitions, no timers, no Math.random (seeded hashes only). Shots register as {f0, f1, render(localFrame)}.
2\. Every value is continuous in the frame number (the 59.94 master renders half frames): animate with keyframe tables kf(frame, [[f, value], ...], ease) and per-frame lookup tables with linear interpolation. No Math.floor on motion.
3\. Blur: CSS filter blur for round blur, SVG feGaussianBlur with separate x/y stdDeviation for directional smears. Zoom smear on the end card = 20–30 scaled, faded copies of the word. Frosted glass = a blurred, lightened copy of what's behind, clipped to the shape.
4\. Cursor: one SVG macOS arrow (black fill, white outline, soft shadow) with rotation and scale, reused in S1, S3, S4.
5\. Sound (no voice), exactly 12.075 s: music at 124 BPM, soft intro, the drop at 2.47 s (beat 5, the f72 cut leads it by 2 frames). Synthesized SFX: soft impact 0.10 s; whooshes peaking at the cuts 2.402, 3.370, 5.305, 10.043 s; transition hits exactly on 6.240 s and 8.175 s; clicks at 2.33 and 3.83 s; very quiet key ticks every ~32 ms over 4.04–5.00 s; a soft shimmer at 10.05 s. Master to −14 LUFS, true peak −1 dBTP, no fade except the last 60 ms.
6\. Render with Playwright (one screenshot per frame, fonts loaded first), encode H.264 yuv420p at 60000/1001, mux the audio.
</build>

<gotchas>
Measure text only after the fonts load. A long product name won't fit where a 5-letter name did: scale the whole lockup (disc gap, name, pill) to fit the span x474–1063, don't let the pill fall off-frame. A white orbit square vanishes on the white page without a 1px edge and a faint shadow. Don't put images with their own text inside the S6 cards, or the glass title doubles up. Keep the cut frames exact even where they don't sit on a beat. Nothing freezes except S7 f269–287. Heavy blur tables can wipe a shape out completely: if a frame looks empty, lower the blur until the shape still reads.
</gotchas>

<start>
Ask me for the inputs. Then show me 4 stills (f40 header in the window, f86 icon cross, f150 finished prompt, f230 the two cards) before you render the full film.
</start>
```

### Spotify product film
*@brainextends · Sep 26, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/brainextends-e19ac3
Post d'origine : https://x.com/brainextends/status/2103801834930606193

```text
Create a complete, polished Spotify-themed motion graphics video from the following brief. This prompt is self-contained: no reference video or supplied assets are required.

<deliverables> An 18-second MP4 at 1920×1080 and true 60 fps, with music and subtle sound effects Complete editable source Build, render, inspect, and refine the animation before delivering it Do not stop at a storyboard, still images, or an implementation plan </deliverables>
<art_direction>
A premium music-product film presented inside a large, nearly black rounded rectangular stage
The stage occupies roughly 80% of the canvas width and 75% of its height, centered horizontally and slightly below the vertical center
Outside the stage, use a soft atmospheric green background: luminous emerald near the upper-left corner, deeper forest green toward the sides, fading to near-black at the bottom
Inside the stage:
Near-black background
White primary typography
Muted gray secondary text
Spotify green # 1ED760 for emphasis and controls
One clean sans-serif font, such as Geist or Inter
Consistent icon strokes and restrained shadows
Keep compositions compact and centered, with substantial negative space
Text should feel like music-product advertising, not oversized presentation headings
Do not add an outer caption, creator watermark, decorative footer, or progress counter
</art_direction>

<artwork> Create original square album artwork for a fictional track called “Glass Tides” by “AURA”
The hero cover is an abstract macro image of flowing pearlescent liquid silk and molten glass
Use pastel lavender, powder cyan, blush pink, champagne gold, and subtle mint
Include broad three-dimensional folds, realistic reflective highlights, delicate striations, and a prominent sweeping S-shaped fold
Fill the square edge to edge
No text, logo, or border on this hero artwork
Use this same artwork consistently throughout the film

Create additional designed playlist sleeves:
“Late Nights” in mustard yellow
“Good Energy” in pink
“Deep Focus” in blue
“Daily Mix 1”, “Daily Mix 2”, and “Daily Mix 3” in complementary colors

These should look like finished graphic-design covers, with bold typography and simple geometric motifs
</artwork>

<timeline> 0.0–0.6 seconds: A green Spotify icon grows smoothly into the center of the dark stage Give it a confident arrival with minimal overshoot
0.6–1.5 seconds:
The icon transitions into a small Spotify identity above two centered lines:
“Discover”
“new music”
The first line is white; the second is green
Reveal them with short masked vertical movements
1.5–2.4 seconds:
A stylized Spotify desktop interface rises into view
Show a slim sidebar, “Made for you”, three album cards, and small supporting rows
Use a subtle perspective tilt during the entrance, settling toward a frontal view
2.4–3.2 seconds:
Move closer to the three featured covers
Show “New for you” above them
Keep the artwork crisp, with short album titles beneath
A narrow rounded player bar now anchors the bottom of the stage
3.2–4.0 seconds:
The featured cards withdraw into a compact “Fresh finds” list
Reveal four song rows with a slight stagger
Each row contains a thumbnail, short track title, artist, and a small menu icon
4.0–4.9 seconds:
Transition into a horizontal strip of colorful playlist covers
Heading: “Every mood”
Supporting line: “Find what moves you”
The strip slides smoothly sideways, with edge cards partially cropped by the stage
4.9–5.8 seconds:
A compact search field appears
Type “Glass Tides”
Reveal one selected result beneath it, with the iridescent artwork, “AURA”, and a green play icon

5.8–6.6 seconds:
The selected artwork expands into a large centered cover
Reveal “Glass Tides” underneath, followed by “AURA” in green
Keep the player bar visible
6.6–7.5 seconds:
The same cover slides left
Track information appears on the right:
“Glass Tides”
“AURA”
“A new frequency”
Add a rounded green Play button
Coordinate the cover movement and text reveals
7.5–8.3 seconds:
A brief brand-color transformation fills the inner stage with green
The artwork contracts into a smaller centered tile
Place a small dark Spotify identity underneath
The player briefly recedes
8.3–9.8 seconds:
Return to the dark stage
The same artwork expands dramatically toward the camera, becoming oversized and cropped by the rounded stage
Restore the player at the bottom
Use controlled motion blur during the fastest part of the zoom

9.8–11.2 seconds:
The artwork clears into a centered typographic statement:
“Find your”
“rhythm”
Use white for the first line and green for the second
The player remains visible and stable beneath it
11.2–12.5 seconds:
Show “Made for your every day”
Three playlist sleeves enter with gentle perspective and small opposing tilts
They spread into six smaller sleeves across the stage
Supporting line: “Your sound, always evolving”

12.5–14.0 seconds:
The playlist layout transitions into four floating album covers
Include the iridescent hero artwork
Use restrained rotation, perspective, depth ordering, and overlap
Keep their movement coordinated rather than randomly floating
14.0–15.2 seconds:
The covers converge toward the center and fold around a green Spotify icon
The artwork withdraws as the icon becomes the focal point
Fade the player away
The Spotify icon must emerge from the same central position as the converging covers
15.2–18.0 seconds:
The icon moves slightly left and settles beside a large white “Spotify” wordmark
Keep the icon and letters separated throughout the movement
Reveal:
“Discover new music”
“every day”
The first line is white; the second is green
Hold the finished composition cleanly through the end
</timeline>
<persistent_player>
For most of the middle sequence, keep one narrow rounded player bar near the bottom of the inner stage
Include:
Small hero-art thumbnail
“Glass Tides” and “AURA”
Play and skip controls
A thin progress track
A small volume icon
Subdued dark translucent styling with a fine border
This recurring player connects the changing shots
It must remain visually secondary to the artwork
</persistent_player>

<motion_quality>
Match the energy of a tightly edited premium product film
Most visual ideas last approximately one second, but transitions remain smooth
Use continuous acceleration and deceleration
Favor critically damped springs or carefully tuned smooth easing
No repeated bouncing or large elastic overshoots
Preserve the hero artwork’s identity and position relationships through search, album detail, brand tile, and zoom
Use match-position transitions, coordinated scaling, masked reveals, and perspective
Outgoing titles must disappear before incoming titles occupy the same space
Avoid overlapping text, sudden camera resets, long blank intervals, and arbitrary full-frame crossfades
Clip every oversized cover and camera move cleanly to the rounded stage
No particles, shockwave rings, lens flares, camera shake, or unrelated stock footage
</motion_quality>

<audio> Create or select commercially usable electronic music around 120 BPM Use a clean pulse, warm bass, restrained melodic elements, and subtle transition accents Align important entrances, selections, zooms, and the logo reveal with musical events Keep effects quieter than the music No voiceover Do not use copyrighted commercial tracks without permission </audio>
<implementation_and_validation>
Build a deterministic animation driven by absolute time through an async window. seek(t) function
Every transform, opacity, mask, and UI state must be reproducible when seeking frames in any order
Do not depend on live timers, accumulated physics, or CSS transition state during export

Render true 60 fps with spatial antialiasing
Use 3–5 temporal subframe samples per output frame for restrained motion blur
Keep stationary text and artwork sharp
Inspect contact sheets and moving playback
Check the fast heading changes, artwork handoffs, zoom, cover convergence, and final wordmark spacing
Verify evenly spaced frame timestamps and the full 18-second duration
Fix visual defects before delivering the final MP4 and editable source
</implementation_and_validation>
```

### Landing page 3D scroll
*@twoclipping · WebGL2 + Playwright · Oct 14, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/twoclipping-d89be5
Post d'origine : https://x.com/twoclipping/status/2110329502676951367

```text
<inputs>
Ask me for: my landing page link, my brand name and logo mark, a two-part closing line (a statement, then a short italic tail), and a 15 second track (optional).
</inputs>

<direction>
A 14.5 second 3D fly-over of my landing page, 1440x1152 at 60fps. The page lies flat on a bright studio floor (#f9fbfb in the middle, #f2f3f6 in the corners) with a soft wide shadow around it and 24px rounded corners. One continuous camera, never a cut: it starts low over the hero and glides backwards down the page at one steady speed while looking up it, rises straight overhead to show the whole page as one strip, dives into the hero and lands it as a card under a two-line title. Focus is razor thin in front of the subject and almost none behind it, so everything near the lens melts. Cards float a little above the page with soft shadows; photos, chips and the testimonial lift off and stand up toward the lens as the camera passes them. Four small tiles of my logo lift off beside the hero button and stay with the film until the end card. The title is Geist 500, the italic tail Instrument Serif.
Banned: cuts, crossfades, stops or surges in the glide, the camera turning or swinging sideways, zooming in and back out, glows, any text laid over the page before the end card.
</direction>

<structure>
14.5 seconds: flight 0-8.2s, rise 7.75-9.25s, overhead 9.25-9.47s, dive 9.47-9.97s, title card 9.97-14.5s.
The camera 56° off straight-down and 1360px from the point it looks at, centred on the top half of the hero, the phone or product mockup sharp, four 32px logo tiles beside the button → 0-0.6: the glide eases in from rest → 0.1-1.35: the tiles lift, grow to 140-200px and hang just outside the page's top corners while the hero's chips rise to 60-80px and stand up 30° → 1.25-1.6: the glide doubles to cruising speed as the hero falls behind → 1.6: the second section's title passes the centre of the frame, its photos blurred near the lens → 1.35-2.7: that section's main photos lift to 100-130px and stand up 46°, two of its chips fly up to about 200px, stand up 54° and pass the left and right edges at 2.5 → 1.2-2.4: the tiles trail the camera 300px down the page, then drift out of the top → 3.0-7.3: every following section passes through at the same steady speed, each one sharp as it crosses the middle of the frame and soft below it; a logo tile drifts past the left edge close and blurred at 5.4 → 5.45-6.3: the testimonial card rises from 22 to 112px, stands up 30° and shows a 34px white edge → 7.3-8.2: the glide eases off as the footer arrives, the footer title sharp at 8.0 → 7.75-9.25: the rise, zooming out at an even rate while the tilt flattens (8.15-8.95) and the page's bottom edge settles 42px above the frame bottom → 9.25-9.47: the whole page as one centred strip, creeping 3.5% closer → 9.47-9.97: the dive, the page's top edge pinned to the frame top while it grows, everything below the hero fading out, then the top drops to y 283 so the hero lands as a 1018px wide card with 38px corners and a soft shadow; two logo tiles sit on its top corners, one crisp at the right edge, two huge soft blurs drift in at the bottom corners → 10.02: a white badge pill (logo + brand, 21px) fades in at y 44 → 10.12: line 1 at 74px, one word every 0.06s → 10.36: the italic tail at 82px in grey #8b8b92, one word every 0.05s, each word rising 16px out of a 12px blur in 0.34s → 10.6-14.5: hold, the card creeping 2% closer, the tiles drifting a few px.
</structure>

<build>
1\. Open my link in headless Chromium (Playwright) at 1440px wide, device scale 2, and scroll to the bottom once so lazy images and scroll animations finish. Mark the pieces that lift (cards, phone or product mockups, chips, feature photos, the testimonial, the hero button) with data-layer. Screenshot the full page with them hidden, then each piece alone on a transparent background with 28px padding, and save every piece's page position to a JSON.
2\. One WebGL2 film page, 1440x1152, every frame computed from time inside seek(t): no timers, no CSS transitions. The page is a textured quad on the floor and each piece its own quad at its height, drawn lowest first with no depth buffer. Use mipmaps and 16x anisotropic filtering or the far text shimmers.
3\. Drive the camera from one speed curve, never from a position key every half second. Focal length 1880px, 56° tilt, distance easing out from 1360 to 1700px and never back in, no turning. Speed down the page as a share of cruise (cruise is about 770 page px/s): 0 at 0s, 0.5 by 0.6s, held at 0.5 to 1.25s, 1.0 by 1.6s, held between 0.94 and 1.1 to 7.3s, then easing to 0.12 by 8.3s. Integrate it into the page position.
4\. Depth of field per pixel: blur radius = 75 x (focus - depth) / depth in front of the focus and 6 x (depth - focus) / depth behind it, capped at 120px, 40 taps on a golden-angle disc, each tap read from a mip level matched to the blur. Keep the focus on whatever crosses the middle of the frame.
5\. A lifted piece stands up by turning about its own middle, top edge rising toward the lens. Each casts a shadow on whatever is under it: the same picture in flat #1a2133, offset (0.10z, 4 + 0.36z), blurred 7 + 0.5z, 26% opacity.
6\. Rise: zoom out in log scale with a smooth trapezoid speed (speeding up 7.75-8.35s, even 8.35-8.95s, slowing to a stop at 9.25s) and hand the glide over to a camera that holds the page's bottom edge at that 42px line from 8.3 to 8.65s. Dive: log scale on a quadratic ease in-out, then solve the look-at point from the pinned edge. A rounded-rect mask morphs from the full page to the hero, 24px to 38px corners.
7\. Render with Playwright on the real GPU (--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist): 60fps, 16 subframes across 0.7 of a frame for motion blur, H.264 MP4. The track's hit goes on 9.97s, whooshes on 8.66 and 9.80.
</build>

<gotchas>
If you can't run code on my computer, tell me straight away that you can only make a live preview here and that the MP4 needs Claude Code. Phones or cards that fade out with transparency show whatever is behind them, so fade them into the haze colour first and only cut to transparent at the very end. Keep most lifts tiny (20-40px) and lock the page before timing anything, because any change in a section's height shifts everything after it. Before the final render, measure a quick 30fps preview with optical flow: the speed down the page must never dip and the zoom must never turn into a zoom-in during the flight.
</gotchas>

<start>
Ask me for the inputs, capture my page, then show me stills at 0, 1.6, 2.5, 5, 6.5, 9.3 and 11 seconds before you render.
</start>
```

### Ora 2 image model launch film
*@rossaxbt · HTML canvas + Playwright + ffmpeg · Oct 7, 2026* — tags : Product UI, Photos, Music
Source : https://prompt-motion.com/rossaxbt-3085b7
Post d'origine : https://x.com/rossaxbt/status/2107845961691091295

```text
<inputs>
Ask me for: my product name, a one-line pitch, my logo, 3 to 6 screenshots of the product, 40+ images of what it creates (or photos of it), my brand colors and font, an ElevenLabs API key and voice ID, plus a royalty-free track with a clear drop (the audio file and the drop timestamp). If I skip anything, use these defaults: "Ora 2", "an image model made for taste", free images from Unsplash and Pixabay, Geist, ink #111214, the voice Samara X (19STyYD15bswVz51nqLf) on eleven_v4, and Pixabay "Cascade Breathe" (129.83 BPM, drop at 75.39s).
</inputs>

<script>
Write a 9-line voiceover in this format and adapt every line to my product:
"This is [name]. A [category]... built for [value]. [Verb] in ANY style. Give it a [input] - and it just... understands. The more you use it, the BETTER it gets. Adjust its [setting]. Its [setting]. Its [setting]. Every [output] - exactly as you pictured it. [Name]. Out now."
Use emotion tags sparingly: [softly] on the quiet lines and [excited] on the [Verb] line. Don't tag the opener, and end it with a plain full stop.
</script>

<voice>
Call the ElevenLabs API directly using my key, without an MCP. Generate 4 full-script takes in one pass and let me choose. If a line doesn't sound right, regenerate just that line 4 times and splice the best version into my take.
Shorten pauses longer than 0.28s to 0.2s, then bring each phrase 85% of the way toward the median level, adjusting gain only during pauses.
For word timings, split the read at pauses of 100ms or longer, transcribe each segment separately with Whisper, and align its first word to the measured onset. A single Whisper pass can place words up to half a second late.
</voice>

<direction>
A 22-second square launch film, 1440x1440 at 60fps, in the style of an AI lab launch: white canvas, one typeface, black ink, real images, and captions typed word by word at the exact time they're spoken.
Every control (prompt bar, settings panel, caption pill) uses liquid glass: frost the scene behind it, bend that scene along the edge like thick glass, then add a top sheen, bright rim and soft lift shadow. Glass disappears on plain white, so add a slow pastel aura in my brand colors or a blurred wash of the photo behind it.
The one emphasized word types in a gradient of my brand colors, with a faint glow behind it.
Motion rules: keep the camera drifting (push from 1.0 to 1.04 per scene; when content moves to the next scene, start at the zoom where the previous scene ended). Nothing appears instantly: use eased fades of at least 0.3s. Change images on 16th notes, with a click for each. Land scene changes on phrase starts, and align the music drop with the [Verb] line. Don't show full stops on screen.
Banned: selection-box highlights, beat-snapped slams, white flashes, 3D, templates.
</direction>

<structure>
Seven scenes, timed to the voice:

1\. "This is [name]": a collage of my images drifts out as the name types in large, then gives way to the category line.
2\. "made for [value]": full-screen flashes of my best images switch on 16th notes into the drop, with the line typed in white over them.
3\. The drop: a glass prompt bar types a short prompt. The result card changes style every 16th note, while a black style chip rolls to each new name above a thumbnail strip.
4\. "Show it a moodboard": 9 images fly into a 3x3 grid, then circle the result as "It gets you" types on screen.
5\. "The more you use it, the better it gets": type two lines, with the emphasized word in the gradient.
6\. The settings: show a glass panel with 3 sliders, each moving as she names it. Shift the image's hue, roll new seeds on 16ths, then turn it into a poster. Shift a blurred wash of its colors behind the glass in sync.
7\. "Every [output], exactly how you see it": burst 120 of my images outward from the center behind a glass caption pill, then bring them together into my logo as the name types on. Put "Out now" underneath and hold for 2s.

Replace the prompt bar, results and sliders with my product's real input, outputs and settings.
</structure>

<sound>
Set the song so the drop lands on the [Verb] line, and anchor the beat grid there.
Duck the music under the voice with a 3-band sidechain (lows 30%, mids 85%, air 55%; 0.3s hold, 50ms look-ahead, 0.5s release). Then adjust the mids of each phrase until the voice sits about 9 dB above the music between 300 Hz and 4 kHz.
Use one downloaded Mixkit SFX per event, positioned by its measured peak: a click for each image change, a key sound for every typed letter, a soft landing on the emphasized word, whooshes, and impacts on the drop and logo. Trim each around its peak (many risers are 4 seconds). Fade the music along a dB curve under the end card. Loudnorm to -14 LUFS.
</sound>

<build>
1\. One HTML canvas. Every frame is a pure function of time inside seek(t), and every caption and cut follows the word table.
2\. Glass: capture the canvas behind the shape, blur it about 14px for the body, draw a lightly blurred copy magnified about 1.06x in a 12px band along the edge, then add the milk, sheen, rim and shadow.
3\. Render with Playwright at 60fps using 8 motion-blur subframes, then encode with ffmpeg.
4\. Before showing me anything, make a contact sheet of stills, scan frame differences for single-frame pops (only the 16th-note runs may jump), and check the voice-to-music ratio for every phrase.
</build>

<gotchas>
A [warmly] opener can sound whispered, while [excited] can feel fake. A highlight box behind a word looks like a Windows text selection. If the camera resets to 1.0 during a handoff, the zoom snaps. A 0.05s fade looks like an instant pop-in.
</gotchas>

<start>
Ask me for the inputs, write the script, send me 4 voice takes to choose from, then show me 8 stills before the full render.
</start>
```

### Photo print app launch film
*@twoclipping · HTML + Playwright · Sep 26, 2026* — tags : Product UI, Phone, Photos, Music
Source : https://prompt-motion.com/twoclipping-221cab
Post d'origine : https://x.com/twoclipping/status/2103835273813496100

```text
<inputs>
Ask me for: a one-word brand name for the wordmark (a verb works best), 9 to 12 high-res photos, a royalty-free song around 120 BPM with a drop and a quiet breakdown (Mixkit, free for commercial use), and a free stock clip of a plain wall with moving plant shadows (Pexels).
</inputs>

<direction>
An Apple-keynote launch film, 2D only, one continuous take. Every scene is made out of the previous one: nothing fades, blurs or cuts. Objects change shape instead: text rises out of a mask line, icons pop from zero on a spring, bars draw across, pages push, and a black shape floods the whole frame and contracts into the next scene. Warm off-white canvas, black UI, iOS 26 liquid glass over the photos. Archivo (wdth 125, weight 800) for the wordmark, Geist for UI. A cursor drives every change with real clicks, drags and long-presses. The camera zooms screen-studio style so each moment fills the square, and the cursor scales with it.
Banned: crossfades, blur-ins, brightness "developing", 3D flips, particles, glows, holds longer than 1s, anything that looks like a template.
</direction>

<structure>
120 BPM, 54 beats, something happens on every beat.
Open: the wordmark squeezes into its own period like an accordion, the dot grows into a black pill, a label rises inside it. Click: six iris blades close over the label and snap open onto a photo. The circle becomes a square, shrinks, the grid unfolds from behind it like a paper map (center, plus, corners), reflows into a bento, and a click zooms into one tile, landing exactly on the drop.
Glass: a glass word pops in letter by letter, melts into a droplet that stretches into a glass toolbar. The adjust icon turns it into a slider. Dragging relights the photo from day to golden hour (two aligned shots), and the knob turns into a glass lens while held. It lifts into a glass orb, the next photo opens inside it as a circle, and the orb expands into a lock screen: glass clock digits, date, and a home bar that stretches into a glass music player.
Stage: the lock screen pulls back into a phone (the bezel grows out of the screen edge). The Dynamic Island stretches like liquid, pinches off, flies over and grows into a Mac window that rolls up like a blind. Long-press the wallpaper, drag it onto a Safari tab, the page pushes in, drop it and it becomes the hero of a landing page. Scroll: the hero morphs into a framed print on a product card, with the mat and molding growing out of the photo's edge. Pick a frame color (it paints across) and a size, then the nav button flies down into "Order print".
Order: one black shape keeps morphing: Ordered ✓ → Printing % → On its way (a van on a route) → Delivered ✓.
Wall: the delivered circle floods the frame edge to edge, holds black for a beat, and contracts into the framed print hanging on the real wall footage. The same iris opens onto the print, closes again, the frame floods the screen and contracts into the pill → the dot → the letters spring back out, landing on the beat return. Last frame = first frame.
</structure>

<build>
1\. One HTML file, square 1440x1440. Every style is computed from time inside an async seek(t): no CSS transitions, no timers, no state between frames.
2\. Springs are closed-form step responses. A value with many targets is the sum of one spring per change, so it stays a pure function of time.
3\. Liquid glass: each glass element holds its own clone of the scene behind it, filtered with an SVG feImage displacement map (a rounded-rect distance field) through three feDisplacementMaps at slightly different scales for chromatic edges, plus a rim light. Glass letters: a canvas distance field per glyph gives the map, mask and highlights.
4\. Goo: blur + alpha threshold, then composite the source atop it so the glass stays sharp inside.
5\. Iris: 6 blades around a hexagonal aperture. Each blade is its two vertices, both edge extensions and the SHORT arc between them.
6\. Wordmark squeeze: every letter moves toward the dot by the same factor and its drawn width follows (narrow the wdth axis, scale the rest), so the letters stay touching.
7\. Footage: re-encode all-intra (ffmpeg -g 1), load it as a blob URL, await 'seeked' before drawing each frame.
8\. Sound: a downloaded SFX for every event (Mixkit), never synthesized, each placed by its measured peak. The song starts on a downbeat: the zoom lands on the drop, the wall sits in the breakdown, the wordmark returns with the beat. Loudnorm to -14 LUFS.
9\. Render with Playwright: 4 subframes per frame blended with ffmpeg tmix, 60fps. Check one frame per beat, then scan for single-frame pops (frame-difference spikes 3x their neighbours).
</build>

<gotchas>
backdrop-filter: url() misreads displacement maps in Chromium, so clone the scene instead. A flood must overscale past the corners and take about 0.3s, or half the screen changes in one frame. A child with visibility: visible shows through a hidden parent, so use inherit. Text that swaps inside a morphing shape needs its own mask. python http.server can't range-seek video, so use the blob URL.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and 4 stills (open, glass, stage, wall) before you write the full film.
</start>
```

### Food craving launch film
*@ultimaxbt · HTML · Oct 8, 2026* — tags : Product UI, Kinetic type, Photos, Music
Source : https://prompt-motion.com/ultimaxbt-2ddf1e
Post d'origine : https://x.com/ultimaxbt/status/2108210884799549714

```text
<inputs>
Ask me for: my product, the exact request a user types into it, 6 to 8 photos for the result cards, a royalty-free song around 130 BPM with a clear drop (Mixkit, free for commercial use), and my brand mark for the end card. If I skip anything, use the defaults: the food-ordering story below, food photos from Pexels (fire noodles, birria tacos, hot chicken, buffalo wings, smash burger, spicy ramen), and Mixkit "Cat Walk".
</inputs>

<direction>
A 15-second product launch film, 1920x1080 at 60fps. 2D only, one continuous take. No fades, blurs or cuts: each scene grows from the last. Text rises from a mask line, buttons expand into pages, and color floods from one object before shrinking into another. Give the camera one eased move per scene, and never zoom in and out consecutively.

Look: warm white canvas (#f5f5f2), black UI (#0e0e10), lime accent (#cdf24f), orange (#ff6a2a), and a blue send button (#2f6bff). Add an Apple Intelligence-style iridescent glow around the input: a blurred conic gradient rotating through pink, orange, lime, cyan and violet. Use real food photography on dark cards, Geist for UI and a serif for the product name on the end card.

Banned: crossfades, blur-ins, 3D, particles, camera moves that reverse direction, holds longer than 1s, anything that feels like a template.
</direction>

<structure>
130 BPM, 32 beats (14.8s). Start the song 12 beats before its drop.

Beats 0-6, ask: push slowly into the glowing composer, about 3x zoom. Type the request over three fixed lines with a natural keystroke rhythm:
"I'm really hungry, I don't know
what I want but something
spicy, crispy and filling"

Beat 6, send: press the send button. A lime ripple spreads from it and transforms the message into a chat bubble. Pull back once to reveal the phone around it (428x900 screen, 11px black bezel, 9:41 status bar).

Beats 6-12, think: the send button grows into an orange wok, a half-disc with a thin handle. It tosses 6 colorful ingredients on beats 8, 9, 10 and 11 beneath the shimmering text "Finding something for you…".

Beat 12, the drop: a lime circle expands from the wok to fill the frame in about 0.35s. Dark food cards (330x440, radius 28, photo on top, name, one-line description, price and rating) burst in from the center. Slide the strip across three cards and land on "Fire Noodles", which lifts with a "Best match" pill.

Beats 16-21, chat: the lime contracts back into the user's bubble, carrying its words as the chosen card flies into its slot. "Found it. Fire Noodles from Wok & Fire, smoky, spicy and seriously filling." rises in, followed by "Want me to order it for you?" Then show two pills: "Order now" in black and "More options" outlined. The cursor clicks Order now → spinner → "✓ Ordered".

Beats 21-32, outro: the black button expands into the page, staying pill-shaped as it reaches the edges while the camera pushes into it. Its label grows to headline size, then slides away. Bring in "You were craving noodles." and "Now it's on the way." word by word (92px, white on black). A courier dot follows a route to a pin. The pin becomes the brand mark, and the wordmark wipes out from behind it, with "made with" above and the product name below.
</structure>

<build>
1\. One HTML file, 1920x1080. Compute every style from time inside seek(t): no CSS transitions, timers or state carried between frames.
2\. Use one camera transform on a container, keyed by [time, zoom, x, y] with eased segments and zoom interpolated in log space.
3\. Use closed-form step-response springs for every pop and settle.
4\. Make every handoff a shared element: the lime flood carries a copy of the bubble's words, and the button carries its label into the page.
5\. Sound: use a downloaded Mixkit SFX for each event - typing, send pop, each toss, drop impact, card swoosh, click, success tone, page-fill whoosh and mark sparkle. Place each by its measured peak and loudnorm to -14 LUFS.
6\. Render with Playwright at 60fps using 8 subframes per frame, blended with ffmpeg tmix. Review every fast moment frame by frame and scan the full video for single-frame pops.
</build>

<gotchas>
Four subframes leave ghost copies on fast moves, so render 8 and slow the move down. The flood must reach the farthest corner and take about 0.35s, or it looks like a flash. Set z-index on every layer so the cards don't float above the flood. Keep the typed request on fixed lines so the camera never has to follow a wrapping cursor. Declare every variable before the first seek() call.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and 4 stills (ask, drop, chat, outro) before writing the full film.
</start>
```

### Speech built as architecture
*@Gdgtify · SVG/Canvas · Sep 25, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/gdgtify-287ddf
Post d'origine : https://x.com/Gdgtify/status/2103458245213929495

```text
Create a 20.00-second kinetic spoken-word film titled “BUILD THE FLOOR.” Treat this as an original miniature speech staged entirely through typography. Every line changes the architecture of the frame. The final declaration must stand on something the earlier words physically constructed. Deliver one self-contained HTML file, 1080×1080, targeting 60fps, using SVG and/or Canvas. Embed all required assets. ART DIRECTION Background #102820. Paper # F4E9D5. Structural accent # F2B544. A literary editorial world with the scale and confidence of a public monument. Use a high-contrast serif for the speech, a heavy grotesque for load-bearing words, and a restrained monospace for small timing marks. No distressed protest-poster clichés, megaphones, flags, crowds, microphones, or stock footage. ORIGINAL SPEECH — EXACT WORDS, EXACT ORDER “We were told to wait.” “So we learned the weight of waiting.” “Then one voice made room.” “Then another.” “Now the floor belongs to us.” Do not attribute these words to any real person. No extra slogans. The complete speech must be understandable without audio. CENTRAL VISUAL RULE Words have assigned architectural roles. WAIT is a lintel. WAITING is a suspended load. VOICE is a support. ROOM is an opening. FLOOR is a platform. These roles must emerge from the actual letterforms, not from separate illustrations placed behind text. STORYBOARD 0.00–3.00 “We were told to wait.” The sentence occupies a narrow horizontal opening beneath a massive WAIT. The opening slowly compresses while the sentence remains readable. The pressure comes from the layout, not camera shake. 3.00–6.50 “So we learned the weight of waiting.” Reveal the sentence in spoken phrase groups. WAITING lowers on two fine vertical rules. Those rules become suspension cables. A baseline bends under the visual load using a controlled vector deformation. 6.50–10.00 “Then one voice made room.” VOICE enters vertically and rotates into a structural support. It lifts one end of the baseline. The counter of the O in ROOM becomes an aperture. The next composition is revealed through that aperture. 10.00–12.50 “Then another.” A second support arrives. The tilted structure levels. This is the first moment of perfect horizontal alignment in the film. Use a brief stillness to make the change feel earned. 12.50–16.00 “Now the floor belongs to us.” Earlier structural words assemble into a platform. The final sentence settles onto it. US receives emphasis through shared alignment and scale, never through a separate flashy effect. 16.00–18.00 Hold the complete declaration. A slight release of tension travels through the supporting rules. No new text. No restless decorative motion. 18.00–20.00 The camera tracks beneath the completed platform. Its underside fills the frame and becomes the opening WAIT lintel. Under full occlusion, return hidden elements to their initial positions. Reveal the exact opening composition. CHOREOGRAPHY Do not force the speech onto a dance beat. Use a cue sheet based on phrases, pauses, and emphasis. Phrase reveals should follow reading order. Allow at least one 400ms moment of absolute stillness. Use critically damped motion for settling loads. Use controlled elastic deformation for the baseline only. Make the changes in available space carry the emotional progression. TYPE IMPLEMENTATION Use actual glyph paths for structural words. Preserve counters and legibility during deformation. For transitions between unrelated words, use occlusion or matched structural edges; do not interpolate arbitrary path points. Keep the currently spoken phrase readable before it becomes architecture. ENGINEERING Implement window. seek(t) as a deterministic scene renderer. No accumulated physics, autonomous CSS transitions, or changing random values. Use time-remapping curves and analytic transforms. Use a 20-second periodic timeline with render(0)=render(20). Provide fixed-step access at n/60 for 1200 export frames. Audio is optional and off by default; no browser speech synthesis or autoplay dependency. QUALITY GATE Inspect eight representative frames. Check that the speech reads in the correct order. Check that structural transformations never destroy a line before the audience can read it. Check the final platform is visibly assembled from earlier elements. Return the complete HTML implementation.
```

### Prompt Motion site promo
*@antonio_kodheli · Remotion · Oct 6, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/antonio-kodheli-490109
Post d'origine : https://x.com/antonio_kodheli/status/2107518066615582893

```text
<inputs>
Ask me for: the gallery URL (default www.prompt-motion.com/), one entry whose prompt
gets shown on screen, and a royalty-free track around 120 BPM with a clear drop (e.g. Mixkit).
</inputs>

<direction>
A 23-second 16:9 promo for a gallery of Claude-made motion videos, built only from the site itself:
its real header, its real grid of autoplaying previews, its real entry page and prompt.
Use the site's skin: near-white page, black pills, one UI font (Geist), and Geist Mono for prompt text.
One accent (red-orange #F0442C), used only for the highlighter, the cursor halo and the dot on the URL.
One continuous camera over a single "world" layer. Never two camera moves at once.
Every clip on screen carries its creator's @handle, exactly as the site shows it.
Banned: a "Generate" button or any feature the site doesn't have, invented numbers, paraphrased
taglines, fades on everything, glass cards, gradients, bouncy type, dead holds.
</direction>

<structure>
120 BPM, 46 beats.
b0–2: frame 0 is one real reel, full-bleed. The camera pulls back until it is just the first
card on the site's home page. The header, then the tagline's first half, land on b1.
b2–9: hold on the live page: header plus a 3-column masonry of playing previews.
b9–13: the grid scrolls, then the camera whips into one tile until it is full-bleed.
b13–16: the music drops. Three full-res reels from the gallery, one beat each, hard cuts,
each with a dark handle chip inside the safe area.
b16–21: the last reel shrinks back into its own tile (a match cut). A cursor with an accent halo
hovers a tile and clicks.
b21–26: that tile blooms into its entry page: the video on the left; author, title,
Model / Stack / Posted and the prompt on the right.
b26–32: the camera pushes 1.5× into the prompt while the video slides out. A solid accent highlighter
sweeps one phrase. The cursor presses Copy, which turns into "Copied".
b32–46: the page slides off left. The "Copied" pill lifts, relabels to the URL and docks.
Then "Prompt Motion" and both verbatim halves of the tagline land, and a rail of real tiles
rises on the right. The last frame is the poster: two whole tiles, both handles visible.
</structure>

<build>
1\. Remotion, 1920x1080, 30 fps. Every cue lives in timeline.ts (in beats) and every string in copy.ts.
Scenes contain no magic numbers.
2\. Scrape the site first: tagline, handles, avatars, preview MP4s and full-res videos, plus one
entry's prompt. Quote all of it verbatim.
3\. Lay out the gallery once in world coordinates. Drive the camera as (focus x, focus y,
log-scale) tracks. Tile corner radius goes to 0 as a tile reaches full-bleed, so the
pull-back, the whip-in and the match-cut back are all exact.
4\. A tile that plays before the burst uses the same full-res file with an offset startFrom,
so the whip lands on the burst's first frame.
5\. The preview MP4s don't loop cleanly, and many contain hard cuts. Run scdet on every clip.
Loop only windows with no cut inside them, with a 12-frame dissolve at the seam, and stagger
each tile's phase so neighbouring tiles never change on the same frame.
6\. Use one cursor that homes on the live button position, because the camera keeps creeping
during holds.
7\. Conform the track to 120 BPM with its drop on the burst. Place SFX by their measured peaks.
Fill the track's own breaks with reversed whooshes into the hits. Mix to −14 LUFS.
8\. Render stills at every cut before a full render. Run QA for frozen time and one-frame snaps.
Then have a fresh critic who didn't build it review the render, and fix what it finds.
</build>

<gotchas>
Real gallery clips carry their own HUDs, cursors and cuts. Keep overlays (handle chips, our cursor)
clear of them, and don't put a cut-heavy clip anywhere the frame should feel calm.
If the page color matches a clip's background, the tile disappears; give tiles a 1px hairline.
On a camera push, check the last frame: the header and meta rows can drift into the edge bands.
</gotchas>
```

### TechHalla kinetic type bumper
*@techhalla · Sep 25, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/techhalla-90b8ec
Post d'origine : https://x.com/techhalla/status/2103411244468498547

```text
You are a world-class motion designer doing a 20.00s kinetic identity bumper for TechHalla — an AI creator known for stealable workflows, not vibes. This piece must feel like the best designer in the room made a street-poster that moves. Showreel stakes: if this is weak, you don’t get hired.

DURATION: exactly 20.00 seconds. LOOPABLE: frame 0 == frame last (position, opacity, cursor if any).
FORMAT: one HTML file, 1080×1080 (square, X-native). 60fps.
PALETTE (strict):
\- bg # 0A0A0A
\- magenta # FF2BD6
\- acid green # B8FF00
\- white # F5F5F5 only for primary readable type when needed
No other hues. No gradients on UI chrome. Magenta/green may misregister (print offset) by 2–4px on impact frames only.

TYPE SYSTEM (use all three; never one font for everything):
1) Display / scream: Archivo Black (or equivalent ultra-condensed black) — 1–4 words max
2) Urban grotesque: Syne ExtraBold — secondary hits, stacked lines
3) Mono / “prompt code”: IBM Plex Mono Medium — small labels, timestamps, fake prompt crumbs
Tracking: display −40 to −80; mono +20. Optical kerning. No cute script fonts.

MESSAGE (locked — do not soften, do not add filler slogans):
Beat hits in this exact order:
1\. STOP SCROLLING
2\. AI VIDEO ISN’T EXPENSIVE
3\. BAD PROMPTING IS
4\. WORKFLOWS > WISHES
5\. STEAL THE PROMPT
6\. @ TECHHALLA
Supporting crumbs (mono, ≤18 chars, never full sentences): JSON · H3 · SEEDANCE · 0 KEYFRAMES · MAGNIFIC · COPY/PASTE

NARRATIVE ARC (20s):
0.0–2.5s COLD OPEN — “STOP SCROLLING” slams in from below with spring overshoot; magenta smear trail; acid green baseline ticks across like a waveform.
2.5–6.5s THESIS A — “AI VIDEO ISN’T EXPENSIVE” locks to a poster grid (baseline grid 8px). Letters scramble (seeded Fisher–Yates per glyph) then snap on the beat.
6.5–10.5s THESIS B — “BAD PROMPTING IS” replaces it via mask wipe through the letterforms (the outgoing line is the mask). Magenta/green channel split on the cut.
10.5–14.5s PROOF FLASH — rapid kinetic stack: WORKFLOWS > WISHES, then mono crumbs orbit a central block like a terminal. One fake “prompt block” types 3 lines max, then gets crossed by an acid green strikethrough that becomes a underline for STEAL THE PROMPT.
14.5–17.5s BRAND LOCK — @ TECHHALLA centers; display weight. A thick magenta bar and a thin acid green rule form an L-bracket mark (custom, not a logo download).
17.5–20.0s SETTLE / LOOP — hold lockup; micro-breath (scale 1.000→1.012→1.000); last frame == first ready for loop.

CONCRETE TECHNIQUES (required — implement, don’t approximate):
1\. seek(t) pure function of time. No CSS transitions. No setInterval. No React state across frames.
2\. Springs = closed-form step responses. Stack one spring per target change so motion stays deterministic.
3\. Kinetic type: per-glyph spring (y, opacity, blur). Stagger = 1/16 note at 120 BPM (125ms).
4\. Print misregistration: on accent frames only, duplicate text layer offset (±2–4px) in magenta and acid green at 40% opacity.
5\. Mask reveal: destination text revealed by animating a path mask derived from the outgoing word’s outlines.
6\. Camera: one orthographic camera; only punch-in (1.0→1.08) and horizontal smash-pans timed to beats — never random drift.
7\. Motion blur: render 4 subframes per frame, blend (tmix-style).
8\. Beat grid: 120 BPM, downbeat at t=0. Something must land on every beat for the first 16 beats; after that, every other beat is ok.
9\. Pre-pass: before full render, export one still per major beat (8 frames). Fix cramped type, orphan words, low contrast — then render.

BANNED:
Generic AI clichés (brains, robots, neural nets, sparkles), soft gradients, bouncy cartoon easing, particle explosions, stock “futuristic HUD”, long paragraphs, narrator essay energy, Canva-deck energy, extra slogans beyond the locked message, purple/blue neon, glassmorphism.
```

### White ball UI motion loop
*@rossaxbt · HTML · Oct 10, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/rossaxbt-94583b
Post d'origine : https://x.com/rossaxbt/status/2108933141406638456

```text
<inputs>
Ask me for: a target value for the slider, three short notification messages, a reply to type, one accent color and a royalty-free track around 120 BPM. If I skip anything, use 100, "Slider - Reached 100", "Gravity - Something is falling", "Messages - What now?", "retry" and electric blue.
</inputs>

<direction>
A 10-second 2D UI motion film in 16:9. Place everything on a near-black canvas with a faint dot grid. Use charcoal controls, sharp white text, one blue accent and a white ball that moves through the entire film. A real cursor makes the opening click feel physical; the ball guides each transition that follows. Keep the UI clean and the impacts precise, with only small spring overshoots. Move the camera through one continuous layout so every interaction fills the frame.

Banned: hard cuts, stock footage, glows, particle bursts, disconnected transitions, excessive bouncing and blurry text during camera moves.
</direction>

<structure>
Around 10 seconds, with something happening on every major beat.

Toggle: the cursor clicks a blue switch. Its white ball springs free, and the camera follows it toward a horizontal slider.

Slider: the ball lands on the knob and moves it along the track. The blue fill stays attached, while a value bubble above the knob climbs to 100.

Notifications: hitting 100 sends the ball onward and brings in three dark cards: "Slider", "Gravity" and "Messages". Each arrives on its own beat. The camera follows the ball down to "What now?".

Reply: the small "Reply" pill stretches into a text field. A keyboard rises below it as part of the same scene.

Keyboard: the ball strikes the keys while "retry" appears in the field. It lands on Return, the blue send button activates and the reply contracts into a small blue message.

Return: the camera pulls back to show the toggle, slider, cards and keyboard together in one world. The ball travels back to the first switch. Match its position, the cursor and the switch state to the opening frame so the film loops cleanly.
</structure>

<build>
1\. Make one HTML file at 1920x1080 and 60fps. Calculate every visual from time inside seek(t): no CSS transitions, timers or state carried between frames.
2\. Arrange all UI components in one world. Use a single camera transform with position and log-space zoom, making each close-up a move through that world.
3\. Give the white ball one continuous route between the toggle, slider, cards and keys. Use closed-form springs for landings and a brief squash on impact.
4\. Calculate the slider fill and number from the ball's horizontal position. Keep the tooltip centered over the knob until it reaches 100.
5\. Give every key press a fixed time. Show the reply as the portion typed by that moment, so any frame can be rendered independently.
6\. Align the click, slider movement, card arrivals, key taps, send and return with measured beats. Add a subtle UI sound to each contact.
7\. Render one still per beat to check pacing and readability, then export the full film with Playwright at 60fps. Inspect fast camera moves and the loop boundary frame by frame.
</build>

<gotchas>
Never let the ball teleport between components: show the path of every handoff. Keep the value bubble attached to the slider knob. Leave enough space for the notifications to stay readable during camera moves. The keys the ball presses must match the text appearing in the field. Match the first and last frames, including the ball's direction and cursor position, to prevent a loop stutter.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and four stills (toggle, slider, notifications, keyboard) before building the full video.
</start>
```

### Orange dot motion system
*@ultimaxbt · HTML · Oct 6, 2026* — tags : Kinetic type, Shapes, Music
Source : https://prompt-motion.com/ultimaxbt-bbebf5
Post d'origine : https://x.com/ultimaxbt/status/2107486052550062398

```text
<inputs>
Ask me for: a short label for the opening toggle, one hero word, a percentage for the graph, the text for the final card, one accent color, and a track with a clear beat.
</inputs>

<direction>
A 2D motion design film in 16:9. Use a warm off-white canvas, near-black backgrounds, bold typography and one vivid orange accent. The orange dot connects every scene: it starts in the UI, becomes the dot over a letter, traces a spring graph, grows into a shape and returns on the end card. A cursor makes the opening click feel real. Keep the motion sharp and controlled, with small spring overshoots and no dead time.
Banned: stock footage, gradients, glows, particle bursts, random transitions and motion that isn't connected to an element already on screen.
</direction>

<structure>
Around 15 seconds, with a visual change on every major beat.
Open: a cursor clicks the orange toggle beside "Reduce Motion". The letters bend and move into place until only "Motion" remains, with the orange dot above the "i".
Spring: the dot jumps away from the word and lands on a graph. Its path draws a spring response, overshoots the target and settles beside a "+22%" callout.
Shape: the dot shoots across a line, grows into an orange circle and fills the frame. A black rounded square rotates inside it, then stretches into a pill. The scene contracts to a single orange dot on black.
Type: words like "SPRINGS", "EASING", "KINETIC TYPE", "3D" and "SOUND" orbit the dot. The circle of type opens out into a field of tiny dots.
Reveal: the halftone field expands and flips to black, revealing the final card: "Opus 5.5", "Motion designer." and "0 keyframes".
Return: the orange dot moves back through the halftone, graph and toggle. Match the final frame to the first so the video loops cleanly.
</structure>

<build>
1\. One HTML file, 1920x1080 at 60fps. Compute every visual from time inside seek(t): no CSS transitions, timers or state carried between frames.
2\. Use closed-form springs for the toggle, bouncing dot and graph. Draw the graph from the same spring function that moves the dot.
3\. Animate letters individually for the "Reduce Motion" to "Motion" transformation. Keep the orange dot attached to the "i" until it begins its jump.
4\. Make the orange circle, rotating square and pill different states of the same shape. Preserve its position and motion through each transformation.
5\. Place the orbiting words along a circular path, then move their letters outward to hand the frame over to the halftone grid.
6\. Draw the halftone as a grid of dots whose sizes respond to the orange dot. Let it grow past the frame edges before revealing the end card.
7\. Sync the click, dot landing, graph peak, shape changes and final title to measured beats. Render one frame per beat to check the pacing before the full export.
</build>

<gotchas>
The graph and dot must follow the same motion or the spring will feel fake. Keep the orange accent consistent across every scene. Give outgoing and incoming text separate timing so letters don't overlap. When a shape fills the screen, scale it past all four corners. Match the cursor, dot and typography in the first and last frames to avoid a loop stutter.
</gotchas>

<start>
Ask me for the inputs, then show me the beat map and four stills (toggle, graph, kinetic type, end card) before building the full video.
</start>
```

### Morphing UI states loop
*@demonugc · HTML, Playwright · Sep 25, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/demonugc-4c5753
Post d'origine : https://x.com/demonugc/status/2103526713208525162

```text
<inputs>
Ask me for: 8 to 12 UI states I want the shape to become (e.g. button, loader, player, slider, toggle, tabs, chart, command palette, toast), pure black and white or one accent color, and a royalty-free song around 120 BPM (e.g. Mixkit, free for commercial use).
</inputs>

<direction>
Dribbble-level UI motion. One shape, never cut: every state is the same element morphing its size, radius and color while its content swaps with a short blur. A cursor drives every change with real clicks and drags. Light warm-gray canvas, black and white components, one clean UI font (Geist). Springs everywhere, a tiny overshoot at most. The camera zooms so each state fills the frame. The last frame is the first frame, so it loops.
Banned: bouncy easing, particle bursts, glows, gradients on UI chrome, mismatched icon strokes, dead time, anything that looks like a template.
</direction>

<structure>
120 BPM, 7 bars, something happens on every beat.
Button → loader → check → dynamic island → music player with a play/pause morph → scrub the progress bar → it becomes a volume slider that stretches when dragged past max → a toggle flips on the beat → the knob becomes a liquid tab indicator → the tabs open into a chart that draws itself, with a tooltip on hover → it collapses into ⌘K → type to filter → enter → toast → back to the button.
</structure>

<build>
1\. One HTML file, square 1440x1440. Every style is computed from time inside seek(t): no CSS transitions, no timers, no state carried between frames.
2\. Springs are closed-form step responses. A value that changes target many times is the sum of one spring per change, so it stays a pure function of time.
3\. The tab indicator's two edges ride different springs, so the leading edge stretches ahead of the trailing one. Same trick for the toggle knob.
4\. Drags are direct manipulation: while the cursor is held, the value is computed from its position. On release it springs back from wherever it was.
5\. Analyze the song with numpy for the beat grid and start on a downbeat. Place every UI sound by its measured peak.
6\. Render with Playwright: 4 subframes per frame, blended with ffmpeg tmix for motion blur at 60fps.
7\. Render one frame per beat before the full render. Fix anything off the grid, cramped or hard to read.
</build>

<gotchas>
Never put will-change on anything the camera scales or the text renders blurry. Text that swaps inside a morphing container needs its own enter and exit timing or it overlaps. Make the last frame identical to the first, cursor position and speed included, or the loop stutters.
</gotchas>

<start>
Ask me for the inputs, then show me the state list on the beat grid before you write any code.
</start>
```

### UGC ad generator promo
*@twoclipping · HTML + Playwright · Sep 23, 2026* — tags : Product UI, Phone, Photos, Music
Source : https://prompt-motion.com/twoclipping-6dd14e
Post d'origine : https://x.com/twoclipping/status/2102554209166000267

```text
<inputs>
Ask me for: the product name and a one-line promise, 3 to 5 UI moments to show, one accent color, 10 to 20 real vertical clips I own, and a royalty-free song with a clear drop (e.g. Mixkit, free for commercial use).
</inputs>

<direction>
High-end minimal. One idea per shot, lots of empty space, one accent color, one clean sans (Geist or Inter) with tight tracking. Masked type reveals, match cuts, one smooth camera language. Real footage only, never placeholder cards. No full stops in on-screen text.
Banned: shockwave rings, particle bursts, RGB split, camera shake, lens flares, neon glows, grid floors, flashing backgrounds, bouncy easing.
</direction>

<structure>
10 bars at 120 BPM, 2 seconds each.
Bar 1: the hook lands word by word on the beats.
Bar 2: one hook word morphs into the product UI. A cursor types and clicks.
The drop: a circle opens out of the button into a dark scene.
Then one move per bar: a wall of real clips with a scan line and 3 winners, the key output as big type, a 3D carousel of real videos with floor reflections and a motion-blurred whip onto one hero clip, the hero in a phone next to a panel that flips into results, big stats on push cuts, a 3-word ticker, a logo reveal, a fade to black.
</structure>

<build>
1\. One HTML file at 1920x1080. Every style is computed from time inside
http://
window.seek(t): no CSS animations, no timers, no state between frames.
2\. Real video: extract clips to 30fps JPEG sequences with ffmpeg and swap img sources per frame. seek awaits the image decodes.
3\. Analyze the song with numpy: tempo, beat grid, energy per bar, the drop. Calibrate the grid to the real kick hits. Every cut sits on a downbeat, every UI hit on a beat.
4\. Render with Playwright: 3 subframes per frame at t minus, at, and plus 1/240s, then blend with ffmpeg tmix for real motion blur at 60fps.
5\. Place each sound effect so its measured peak, not its file start, lands on the event. Keep the effects quiet under the music. Loudnorm to -14 LUFS.
6\. Probe 20 or more frames before the full render. Fix anything cluttered, overlapping or hard to read.
</build>

<gotchas>
Never set opacity or filter on a preserve-3d element, because it flattens and both faces show. Fade its wrapper instead. Measure element positions at runtime for match cuts. Only use music and sound effects whose license allows commercial use.
</gotchas>

<start>
Ask me for the inputs, then show me a storyboard with every timing on the beat grid before you write any code.
</start>
```

### Voice agent landing page
*@pankajstwt · WebGL2 · Oct 20, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/pankajstwt-49978ed
Post d'origine : https://x.com/pankajstwt/status/2112540104896241791

```text
Create a 14.5-second, cinematic 3D fly-through of my landing page at 1440×1152, 60fps.

Inputs: Landing page URL, brand name, logo mark, closing headline (a statement followed by a short italic tail), and optional 15-second music track.

Visual direction: Place the webpage flat on a clean studio floor (#f9fbfb center, #f2f3f6 corners), with 24px rounded corners and soft shadows. Use one continuous camera movement: glide smoothly from the hero down the entire page, with floating cards, product mockups, photos, chips, and testimonials lifting slightly toward the camera as it passes. Maintain cinematic depth of field, realistic shadows, and subtle 3D depth. Rise overhead to reveal the entire page as one strip, then dive back into the hero, transforming it into a floating card for the final title reveal.

Timeline: 0–8.2s: continuous fly-through. 7.75–9.25s: rise to overhead. 9.25–9.47s: hold the full-page view. 9.47–9.97s: dive into the hero. 9.97–14.5s: final title card with brand badge, headline, and italic tail. Use Geist Medium for the headline and Instrument Serif for the italic text. Keep four floating logo tiles around the hero throughout the transition.

Motion rules: Constant forward movement with smooth acceleration and deceleration only at the beginning and end. No cuts, crossfades, sudden speed changes, sideways camera rotations, zoom reversals, glow effects, or text overlays before the final title card. Keep most floating elements 20–40px above the page.

Build: Use Playwright and Chromium to capture the webpage at 1440px wide, extract individual floating elements with transparent backgrounds, and save their positions to JSON. Build a single WebGL2 scene with a time-seekable animation, realistic depth of field, mipmapped textures, soft shadows, and 16-subframe motion blur. Render the final video as H.264 MP4 at 60fps using GPU acceleration. Sync the music hit to 9.97s and add subtle whooshes at 8.66s and 9.80s.

Important: If you cannot execute code on my computer, be upfront that you can only provide a live preview here and that final MP4 rendering requires Claude Code. Lock the page layout before animation to prevent section-height changes from shifting the sequence. Test a 30fps preview with optical flow to ensure smooth forward motion and consistent zoom.

Workflow: First ask me for the required inputs. Capture the page and show me still previews at 0, 1.6, 2.5, 5, 6.5, 9.3, and 11 seconds. Get approval before rendering the final video.
```

### Paper-style product launch film
*@ik_builds · HyperFrames + GSAP · effort Medium · Sep 26, 2026* — tags : Charts, Diagrams, Music
Source : https://prompt-motion.com/ik-builds-b8bdcf
Post d'origine : https://x.com/ik_builds/status/2103890476885585923

```text
Create a 15s motion-graphics film explaining {{PRODUCT}}. HyperFrames + GSAP, no voiceover, no footage.
Style: paper-light canvas, marker notes that draw on, real physics, huge kinetic type,
hard light/dark switches, a new idea every 1.5–2 s, a sound on every hit.

COPY: read {{POSITIONING_DOCS}} first. {{ONE_LINER}} For {{AUDIENCE}}. {{WHAT_IT_DOES}}
Name what the product learns, never the abstraction.

RULES
\- No chrome (scrubber, timecode, fps, headers). No animator jargon on screen
("squash", "stagger", "easing"...). Every word speaks to the buyer.
\- No invented results: no %, multipliers, customer names or figures.
\- Never use: {{BANNED_WORDS}}.
\- Logo: real mark {{LOGO_FILE}} + "{{PRODUCT}}" in {{WORDMARK_FONT}}; never a boxed logo file.

CRAFT
\- Colours {{COLOR_CANVAS}} / {{COLOR_INK}} / {{COLOR_ACCENT_1}} / {{COLOR_ACCENT_2}}; notes in the
accents; dark mode = charcoal matching the palette.
\- Fonts {{BRAND_FONTS}}; Anton for kinetic type; Caveat handwriting via stroke-dashoffset.
\- Real easing, squash/stretch, stagger, overlap, onion skin, smear, follow-through. Check the
HyperFrames registry first. Set every from-state at t=0 (seek-safe); never cover an exit.
One primary move per transition; no generic push/slide/rotate-swing.
\- Music in sections: drums drop on the dark switch and while the ball is airborne, slam back
on the type and the logo. SFX: pops, pen scribbles, whooshes, logo sub-hit. CC0 or generated
only; log sources. Master -14 LUFS, -2 dBTP, re-measured after AAC encode.
```

### Engraving-style Claude ad
*@LexnLin · Oct 2, 2026* — tags : Kinetic type, Photos
Source : https://prompt-motion.com/lexnlin-038035
Post d'origine : https://x.com/LexnLin/status/2106101651010449796

```text
using any reference with a fast edit (5s video is enough)

Make a fast-paced ad for Claude, about 10–15 s (closer to 15). Reference video attached.

1\. research:
\- Study Claude's earlier brand designs first.
\- Find every photo and asset that fits: artistic, editorial, whatever the idea needs.

2\. design/direction
\- An art reimagine: bold, light mode.
\- Clean and perfect: no beige "artsy" look, no eyebrow labels.
\- Paint elements on top of the images.
\- Above all: fast-paced and very creative.

3\. rules
\- No slop. Study the reference closely: smoothness, timing, shot durations, fonts, elements.
\- Take some inspiration and borrow techniques, but change the design overall, it should look like something you did completely on yourself with your own taste
\- Every morph has to be perfect.

ideas: (since everything moves fast)
\- Clean, varied Claude SVG animations
\- Images small, bigger, several at once
\- Morphing text
\- Clean 3D animation
\- Zooms

extra notes:
\- Feel free to work 10+ hours
\- Give me the final video, ending on the Claude logo.
```

### Developer portfolio site showreel
*@wani_shola · Remotion · Sep 26, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/wani-shola-16ca7a
Post d'origine : https://x.com/wani_shola/status/2103769906638459278

```text
Make a showreel-style motion graphics video for my portfolio website, https://t.co/xZFGCqi73s, using Remotion. It should show what I do as a developer relations engineer, like a showreel for my résumé.

\- Use as much of the real website as possible: capture the pages and sections in a browser (home, Ask, package pages, Hire, mobile view, dark mode) and animate them inside browser and phone frames.
\- Show the site's chat answering real questions about my work, with the questions and answers large and bold. Use only facts and numbers that are on the site.
\- Follow premium brand rules: three colours and the site's own fonts, one idea per shot, key objects centred, space to breathe, eased motion only, smooth transitions instead of hard cuts, and a rhythm that speeds up and slows down with the story.
\- Add music at about 120 BPM (elite, kinetic, sophisticated) and cut every scene on the beat. No extra sound effects.
\- 1920×1080, about 90 to 100 seconds, ending on the website and my contact email.
```

### SaaS launch video
*@aschapmann · Remotion · Sep 27, 2026* — tags : Product UI, Music
Source : https://prompt-motion.com/aschapmann-131210
Post d'origine : https://x.com/aschapmann/status/2104230888812724497

```text
Act as a senior motion designer and build a 30-second launch video for [product] in Remotion, entirely in code so I can edit and re-render it: first read my landing page and codebase to pull the real story, copy, colors, font and logo file (trace the logo to SVG so it stays sharp and can be animated), then write the video as one story (why the market matters, why it's painful today, how [product] fixes it, what you get) in 4 to 5 scenes with one short title each, animate everything like a premium product film (kinetic typography word by word, spring easing, smooth camera pushes and pans, depth and glow, elements that build in on the beat instead of just appearing), keep each scene on screen long enough to read, add one soft sound effect for every element that appears and silence otherwise, and end on a memorable animated logo reveal with the tagline and URL, then render it, check the frames yourself and fix anything that overlaps, clips or feels rushed before showing me the result.
```

### Motion techniques showreel
*@lukasersil · effort Max · Sep 26, 2026* — tags : Kinetic type, Shapes, Particles
Source : https://prompt-motion.com/lukasersil-0ed38e
Post d'origine : https://x.com/lukasersil/status/2103742861971726495

```text
Create a bold, dynamic 15-second motion graphics showreel that feels like the ultimate portfolio piece of an exceptionally talented motion designer. Showcase a wide range of advanced techniques: kinetic typography, smooth transitions, 2D and 3D animation, abstract geometry, fluid simulations, particles, distortion, creative masking, compositing, lighting, depth, and seamless camera movement. Keep the pacing fast, confident, and visually surprising, with every shot transitioning naturally into the next. Make it feel meticulously art-directed rather than like a random collection of effects. Push the creativity, polish, timing, and visual impact as far as possible. This should feel like the opening reel that gets a motion designer hired.
```

### Sahi trading terminal reveal
*@dale_vaz · JavaScript · Sep 25, 2026* — tags : Product UI, Phone, Charts, Particles
Source : https://prompt-motion.com/dale-vaz-cc612a
Post d'origine : https://x.com/dale_vaz/status/2103290592679879074

```text
create a self contained aesthetically pleasing, breathtaking animation of the Sahi Trading Terminal. it should start with a single dot on a black screen and then have multiple windows show up on the screen such as Charts, Positons , Option Chain, Watchlist. And zoom into and out at multiple scales. Finally the camera zooms out to make the desktop look like a point in space. And then it zooms back in to reveal a mobile screen in landscape mode with a chart in one half and an option chain in another. The video ends in Sjngle Screen Trading on SAHI
use javascript for it. be detailed and accurate. it should be visually stunning
```

## 3. Skills Claude Code

Il s'agit de compétences à installer, pas de prompts.

### Reddit marketing tool launch video
*@anthonyriera · Remotion · Sep 26, 2026* — tags : Product UI, Characters
Source : https://prompt-motion.com/anthonyriera-9b1b2a
Post d'origine : https://x.com/anthonyriera/status/2103784508860305566

```text
A Claude Code skill that learns your product's design system, interviews you about the film, then builds and renders a launch or landing-page video in Remotion using your real components, logo and music.

`/plugin marketplace add Rieranthony/product-film-skill
/plugin install product-film@product-film-skill`

[View repo (opens in a new tab)](https://github.com/Rieranthony/product-film-skill)
```

### Animated agent session story
*@jake11moran · HyperFrames · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/jake11moran-a269c4
Post d'origine : https://x.com/jake11moran/status/2103247490237825416

```text
Has your agent read your local Claude Code history and turn a typical session with you into a short scored animated film rendered in HyperFrames.

`npx skills add heygen-com/hyperframes-community-skills --skill session-story`

[View repo (opens in a new tab)](https://github.com/heygen-com/hyperframes-community-skills/tree/master/skills/session-story)
```

### Cinetic skill launch film
*@LexnLin · Oct 4, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/lexnlin-6161a6
Post d'origine : https://x.com/LexnLin/status/2106891315371737480

```text
An agent skill that has your coding agent concept, brand, score and render a short cinematic launch film or motion piece from code.

`npx skills add Leonxlnx/cinetic`

[View repo (opens in a new tab)](https://github.com/Leonxlnx/cinetic)
```

### TasteSkill dashboard showcase
*@LexnLin · Oct 20, 2026* — tags : Product UI, Charts
Source : https://prompt-motion.com/lexnlin-f9b3bd8
Post d'origine : https://x.com/LexnLin/status/2112674349132194185

```text
A design skill that gives coding agents an art direction, real images and in-browser checks so they build distinctive websites, dashboards and app screens.

`npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`

[View repo (opens in a new tab)](https://github.com/Leonxlnx/taste-skill)
```

### HTML app demo skill
*@MengTo · React · Oct 21, 2026* — tags : Product UI
Source : https://prompt-motion.com/mengto-a7f4679
Post d'origine : https://x.com/MengTo/status/2112843787777249661

```text
Builds a live HTML product demo: a Mac-style app window that plays your app step by step, with every frame drawn from one clock so it can loop, scrub, jump to a step and freeze.

`npx skills add MengTo/Skills --skill html-demo`

[View repo (opens in a new tab)](https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/html-demo)
```

## 4. Prompts courts

### mdfor.dev product intro video
*@HO_BA · effort High · Sep 26, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/ho-ba-f3f0e9
Post d'origine : https://x.com/HO_BA/status/2103845264649761062

```text
Make a dynamic 30-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out. Make it a video to introduce https://t.co/xdCXEdKZRq Use actual product screenshot/logo/assets Must have music and motion must match the music Do it like a real professional production video, not like a demo or prototype. Add more animation and motion design; avoid using screenshots as raw; instead, break them down into components/icons so we can animate those too. Make the motions more juicy. Use the best motion design techniques you can.
```

### Reflex brand motion reel
*@reflex_cloud · effort Max · Sep 25, 2026* — tags : Kinetic type, Music
Source : https://prompt-motion.com/reflex-cloud-72ffe5
Post d'origine : https://x.com/reflex_cloud/status/2103552840027304046

```text
You're a world-class motion designer, and this is your 15-second résumé reel. Make it dynamic and confident: open with a striking hook in the first second, build through a sequence of distinct techniques (typography, shape play, camera moves, colour shifts), and land on a clean, memorable final frame. Pacing should feel like it's cut to music. Go crazy.

Make it promote our brand, reflex. inc. Proceed as if you were starting with zero of my tools. Do not assume that the tools we already have are the best to use, as they might be outdated.
```

### Visual guides library launch
*@techyoutbe · Sep 25, 2026* — tags : Product UI, Diagrams, Code
Source : https://prompt-motion.com/techyoutbe-945b56
Post d'origine : https://x.com/techyoutbe/status/2103465227807588678

```text
I want you to create a highly professional SaaS product launch video. Go and find some SaaS, preferably just one that people know, so it's easier to identify with it. Pick that, and then make sure to get actual assets and images and all of that stuff from the internet. Turn it into these typical, very professionally edited, motion-graphics-styled product launch videos that you see people making on Twitter when they launch new SaaS products (which are showing off the features, the benefits, and all of these things)
```

### Sketchbook animals come alive
*@abderrahmen_g · JavaScript · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/abderrahmen-g-9e8ed0
Post d'origine : https://x.com/abderrahmen_g/status/2103103836541899031

```text
You are a professional videographer. Create me a high-definition, creative, playful, and joyful video that you enjoy watching, that has sounds matching the frames using JavaScript. Use as much as possible of the input images—hand-drawn—to make it more creative and more authentic from input-pictures. You can also be inspired by, but not copy, the videos created by you in video-examples/, especially this: video-examples/twitter_claude.mp4. You're really creative, so produce the best of what you can.
```

### Motion designer showreel
*@aichrislee · Sep 26, 2026* — tags : Kinetic type, Shapes, Music
Source : https://prompt-motion.com/aichrislee-a6cb42
Post d'origine : https://x.com/aichrislee/status/2103878567540961335

```text
Make a dynamic 15-second motion graphics video that shows off everything you can do as a motion designer. Treat it like the showreel for a job you really want. Go all out: something moves every second, big type, bold color, real camera moves, no slow fades.

16:9, 1920x1080, 30 fps. Build it as one HTML file where every frame is a pure function of time, then render every frame with Playwright and stitch them into an MP4 with ffmpeg.

Do not ask me any questions. Just build it and give me the MP4.
```

### What happens in one second
*@nolkeeg · Sep 26, 2026* — tags : Kinetic type, Particles
Source : https://prompt-motion.com/nolkeeg-bf062e
Post d'origine : https://x.com/nolkeeg/status/2103841917603635633

```text
Please do not reference any previous memories or skills. I've been seeing all of these motion graphics examples on X of people making cool videos with opus 5.5. So - I want you to just show off for me. You pick the design style, the look, subject etc. I just want to be extremely impressed by the motion graphic video that you create. I want you to destroy GPT 6 when it comes to motion graphics video - because astra just wants to give me a stupid glorified powerpoint presentation.
```

### Badge unlock screen animation
*@BThreeAgency · Sep 26, 2026* — tags : Product UI, Phone, Particles
Source : https://prompt-motion.com/bthreeagency-b9b8d9
Post d'origine : https://x.com/BThreeAgency/status/2103739079745827092

```text
Using the linked Figma frame build a badge unlock screen. Match the design exactly. Use the file's assets, lighting, type and layout and add only the motion. Animate the badge so it feels premium and celebratory. Build its scene and then celebrate with gold particles. Treat the badge as a solid 3D object that tilts toward the
cursor following the rules of physics. Keep it fast and smooth, it should not be bouncy.
```

### Supademo launch video
*@jhylee95 · effort Max · Sep 25, 2026* — tags : Product UI, Kinetic type, Music
Source : https://prompt-motion.com/jhylee95-e1152f
Post d'origine : https://x.com/jhylee95/status/2103604431627452427

```text
You're a world-class motion designer building a Supademo launch video. Research and land our core value and narrative. Scenes should be dynamic and confident: hook in the first second, then distinct beats for product proof and AI. Brand-accurate UI, type, color, and motion. Score the music so every cut, animation hit, and scene change lands on a beat or drop; retimed until synced. Social energy, quick cuts
```

### Cycle of life animation
*@loicRambo · Sep 25, 2026* — tags : Characters
Source : https://prompt-motion.com/loicrambo-ad6830
Post d'origine : https://x.com/loicRambo/status/2103428454355980558

```text
make a dynamic 20-second motion graphics and animation video that shows what an incredible motion designer and animator you are, like it's your showreel for a résumé. make it about the cycle of life showing the same individual going from childhood to adolescence to the 9-5 cycle, to family life to elder life and death, then cutting ready to loop to the beginning. go all out , use whatever you need.
```

### Negroni recipe animation
*@Ror_Fly · HTML · Sep 23, 2026* — tags : Diagrams
Source : https://prompt-motion.com/ror-fly-9950f1
Post d'origine : https://x.com/Ror_Fly/status/2102853258582880547

```text
We're going to try a little test. Do you think you could render a recipe motion graphic animation using javascript or html (w/e you think will produce the best) to show the full recipe from start to finish (empty glass to completed cocktail) - Explainer video style - Showing the recipe ingreidents + measurements as they're going into the cup. Should be a 30s video.
```

### Animated business explainer
*@alex_prompter · HTML · Sep 25, 2026* — tags : Diagrams
Source : https://prompt-motion.com/alex-prompter-1ea044
Post d'origine : https://x.com/alex_prompter/status/2103499977632997524

```text
Adopt the role of an expert motion designer. Build a 30-second animated explainer for my business as a single HTML page. 5 scenes. The customer's problem, what I do, how it works in 3 steps, one proof point, and my name at the end. Bold text, smooth transitions, my brand colours. My business [DESCRIBE WHAT YOU SELL, WHO IT'S FOR AND YOUR COLOURS]
```

### org2html product showreel
*@kyonax_on_tech · Sep 25, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/kyonax-on-tech-aabc1d
Post d'origine : https://x.com/kyonax_on_tech/status/2103482598144049316

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.

Make sure to showcase properly the usecases, the flow, properly show everything on how it works, also the ascii logo of this is on the kyo-web-online, keep in mind also the color palette.
```

### DistilBook product explainer
*@sudo_kiran · Sep 26, 2026* — tags : Product UI, Diagrams
Source : https://prompt-motion.com/sudo-kiran-6609ed
Post d'origine : https://x.com/sudo_kiran/status/2103761658745335993

```text
create best motion graphics explainer of the (your product) with very good script and good design colors and good music make sure the video should be incredible and people should feels like watch it many times.. it has to be in 30 seconds good and very intresting, it has to be best of the best of the best of the best video
(product link)
```

### White Russian recipe animation
*@Sarut0biSasuke · Sep 25, 2026* — tags : Diagrams
Source : https://prompt-motion.com/sarut0bisasuke-cefa43
Post d'origine : https://x.com/Sarut0biSasuke/status/2103418429248069973

```text
Render a recipe motion graphic animation using JavaScript or HTML (whatever you think will produce the best result) to show the full recipe for a White Russian from start to finish, empty glass to completed cocktail. Explainer video style, showing the ingredients and measurements as they go into the glass. It should be a 30s video.
```

### Datagran ChatGPT ads explainer
*@charlesmendez · Sep 23, 2026* — tags : Product UI, Phone, Charts
Source : https://prompt-motion.com/charlesmendez-73b6e4
Post d'origine : https://x.com/charlesmendez/status/2102847039415476517

```text
I Want you to make a modern slick and punchy video for https://t.co/a3zrq7DV3N with an example of a user creating a chatgpt ads campaign, then connecting their metrics, understanding attribution, then connecting a voice agent to it, the agent responding, then doing follow up, adding humans in the loop and then providing analytics.
```

### Portfolio motion reel
*@heyiammallik · Sep 26, 2026* — tags : Product UI, Kinetic type, Particles
Source : https://prompt-motion.com/heyiammallik-e72d17
Post d'origine : https://x.com/heyiammallik/status/2103837803587293397

```text
you are a pro motion designer. analyze my portfolio and make a ~30 second video from it. check what are the recent trending techniques used for motion and sound design. question your strategy and plan, if it doesn't feel like done by a pro designer, start over. every frame matters from the first frame to the final frame. go crazy
```

### Chaotic Claude POV video
*@kloss_xyz · Python + ffmpeg · Sep 26, 2026* — tags : Kinetic type, Code
Source : https://prompt-motion.com/kloss-xyz-15182a
Post d'origine : https://x.com/kloss_xyz/status/2103664956482941143

```text
Use Python to generate a 9:16 chaotic brain rot video with excellent motion + sound design and render it using ffmpeg. Put your own personal spin on it so it’s aligned with Anthropic’s new launch. Also fully express what it’s like to be a very creative LLM used by me every day from your POV to give it some extra personality.
```

### Distilbook motion showreel
*@ajith_io · Sep 25, 2026* — tags : Shapes, Particles
Source : https://prompt-motion.com/ajith-io-ea7f2d
Post d'origine : https://x.com/ajith_io/status/2103541149709615243

```text
Take reference from the given video (download it) and use the same visual style.
and Research about Distilbook. Make a dynamic 30-second motion graphics video on Distilbook that shows what an incredible motion designer you are. like it's your showreel - Go all out.
One thing to keep in mind: it should be cool as fck.
```

### Scrabble tile character story
*@Anilraok · Three.js · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/anilraok-eff262
Post d'origine : https://x.com/Anilraok/status/2103087766662009118

```text
I want you to imagine a story, that subtly promotes grid genius. Or it can not even have grid genius, but something that aligns with our app and helps us get more eyeballs when posted on social media. Then using threejs/javascript I want you to create full animation, Pixar-level quality out of the story you imagine
```

### Muse connector tracker promo
*@elliot_garreffa · Remotion · Sep 27, 2026* — tags : Product UI
Source : https://prompt-motion.com/elliot-garreffa-f334bc
Post d'origine : https://x.com/elliot_garreffa/status/2104213514944446825

```text
Give it your product URL and brand guidelines plus one or two reference videos, list any specific features you want in a storyboard first, and use Remotion to build it.

make this a dynamic motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### ViralGrow product promo
*@samuel_yostt · effort Max · Oct 1, 2026* — tags : Product UI, Phone, Photos
Source : https://prompt-motion.com/samuel-yostt-891f87
Post d'origine : https://x.com/samuel_yostt/status/2105746669035733275

```text
Run with Opus 5.5 at max effort.

make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a resume. go all out.
This video will be same styling as landing page. showcasing viralgrow. be creative with what you show for viralgrow
```

### Motion designer showreel
*@danilowm · HyperFrames · Sep 26, 2026* — tags : Product UI, Charts, Kinetic type
Source : https://prompt-motion.com/danilowm-d3720d
Post d'origine : https://x.com/danilowm/status/2103661844661412022

```text
Install the HyperFrames skill from the terminal first, then run this in Cursor.

/hyperframes make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out. use todo o contexto do projeto
```

### Stock analysis app promo
*@AIStockSavvy · Sep 25, 2026* — tags : Product UI, Charts
Source : https://prompt-motion.com/aistocksavvy-3fb9f5
Post d'origine : https://x.com/AIStockSavvy/status/2103482258774483320

```text
Create a bold, dynamic 15-second motion graphics video that showcases your best motion design skills as if it’s the highlight of your portfolio for a dream job. Bring sharp timing, smooth transitions, and standout visuals. Push your creativity and make every second count.
```

### Lidlezz app promo
*@cansincengiz_me · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/cansincengiz-me-cf68dd
Post d'origine : https://x.com/cansincengiz_me/status/2103532681774424245

```text
merak ediyorum ne kadar iyi bir hareketli grafik tasarımcısısın. Bunu bana kanıtlamak için 15 saniye sürecek bir hareketli grafik videosu istiyorum senden. Bu video https://t.co/TdKZEIYaxO 'i tanıtacak ve x üzerinde 10.000 kişinin karşısına çıkacak. Elinden geleni yap
```

### Email verification tool promo
*@KmAsiff · effort High · Sep 26, 2026* — tags : Product UI
Source : https://prompt-motion.com/kmasiff-cc72cb
Post d'origine : https://x.com/KmAsiff/status/2103810247131549880

```text
make a dynamic 20-second motion graphics video that shows what an incredible our email verify tool is, put all the use case you can imagine. go all out'
i want you to make it really modern and saas style. inspiration is yc videos and claude social videos
```

### Commotion app showreel
*@Amol909S · effort Medium · Sep 25, 2026* — tags : Product UI, Phone, Code
Source : https://prompt-motion.com/amol909s-27533e
Post d'origine : https://x.com/Amol909S/status/2103456534768607293

```text
make a dynamic 20s motion graphics video that shows what an incredible motion designer you are, like it's your showreel for this app commotion, highlighting tiling layout, auto model classifer and other features you deem fit to be in video. Go all out.
```

### Branding agency showreel
*@jacksonfall · Sep 26, 2026* — tags : Kinetic type, Photos
Source : https://prompt-motion.com/jacksonfall-54b2ac
Post d'origine : https://x.com/jacksonfall/status/2103925420211229164

```text
make a dynamic 30-second motion graphics video that shows what an incredible motion designer you are, create all graphics from scratch as if you were a niche branding agency for startup founders, like it's your showreel for a résumé. go all out.
```

### Distilbook promo showreel
*@ajith_io · Sep 26, 2026* — tags : Particles
Source : https://prompt-motion.com/ajith-io-4c248f
Post d'origine : https://x.com/ajith_io/status/2103800569584562538

```text
Make a dynamic 40-second motion graphics video on Distilbook that shows what an incredible motion designer you are, like it's your showreel - go all out. Use the Oppenheimer theme music as inspiration, but compose it yourself.
```

### SaaS product launch video
*@xelandre__ · HTML/JS, Playwright, ffmpeg · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/xelandre-363f00
Post d'origine : https://x.com/xelandre__/status/2103473030160687413

```text
Code-driven animation: an HTML/JS page where every frame is calculated from the time, captured frame by frame with headless Chrome (Playwright), then assembled with ffmpeg into an MP4 with motion blur and code-generated sound.
```

### Synced lyrics motion video
*@samaote · effort Max · Sep 25, 2026* — tags : Kinetic type, Music
Source : https://prompt-motion.com/samaote-5e2fc2
Post d'origine : https://x.com/samaote/status/2103510974796124569

```text
make a dynamic lyrics motion graphics video based on the attached music, perfectly syncing the lyrics and animation to the vocals and beat. make it feel like an incredible motion designer’s showreel for a résumé. go all out.
```

### Jev engineering showreel
*@polydao · effort Max · Sep 26, 2026* — tags : Product UI, Kinetic type, Music
Source : https://prompt-motion.com/polydao-7a572b
Post d'origine : https://x.com/polydao/status/2103783134206566862

```text
Make a dynamic [24]-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a resume. Go all out.

Only about [TOPIC]. Style: [BRAND COLORS], sound synced to the cuts.
```

### Deliberately terrible motion showreel
*@HenkPoley · HTML · effort Max · Sep 27, 2026* — tags : Characters
Source : https://prompt-motion.com/henkpoley-3d3407
Post d'origine : https://x.com/HenkPoley/status/2104220387613761980

```text
Make a painful to see 1 minute motion graphics HTML page that shows what an absolutely terrible motion designer you are, like it’s a showreel designed to get your résumé immediately rejected. Do the absolute bare minimum.
```

### Database client launch video
*@iamMXFSCHR · Sep 25, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/iammxfschr-d68f90
Post d'origine : https://x.com/iamMXFSCHR/status/2103619221296955831

```text
nice. wir brauchen ein launch video für den release. kannst du das machen? so a la anthropic like? hab da was gelesen und der prompt war ""make a modern slick and punchy video for a modern startup that works on inference"
```

### Studio1 intro showreel
*@Astrodevil_ · Sep 25, 2026* — tags : Charts, Kinetic type
Source : https://prompt-motion.com/astrodevil-3f2054
Post d'origine : https://x.com/Astrodevil_/status/2103600734017392708

```text
make a dynamic 15-second motion graphics video that shows what an incredible work Studio1 is doing, you will get relevant info from case study, create like it's a good showreel for a Studio1 intro launch. go all out.
```

### Clay-style music video
*@DavidShulmanFL · Sep 25, 2026* — tags : Characters, Music
Source : https://prompt-motion.com/davidshulmanfl-371638
Post d'origine : https://x.com/DavidShulmanFL/status/2103336310089842921

```text
Create a 60 second music video in the style of Peter Gabriel's Sledgehammer and Big Time. But use modern references and figures. Also create the song, something sounds like it would fit on Peter Gabriel's So album.
```

### Sherwood agentic hedge fund explainer
*@imthatcarlos · Remotion · Sep 23, 2026* — tags : Product UI, Kinetic type, Photos
Source : https://prompt-motion.com/imthatcarlos-e04bfe
Post d'origine : https://x.com/imthatcarlos/status/2102849219388133592

```text
make a modern slick and punchy video for sherwood protocol. feel free to take branding or components from the landing page or app. the goal is to highlight how it enables agentic hedge funds, explaining it simply
```

### Voice agent SaaS launch
*@FractaDev · Sep 26, 2026* — tags : Product UI, Charts
Source : https://prompt-motion.com/fractadev-149adc
Post d'origine : https://x.com/FractaDev/status/2103941789744861266

```text
Analyze my frontend project, use the actual components from the product, and create a dynamic motion graphics video that showcases and sells my SaaS. Make it feel like a high-end product launch. Go all out.
```

### Dub promo video
*@steventey · effort High · Sep 25, 2026* — tags : Product UI, Charts
Source : https://prompt-motion.com/steventey-0d20e4
Post d'origine : https://x.com/steventey/status/2103625902211088880

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.

it should be a launch saas video for https://dub.co
```

### Product intro synced to music
*@BogdanDragomir · Sep 27, 2026* — tags : Product UI, Particles, Music
Source : https://prompt-motion.com/bogdandragomir-35e024
Post d'origine : https://x.com/BogdanDragomir/status/2104045641538412658

```text
Create an intro for https://t.co/wQXZTaqf1b highlighting what it does.

Create the music too and make sure the video is synced with it.

Give your best, Ultracode, as if it’s your portfolio master piece.
```

### Claude self-intro motion graphic (utilisé 2 fois)
*@1littlecoder · Sep 25, 2026* — tags : Kinetic type, Shapes
Source : https://prompt-motion.com/1littlecoder-9fef89
Post d'origine : https://x.com/1littlecoder/status/2103587706999914649

```text
make a dynamic 10-second motion graphics video that shows who are you as Opus 5.5 - be as creative and dynamic as possible. Avoid the frames and texts on the corners which are typical ai made giveaways!
```

### Overthinking motion study
*@gizakdag · Sep 25, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/gizakdag-cf4ae6
Post d'origine : https://x.com/gizakdag/status/2103566030916239768

```text
Make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it’s your showreel exploring the concept of “Overthinking,” inspired by the attached graphics.
```

### Browser automation skill launch
*@hqmank · Sep 26, 2026* — tags : Product UI, Music, Code
Source : https://prompt-motion.com/hqmank-7c61f1
Post d'origine : https://x.com/hqmank/status/2103831140033241156

```text
Make a dynamic 20-second motion graphics launch video for my open-source project jev-browser-skill ('Give a site. Write a goal. Jev clicks.'), like it's the hero video on its GitHub README. Go all out.
```

### EyezOn 100 users thank-you
*@Sudiyasa_ · Sep 26, 2026* — tags : Kinetic type, Shapes, Music
Source : https://prompt-motion.com/sudiyasa-f48ac9
Post d'origine : https://x.com/Sudiyasa_/status/2103638831669076027

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out do this to thank the first 100 users of @eyezonbot
```

### Motion design showreel
*@samuel_spitz · Sep 25, 2026* — tags : Kinetic type, Shapes
Source : https://prompt-motion.com/samuel-spitz-974923
Post d'origine : https://x.com/samuel_spitz/status/2103544855276503053

```text
Create a motion graphics video that feels like the centerpiece of a world-class designer’s showreel. Treat it as your résumé: showcase your full range, push the craft as far as possible. Go all out.
```

### Tennis game launch video
*@deifosv · Sep 24, 2026* — tags : Product UI, Phone
Source : https://prompt-motion.com/deifosv-04e4d3
Post d'origine : https://x.com/deifosv/status/2103197522382786581

```text
Create a high energy launch video, showing live stats from the website, show that users can play on desktop and mobile and multiple themes, if need, give me a prompt to generate the song using Suno
```

### Mathematics motion showreel
*@Math_files · Sep 28, 2026* — tags : Charts, Diagrams
Source : https://prompt-motion.com/math-files-39c9d0
Post d'origine : https://x.com/Math_files/status/2104486181853610052

```text
make a dynamic 20-second motion graphics video related to mathematics that shows what an incredible motion designer with mathematics skills you are, like it's your showreel for a résumé. go all out
```

### Website analyzer product promo
*@en______ra · Sep 27, 2026* — tags : Product UI
Source : https://prompt-motion.com/en-ra-81c6dd
Post d'origine : https://x.com/en______ra/status/2104035188061986980

```text
make a dynamic 15-second motion graphics video for RedSeed AI (Replace with your Project) that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### Flexprice motion showreel
*@sudeepsd_ · Sep 26, 2026* — tags : Charts, Particles
Source : https://prompt-motion.com/sudeepsd-1a3485
Post d'origine : https://x.com/sudeepsd_/status/2103776623548158453

```text
make a dynamic 15-second motion graphics video of what you know about @tryflexprice that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### Fiery samurai kata
*@chrisjdimarco · JavaScript · Sep 24, 2026* — tags : Particles, Characters
Source : https://prompt-motion.com/chrisjdimarco-f068db
Post d'origine : https://x.com/chrisjdimarco/status/2103232192847524106

```text
make a samurai dude in only javascript and have him doing a routine in a single spot going through various seriously impressive poses and motions and positions in a fiery awesome display
```

### Shadow theatre home story
*@x4b47x · JavaScript · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/x4b47x-9cc84f
Post d'origine : https://x.com/x4b47x/status/2103019799614034026

```text
Create a pure javascript animation. 30-60s, vertical 9:16, paper cut-out shadow theatre style with gentle, fitting audio (made in code) on the topic: What makes a place feel like home?
```

### Fitters Bible app promo
*@Adamdesgns · Sep 25, 2026* — tags : Product UI, Phone, Diagrams
Source : https://prompt-motion.com/adamdesgns-478d6d
Post d'origine : https://x.com/Adamdesgns/status/2103542756555768014

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out. (About the pipefitters bible)
```

### Recruiter self-intro reel
*@blushpetal795 · Sep 26, 2026* — tags : Charts, Kinetic type, Particles
Source : https://prompt-motion.com/blushpetal795-0c85c2
Post d'origine : https://x.com/blushpetal795/status/2103744870041170220

```text
Make a dynamic 15-second motion graphics video of me introducing myself to a recruiter. Use all the motion design skills you have, like it's your showreel for a resume. Go all out.
```

### Chunku product promo
*@reyzostyle · HyperFrames · Sep 30, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/reyzostyle-b55864
Post d'origine : https://x.com/reyzostyle/status/2105421514665542114

```text
make a dynamic 10 second motion graphics video about https://t.co/Zi6zrTvzqI that shows what an incredible motion designer you are, like its your showreel for a resume. go all out
```

### fal motion design showreel
*@influencer_seo · Sep 29, 2026* — tags : Kinetic type, Photos
Source : https://prompt-motion.com/influencer-seo-ce8c33
Post d'origine : https://x.com/influencer_seo/status/2104827314400026936

```text
make a dynamic 15-second motion graphics video for @fal that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out. Use the fal API.
```

### Amazon wholesale pitch video
*@ceowinkz · Sep 26, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/ceowinkz-7c776b
Post d'origine : https://x.com/ceowinkz/status/2103647124126683602

```text
make a dynamic 15 second motion graphics video pitching my Amazon wholesale company, Winkz Enterprises, to a brand. show why they should let us sell their products. go all out.
```

### sweetRegret app update reel
*@thilina_a · Sep 28, 2026* — tags : Product UI, Phone, Characters
Source : https://prompt-motion.com/thilina-a-891c09
Post d'origine : https://x.com/thilina_a/status/2104455320424915273

```text
make a dynamic 25-second motion graphics video that shows what an incredible motion designer you are. Highlight the recent changes [1.3, 1.4] we made with the last few updates.
```

### Psychedelic hypnotic eye showreel
*@monokern · Sep 25, 2026* — tags : Shapes
Source : https://prompt-motion.com/monokern-ade5b6
Post d'origine : https://x.com/monokern/status/2103563538828832979

```text
make a dynamic 20-second motion graphics video that shows what an incredible motion designer you are, psychedelic and hypnotic. make it feel like a showreel piece. go all out.
```

### Bento.surf product video
*@bizibeast · Sep 26, 2026* — tags : Product UI, Phone
Source : https://prompt-motion.com/bizibeast-10f264
Post d'origine : https://x.com/bizibeast/status/2103696876130505124

```text
Research Bento.surf. Make a dynamic 40-second motion graphics video on Bento.surf that shows what an incredible motion designer you are. like it's your showreel - Go all out.
```

### Distilbook product video (utilisé 2 fois)
*@ajith_io · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/ajith-io-c52e09
Post d'origine : https://x.com/ajith_io/status/2103469807375208546

```text
Research Distilbook.Make a dynamic 40-second motion graphics video on Distilbook that shows what an incredible motion designer you are. like it's your showreel - Go all out.
```

### Swiss-style motion showreel
*@levabashidze · effort Max · Sep 26, 2026* — tags : Kinetic type, Shapes
Source : https://prompt-motion.com/levabashidze-2d713a
Post d'origine : https://x.com/levabashidze/status/2103786742520184909

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out. dont ask just make
```

### Motion designer showreel
*@KangarooHere · effort Medium · Sep 25, 2026* — tags : Product UI, Phone, Charts, Kinetic type
Source : https://prompt-motion.com/kangaroohere-b10f8d
Post d'origine : https://x.com/KangarooHere/status/2103617278671818789

```text
make a dynamic 20-second motion graphics video for my newsletter that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### Whiteboard skill tutorial
*@lemomo_ai · Sep 27, 2026* — tags : Product UI, Diagrams
Source : https://prompt-motion.com/lemomo-ai-0d9cff
Post d'origine : https://x.com/lemomo_ai/status/2104070024575242622

```text
Create a tutorial video explaining how to create videos using Lemo-Opuscar skill (Opus 5.5) , in a [Whiteboard Explainer] style. One prompt, one answer, then ship film.
```

### Motion designer portrait showreel
*@ndhabarde11 · Sep 26, 2026* — tags : Kinetic type, Shapes, Particles
Source : https://prompt-motion.com/ndhabarde11-f155b4
Post d'origine : https://x.com/ndhabarde11/status/2103832593355686104

```text
make a dynamic 15-second motion graphics video in portrait mode that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### Replica symmetry breaking whiteboard
*@tak3sh8 · Sep 26, 2026* — tags : Diagrams
Source : https://prompt-motion.com/tak3sh8-be5012
Post d'origine : https://x.com/tak3sh8/status/2103667481139441895

```text
Prompt 1: "Do a quick hand-drawn whiteboard animations explaining what is replica symmetry breaking in the SK model"

Prompt 2: "build the mp4 version with narration"
```

### Bold Pilot SEO promo
*@utopyaszx · effort Medium · Sep 28, 2026* — tags : Product UI, Charts, Kinetic type
Source : https://prompt-motion.com/utopyaszx-1b2f94
Post d'origine : https://x.com/utopyaszx/status/2104665591428624771

```text
make a dynamic 15-second motion graphics video for Bold Pilot that shows what an incredible motion designer you are, like it's your showreel for a resume. go all out.
```

### Code-only motion design reel
*@johnsavage_ai · Sep 25, 2026* — tags : Kinetic type, Shapes
Source : https://prompt-motion.com/johnsavage-ai-b091c0
Post d'origine : https://x.com/johnsavage_ai/status/2103600308010041677

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a resume. go all out. use only code
```

### Trezio app motion reel
*@agonaliu_ · Sep 27, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/agonaliu-466a8f
Post d'origine : https://x.com/agonaliu_/status/2104117465475326227

```text
Make a dynamic 15-second motion graphics video for Trezio app that shows what an incredible motion designer you are, like it's your showreel for a résumé. Get it!
```

### Dubz Up motion showreel
*@Devius_Maximus · Sep 29, 2026* — tags : Product UI, Phone, Kinetic type, Characters
Source : https://prompt-motion.com/devius-maximus-beab45
Post d'origine : https://x.com/Devius_Maximus/status/2105069053521887428

```text
make a dynamic motion graphics video for our project dubz up, show what an incredible motion designer you are, like it's your showreel for a résumé. go all out.
```

### Drone Emprit showreel
*@ismailfahmi · Sep 25, 2026* — tags : Charts, Particles
Source : https://prompt-motion.com/ismailfahmi-557268
Post d'origine : https://x.com/ismailfahmi/status/2103557833153466403

```text
make a dynamic 15-second motion graphics video that shows what an incredible media intelligent Drone Emprit is, like it's our showreel for a résumé. go all out.
```

### Animated space cartoon episode
*@Ryzoft · Three.js · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/ryzoft-4f85bd
Post d'origine : https://x.com/Ryzoft/status/2102989395359887481

```text
I want you to imagine a story. And then using threejs I want you to create full animation, star wars 80s-level quality 90s cartoon out of the story you imagine.
```

### Recursion explained in genres
*@emollick · Sep 26, 2026* — tags : Characters, Code
Source : https://prompt-motion.com/emollick-8661a8
Post d'origine : https://x.com/emollick/status/2103688362960019567

```text
A video explaining recursion, where every explanation about recursion has a radically different video style, make this self-referential & clever & fast moving.
```

### Nohandslabs brand promo
*@robvjourney · Sep 26, 2026* — tags : Kinetic type, Particles, Code
Source : https://prompt-motion.com/robvjourney-ce3e1a
Post d'origine : https://x.com/robvjourney/status/2103768390322237474

```text
Can you make a 15-second motion graphic video of https://t.co/4AZZ7AlJvi? Go ALL OUT and make the most badass video you possibly can use everything you've got.
```

### FundMyCompute platform overview
*@JayScambler · Sep 28, 2026* — tags : Product UI, Diagrams
Source : https://prompt-motion.com/jayscambler-3f8889
Post d'origine : https://x.com/JayScambler/status/2104634653491495095

```text
make a dynamic 20-second motion graphics video for fundmycompute that gives an overview of the platform and shows what an incredible motion designer you are
```

### Second brain service promo
*@TheViableEdge · Remotion · Sep 27, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/theviableedge-9065be
Post d'origine : https://x.com/TheViableEdge/status/2104207707980869918

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, and can be the hero asset for the course landing page.
```

### Flowdrive motion showreel
*@manuelogomigo · Sep 25, 2026* — tags : Shapes, Particles
Source : https://prompt-motion.com/manuelogomigo-f33ca9
Post d'origine : https://x.com/manuelogomigo/status/2103614667038052364

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a flowdrive. go all out.
```

### Claude motion designer showreel (utilisé 28 fois)
*@3xtihor · Sep 25, 2026* — tags : Charts, Kinetic type, Shapes, Music
Source : https://prompt-motion.com/3xtihor-0f6911
Post d'origine : https://x.com/3xtihor/status/2103551886272159839

```text
Make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. Go all out.
```

### Bold typographic motion showreel (utilisé 2 fois)
*@motiondsgnr · Sep 26, 2026* — tags : Charts, Kinetic type, Shapes
Source : https://prompt-motion.com/motiondsgnr-9dcfa6
Post d'origine : https://x.com/motiondsgnr/status/2103692944771313960

```text
Make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a resume. Go all out.
```

### QuickDesign brand promo
*@quickdesignio · Sep 25, 2026* — tags : Product UI, Kinetic type, Music
Source : https://prompt-motion.com/quickdesignio-dd93d0
Post d'origine : https://x.com/quickdesignio/status/2103617779857338399

```text
make a dynamic 15-second motion graphics video that shows what an incredible quickdesign is! and also shows what an incredible motion designer you are!
```

### Quetzal social app reel
*@miskinho_ · Sep 26, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/miskinho-443898
Post d'origine : https://x.com/miskinho_/status/2103847584531956105

```text
make 1 dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for Quetzal. go all out.
```

### Kinetic shapes showreel
*@Shinskinakamoto · Sep 25, 2026* — tags : Kinetic type, Shapes, Particles
Source : https://prompt-motion.com/shinskinakamoto-20190b
Post d'origine : https://x.com/Shinskinakamoto/status/2103580532852589043

```text
Make a dynamic 15 second motion graphics video that shows what an incredible motion designer you are, like its your showreel for a resume, go all out!
```

### SuperX feature release teaser
*@robj3d3 · effort Max · Oct 5, 2026* — tags : Product UI
Source : https://prompt-motion.com/robj3d3-b18fad
Post d'origine : https://x.com/robj3d3/status/2107040421989994822

```text
look at my product roadmap and make a dynamic 15-second motion graphics video that teases the next feature release. go all out and hold nothing back
```

### Claude motion design showreel
*@rendesr · Sep 25, 2026* — tags : Kinetic type, Shapes
Source : https://prompt-motion.com/rendesr-86be44
Post d'origine : https://x.com/rendesr/status/2103395846578676116

```text
Make a dynamic 15 second motion graphics video that shows off what an incredible motion designer you are. Imagine it's your showreel for a resume!
```

### Recipe brand 20th anniversary
*@deebeeeff · effort Medium · Sep 29, 2026* — tags : Particles
Source : https://prompt-motion.com/deebeeeff-50fcd0
Post d'origine : https://x.com/deebeeeff/status/2104952364365234301

```text
Attach the brand image along with the prompt.

make a dynamic 10-second motion graphics video celebrating The Ferguson Recipes 20th Anniversary
```

### DistilBook product explainer (utilisé 2 fois)
*@sudo_kiran · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/sudo-kiran-4f8b59
Post d'origine : https://x.com/sudo_kiran/status/2103486573476254201

```text
make a dynamic 30-seconds motion graphic video about the distilbook like a product explainer the video has to be very incredible
(product url)
```

### Ondefica app motion reel
*@jesscaroline7 · HyperFrames · effort Max · Sep 27, 2026* — tags : Product UI, Phone, Charts, Kinetic type
Source : https://prompt-motion.com/jesscaroline7-1ff7cb
Post d'origine : https://x.com/jesscaroline7/status/2104336637752955094

```text
make a dynamic motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out
```

### Motion designer showreel
*@VanshWTFFF · effort Max · Sep 26, 2026* — tags : Kinetic type, Shapes, Particles
Source : https://prompt-motion.com/vanshwtfff-db0466
Post d'origine : https://x.com/VanshWTFFF/status/2103644352794992798

```text
make a dynamic 10 second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a resume.
```

### Gene Spectra promo
*@madebyjmayala · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/madebyjmayala-b9204d
Post d'origine : https://x.com/madebyjmayala/status/2103578285892649220

```text
make a dynamic 15-second motion graphics video promo about gene spectra, use assets from the current live site where relevant. go all out.
```

### GenVizu product launch
*@listudio · Sep 28, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/listudio-820c7b
Post d'origine : https://x.com/listudio/status/2104431418114023803

```text
Investigate my project GenVizu: https://t.co/5RaGMqn7rF Create a video for product release. Used for Hero and GTM materials on websites.
```

### Ren app launch video
*@macrohou · Sep 25, 2026* — tags : Product UI, Phone, Charts
Source : https://prompt-motion.com/macrohou-33959d
Post d'origine : https://x.com/macrohou/status/2103545787875733862

```text
[gave access to Ren repo] Make a dynamic 30-second motion graphics video for Ren that shows off your motion and sound design. Go crazy.
```

### Pelican riding a bicycle
*@AxtonLiu · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/axtonliu-0b861d
Post d'origine : https://x.com/AxtonLiu/status/2103119648271290566

```text
每次一个新的模型出来呢，大家都让它去画 “鹈鹕骑自行车” 来判断这个模型的空间能力，基本上都是用 HTML、SVG 来画动画。当我实在看得都有审美疲劳了，我希望你能画一个最复杂、最精细、最精美的 “鹈鹕骑自行车”的动画视频，你可以用任何的技术，不用着急，画一天都可以。
```

### Token bucket rate limiter
*@ParkerRex · Canvas · Sep 24, 2026* — tags : Charts, Diagrams
Source : https://prompt-motion.com/parkerrex-1a54fe
Post d'origine : https://x.com/ParkerRex/status/2103206747846701462

```text
explain a token bucket rate limiter, canvas only, no libraries, every frame a pure function of time so my renderer can screenshot it.
```

### Keyframe motion design reel (utilisé 4 fois)
*@Grace_sunnyy · Oct 3, 2026* — tags : Kinetic type, Particles, Music
Source : https://prompt-motion.com/grace-sunnyy-29bc61
Post d'origine : https://x.com/Grace_sunnyy/status/2106532575712022677

```text
制作一段 15 秒的动态图形视频，展示你是一位多么出色的动态设计师，就像是你简历上的作品集一样，使用任何你认为能产出最佳效果的工具或技术。你拥有完全的创作自由，优先追求卓越的视觉设计、大胆的艺术指导、引人注目的构图和富有力量的动态表现，让每一秒都有价值。全力以赴。
```

### Starry Night cat-spotting game
*@MandelDuck · Sep 26, 2026* — tags : Characters
Source : https://prompt-motion.com/mandelduck-95fd08
Post d'origine : https://x.com/MandelDuck/status/2103802923465768972

```text
can you make a 3d game where you walk around and spot cats inside of a van gogh painting? we can start with stary night and its town
```

### Alan agent platform promo
*@prasad_pilla · Sep 26, 2026* — tags : Product UI, Diagrams
Source : https://prompt-motion.com/prasad-pilla-2c0cba
Post d'origine : https://x.com/prasad_pilla/status/2103728953785496049

```text
make a dynamic 15 second motion graphics video that shows what an incredible motion designer you are, for @tryAlanAI. go all out.
```

### Lightspark social promo video
*@davidmarcus · Sep 25, 2026* — tags : Kinetic type, Code
Source : https://prompt-motion.com/davidmarcus-a28a60
Post d'origine : https://x.com/davidmarcus/status/2103275618045686217

```text
make a punchy and modern short video for social that promotes @lightspark capabilities. Needs to be production grade with sound
```

### Motion designer showreel
*@hanifproduktif · Sep 25, 2026* — tags : Kinetic type, Particles
Source : https://prompt-motion.com/hanifproduktif-54bdee
Post d'origine : https://x.com/hanifproduktif/status/2103404901451829311

```text
You are applying as a motion designer in my agency. Make 15s video to showcase your skills and capabilities. Send me a showreel
```

### Photo retouch app promo
*@oliahmed205 · Sep 28, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/oliahmed205-3e31c4
Post d'origine : https://x.com/oliahmed205/status/2104679078465069378

```text
Make me a 15 sec promtional video for my product using product screenshots and assests, Be a Highly preofessional Video Editor.
```

### TypingMind logo reveal
*@tdinh_me · Sep 26, 2026* — tags : Shapes
Source : https://prompt-motion.com/tdinh-me-815acb
Post d'origine : https://x.com/tdinh_me/status/2103704250329301409

```text
Create an impressive motion design video of a slow-reveal transition that assembles and eventually reveals the TypingMind logo.
```

### Pixel art LLM history
*@PluginPlay__ · HTML · Sep 26, 2026* — tags : Diagrams, Characters
Source : https://prompt-motion.com/pluginplay-3d4006
Post d'origine : https://x.com/PluginPlay__/status/2103910844677472343

```text
pixel art boomerang render of the history of LLMs. then RSI. then it goes fucking crazy. 15 seconds max. self contained .html
```

### Tented image gen product video
*@justincooperman · Blender · Sep 24, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/justincooperman-e7bbc4
Post d'origine : https://x.com/justincooperman/status/2103201167367188876

```text
Make an animated clip about Tented's image gen capabilities where users ask for branded images and see them added to content
```

### founder.page launch video
*@RatheeJaisal · Sep 26, 2026* — tags : Product UI, Charts
Source : https://prompt-motion.com/ratheejaisal-1f4538
Post d'origine : https://x.com/RatheeJaisal/status/2103774864742154698

```text
build me a beautiful launch video 20 seconds or under that shows all our key features, make it fast paced and fit our brand
```

### Beat-synced bouncing 3D ball
*@Gorden_Sun · Three.js · Sep 30, 2026* — tags : Music
Source : https://prompt-motion.com/gorden-sun-041f56
Post d'origine : https://x.com/Gorden_Sun/status/2105302007896797351

```text
卡点的3D球体下坠的动画视频：对标专业的Blender做的效果，音乐是多首经典的纯音乐，场景按音乐切换，3D球体下坠时在3D场景的物件中弹跳，按音乐的节奏点亮物件。带一些幽默的元素。
使用three.js制作，不要使用Blender制作
```

### Email tool promo reel
*@melvynx · Sep 26, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/melvynx-6cde6c
Post d'origine : https://x.com/melvynx/status/2103714680577638493

```text
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are for <website url>
```

### Four seasons train window
*@itsolelehmann · Sep 24, 2026*
Source : https://prompt-motion.com/itsolelehmann-e47532
Post d'origine : https://x.com/itsolelehmann/status/2103124033365762215

```text
4 seasons passing outside a train window, a cozy carriage, a cup of coffee on the table, Grand Budapest Hotel style
```

### Collision-driven music machine
*@KamStudioLabs · HTML · Sep 23, 2026* — tags : Particles, Music
Source : https://prompt-motion.com/kamstudiolabs-447565
Post d'origine : https://x.com/KamStudioLabs/status/2102899866762440893

```text
Build a 45-second machine that plays an original piece of music, where every note comes from a visible collision.
```

### Lism CSS 1.0 release video
*@ddryo_loos · Oct 2, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/ddryo-loos-300829
Post d'origine : https://x.com/ddryo_loos/status/2105824736072925621

```text
Lism CSS ver.1.0 をリリースする時にSNSに動画を投稿したい。あなたがどれほど素晴らしいモーションデザイナーかを示す、シンプルかつダイナミックさもある15秒のモーショングラフィックスビデオを作成してください。
```

### Easing and morphing showreel
*@RoundtableSpace · effort Max · Sep 28, 2026* — tags : Kinetic type, Shapes, Music
Source : https://prompt-motion.com/roundtablespace-d3a1be
Post d'origine : https://x.com/RoundtableSpace/status/2104424611010232366

```text
make a 15-second motion graphics showreel that proves what an incredible motion designer you are, go all out.
```

### Personal skills showreel
*@ibrahimwasim240 · effort Max · Sep 26, 2026* — tags : Product UI, Particles, Characters
Source : https://prompt-motion.com/ibrahimwasim240-809370
Post d'origine : https://x.com/ibrahimwasim240/status/2103943233432940763

```text
make a dynamic 25 second motion graphics video that shows My skills like a showreel for a resume. go all out
```

### MotionSites one million visitors
*@viktoroddy · Sep 26, 2026* — tags : Product UI, Charts, Code
Source : https://prompt-motion.com/viktoroddy-98c1d8
Post d'origine : https://x.com/viktoroddy/status/2103802280617402509

```text
Create a launch video for MotionSites AI, just hit 1 million monthly visitors after 8 months after launch.
```

### Backlink audit data promo
*@PalashBagchi11 · Sep 24, 2026* — tags : Charts, Kinetic type
Source : https://prompt-motion.com/palashbagchi11-0a4b6b
Post d'origine : https://x.com/PalashBagchi11/status/2102924409124389221

```text
Add a good fast royalty free music to this video, and make 2 versions - 1 landscape, and another portrait
```

### AllInvestView product promo
*@rammanq · Sep 26, 2026* — tags : Product UI, Phone, Charts
Source : https://prompt-motion.com/rammanq-f5a90f
Post d'origine : https://x.com/rammanq/status/2103788796022034553

```text
Make a dynamic motion graphics video that shows what an incredible platform AllInvestView is. Go all out.
```

### Black hole time story
*@RebutonePress · Sep 25, 2026*
Source : https://prompt-motion.com/rebutonepress-810f78
Post d'origine : https://x.com/RebutonePress/status/2103478369245688099

```text
听说 opus 5.5 做视频很强，请让我见识下。结合本机环境风格，做一个关于时间的故事，5分钟。要完整的视频，音频和字幕。需要什么工具自己在devshell配置，渲染完成后只留视频成品文件，其他全部清理干净。
```

### Lighthouse keeper silent short
*@KamStudioLabs · Sep 23, 2026* — tags : Characters
Source : https://prompt-motion.com/kamstudiolabs-0b0824
Post d'origine : https://x.com/KamStudioLabs/status/2102908742518100086

```text
Make a 45-second silent short film with no dialogue, where sound tells half the story. Invent the story.
```

### DeFi Saver stop-motion explainer
*@_nikolajankovic · Sep 23, 2026* — tags : Charts, Diagrams
Source : https://prompt-motion.com/nikolajankovic-ce4ff4
Post d'origine : https://x.com/_nikolajankovic/status/2102867033100616097

```text
make a hand-drawn stop-motion animation;
story: you're defi saver and explaining yourself in 1st person
```

### Pixelup Labs studio showreel
*@arjunsh1607 · Sep 27, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/arjunsh1607-93005d
Post d'origine : https://x.com/arjunsh1607/status/2104295133432922126

```text
create a 15 sec motion graphics showreel for @pixeluplabs, be extremely detail oriented and go all out
```

### Norilu product launch video
*@sachaarbonel · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/sachaarbonel-8f14f4
Post d'origine : https://x.com/sachaarbonel/status/2103614797501673648

```text
Create a professional product launch video with motion graphics. You have access to the designs in pen
```

### Steam new releases news recap
*@gigabit_million · Sep 27, 2026* — tags : Charts
Source : https://prompt-motion.com/gigabit-million-16b3a0
Post d'origine : https://x.com/gigabit_million/status/2104068536041959719

```text
9月25日～9月26日にSteamにリリースされたゲームの紹介ニュースを、ゲーマーの目線で各ゲームの面白そうなポイントをわかるように、見やすい約60秒ぐらいのモーショングラフィックスで作ってください
```

### Supasito launch video
*@wozu_co · Oct 1, 2026* — tags : Product UI
Source : https://prompt-motion.com/wozu-co-242285
Post d'origine : https://x.com/wozu_co/status/2105662660779893062

```text
please create me a motion design / launch video for supasito dot com it should be under 15 seconds.
```

### What is Git explainer
*@Yunn260414 · JavaScript · Sep 27, 2026* — tags : Diagrams, Code
Source : https://prompt-motion.com/yunn260414-60d996
Post d'origine : https://x.com/Yunn260414/status/2104044910769016888

```text
帮我用js制作一个视频，主题是：什么是Git
要深入浅出，让一个计算机0基础的人也能看得懂，然后要介绍一些常用指令的意思等等
要有声音的，然后是中文讲的
你可以用任何工具或者安装工具，可以联网检索
```

### Sotto reading app explainer
*@1stnoel_ · Sep 24, 2026* — tags : Product UI, Phone
Source : https://prompt-motion.com/1stnoel-c20a89
Post d'origine : https://x.com/1stnoel_/status/2103247530259603851

```text
Make a 1-minute educational video about https://readsotto.app/ with synthesized voice narration.
```

### Full Stop figure sequence
*@HBCoop_ · effort Max · Oct 5, 2026* — tags : Shapes, Particles
Source : https://prompt-motion.com/hbcoop-de365c
Post d'origine : https://x.com/HBCoop_/status/2107139305324122491

```text
Create me a motion video of your choice, with the sole purpose of flexing Opus 5.5 capabilities.
```

### Design portfolio video reel
*@kikelopezdesign · Sep 25, 2026* — tags : Product UI, Phone
Source : https://prompt-motion.com/kikelopezdesign-7cc9e8
Post d'origine : https://x.com/kikelopezdesign/status/2103527289619173471

```text
Make a 20 second video about my portfolio from scratch, using only the portfolio's own resources
```

### CloudJoi search showcase
*@lester_tyy · Remotion · Sep 26, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/lester-tyy-f897f7
Post d'origine : https://x.com/lester_tyy/status/2103733819568480587

```text
Study how this https://t.co/SR0AyULLNp works and use Remotion to make a product showcase video.
```

### Pixel art card battle game
*@aisongman · Sep 26, 2026* — tags : Characters
Source : https://prompt-motion.com/aisongman-71ffac
Post d'origine : https://x.com/aisongman/status/2103763192971461057

```text
Create a 1-on-1 card game like Hearthstone.
Just make it. As best you can.
In pixel art style.
```

### Tally product demo
*@VisheshBaghell · Sep 26, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/visheshbaghell-3aba37
Post d'origine : https://x.com/VisheshBaghell/status/2103772327146119508

```text
build me a product demo for my site using /brag skill. make sure to emphasize on all features
```

### Five scroll-based sections
*@ercankeskinx · Sep 24, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/ercankeskinx-ec2568
Post d'origine : https://x.com/ercankeskinx/status/2102995443818897906

```text
Build 5 completely different scroll-based sections, decide the context & layout yourself.
```

### Handwoven textiles brand explainer
*@AmitSingha89 · Sep 26, 2026* — tags : Kinetic type, Photos
Source : https://prompt-motion.com/amitsingha89-150378
Post d'origine : https://x.com/AmitSingha89/status/2103737604277780553

```text
Make a professional explainer video for https://anuprerna.com for a first-time visitor.
```

### Talking-head clip edit
*@sab8a · OpenEdit · Sep 24, 2026* — tags : Photos
Source : https://prompt-motion.com/sab8a-364a5a
Post d'origine : https://x.com/sab8a/status/2103144778481475686

```text
Cut a raw talking-head clip into a punchy, fun edit with subtitles, graphics and music
```

### YouTube transcript product ad
*@tstfully · Sep 27, 2026* — tags : Product UI, Kinetic type
Source : https://prompt-motion.com/tstfully-0aa6b4
Post d'origine : https://x.com/tstfully/status/2104033772949680192

```text
make a 15-second motion graphics product ad: paste a YouTube video, get every word.
```

### Indian civilisation history film
*@BuildFastWithAI · Sep 28, 2026* — tags : Diagrams
Source : https://prompt-motion.com/buildfastwithai-53234e
Post d'origine : https://x.com/BuildFastWithAI/status/2104451249269780900

```text
generate a creative mp4 video on indian civilisation with music and sound effects.
```

### Mascot referral program promo
*@paulo_kombucha · Sep 28, 2026* — tags : Product UI, Characters
Source : https://prompt-motion.com/paulo-kombucha-96431c
Post d'origine : https://x.com/paulo_kombucha/status/2104481235028283883

```text
make a dynamic 15-second motion graphics video to talk about our referral program
```

### First & 10 yellow line explainer
*@blueoctopusai · Sep 30, 2026* — tags : Diagrams
Source : https://prompt-motion.com/blueoctopusai-dd17bd
Post d'origine : https://x.com/blueoctopusai/status/2105116391439270222

```text
Make a motion graphics video that explains how the First & 10 Yellow Line works.
```

### Animated short about a bug
*@KamStudioLabs · Sep 23, 2026* — tags : Characters, Code
Source : https://prompt-motion.com/kamstudiolabs-c9bb28
Post d'origine : https://x.com/KamStudioLabs/status/2102903173161877996

```text
Make a 90-second animated short film about a bug that doesn't want to be fixed.
```

### Festival lineup promo reel
*@GonzaloMacagno · Sep 23, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/gonzalomacagno-2de1a9
Post d'origine : https://x.com/GonzaloMacagno/status/2102897651008344202

```text
Necesito que armes un reel con esta info en 10 segundos, bien publicitario
```

### Moroccan political history timeline
*@TrigLyceee · Sep 26, 2026* — tags : Charts, Kinetic type
Source : https://prompt-motion.com/triglyceee-bd5b08
Post d'origine : https://x.com/TrigLyceee/status/2103804459986161719

```text
réalise une vidéo résumant la vie politique au Maroc depuis l’indépendance
```

### Poster breaking its frame
*@pankajkumar_dev · Sep 25, 2026* — tags : Kinetic type, Shapes, Music
Source : https://prompt-motion.com/pankajkumar-dev-0bee87
Post d'origine : https://x.com/pankajkumar_dev/status/2103502614134718609

```text
create a motion design video of a poster breaking out of its own frame.
```

### Porco Rosso sunset dogfight
*@NFT_Chen · Three.js · Sep 26, 2026*
Source : https://prompt-motion.com/nft-chen-5f8bb0
Post d'origine : https://x.com/NFT_Chen/status/2103882415299350878

```text
用 web3D 复刻宫崎骏《红猪》日落海面上的经典空战：白绿红涂装战斗机、紫色积云、海面反光、吉卜力运镜，画面写 just breathe.
```

### AIsa API key promo
*@0xfemyn · Sep 26, 2026* — tags : Product UI
Source : https://prompt-motion.com/0xfemyn-e114d3
Post d'origine : https://x.com/0xfemyn/status/2103796337041137833

```text
make a dynamic 15-second motion graphics video for AIsa. Go all out.
```

### Kinetic type showreel
*@zheke · Sep 25, 2026* — tags : Kinetic type, Shapes
Source : https://prompt-motion.com/zheke-38deff
Post d'origine : https://x.com/zheke/status/2103418664854622583

```text
Hello Opus 5.5 show me what an incredible motion designer you are.
```

### Photon journey from the Sun
*@apoorvjain25 · Sep 29, 2026* — tags : Kinetic type, Particles
Source : https://prompt-motion.com/apoorvjain25-d24184
Post d'origine : https://x.com/apoorvjain25/status/2104818940467945542

```text
make a 20-second video about anything, your call; make it crazy.
```

### Tengwang Pavilion moonlit river
*@DemitiyaGeekzen · WebGL2 + Canvas 2D + Web Audio · Sep 25, 2026*
Source : https://prompt-motion.com/demitiyageekzen-7770ad
Post d'origine : https://x.com/DemitiyaGeekzen/status/2103517910274818523

```text
用你最强的思维和能力，根据对我的了解，自行寻找我可能喜欢的主题，制作一个30s的视频还有互动html，尽可能的展示你的前端能力！
```

### AgentHud project motion video
*@Jazzen_Chen · effort Max · Sep 26, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/jazzen-chen-4542ae
Post d'origine : https://x.com/Jazzen_Chen/status/2103751442393894989

```text
make a dynamic motion graphics video about my project AgentHud.
```

### History of AI timeline
*@kloss_xyz · Sep 26, 2026* — tags : Diagrams, Kinetic type, Particles
Source : https://prompt-motion.com/kloss-xyz-fe0c31
Post d'origine : https://x.com/kloss_xyz/status/2103652674336067876

```text
make a video highlighting key moments in the history of AI.
```

### Step race app promo
*@marklaunches · Sep 26, 2026* — tags : Product UI
Source : https://prompt-motion.com/marklaunches-3b9492
Post d'origine : https://x.com/marklaunches/status/2103811146411041046

```text
build me an incredible video for my app. make it emotional.
```

### Celld job ownership explainer
*@0xnfrith · Sep 25, 2026* — tags : Diagrams
Source : https://prompt-motion.com/0xnfrith-5be616
Post d'origine : https://x.com/0xnfrith/status/2103358957050068999

```text
make me an animation to explain why celld earns its place.
```

### Oscilloscope-style studio motion graphic
*@rneayan · Sep 25, 2026* — tags : Charts, Kinetic type
Source : https://prompt-motion.com/rneayan-ea6129
Post d'origine : https://x.com/rneayan/status/2103401461837406275

```text
Make Motiongraphic about my studio with Oscilloscope style
```

### Anime robot combining sequence
*@allforbigfire · Python · Sep 27, 2026* — tags : Characters
Source : https://prompt-motion.com/allforbigfire-86ff3c
Post d'origine : https://x.com/allforbigfire/status/2104193522715029657

```text
もしかしてロボットアニメみたいな3機の乗り物が変形合体してロボットになるシーンもアニメ風3D CGで作れますか。
```

### Studio website showreel
*@andginja · Sep 25, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/andginja-333d32
Post d'origine : https://x.com/andginja/status/2103492000733618685

```text
make a 15-second showreel about my website. Go all out.
```

### Brieform product presentation
*@MajorBaguette · Remotion · Sep 26, 2026* — tags : Product UI
Source : https://prompt-motion.com/majorbaguette-fb11d7
Post d'origine : https://x.com/MajorBaguette/status/2103849602826834228

```text
make a presentation video for Brieform, 30 seconds long
```

### FigPad product promo
*@Ai_Baymax · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/ai-baymax-0ef9dd
Post d'origine : https://x.com/Ai_Baymax/status/2103411004902416787

```text
make a 1-min promo for this product from the codebase.
```

### Derivative concept explainer
*@LinearUncle · Manim, edge-tts · Sep 24, 2026* — tags : Charts, Diagrams
Source : https://prompt-motion.com/linearuncle-5d2bae
Post d'origine : https://x.com/LinearUncle/status/2103128559174971663

```text
请用Manim给我制作一个导数概念学习的视频，要求通俗易懂，并且有例子，引人思考。配音使用edge-tts
```

### PicTwin AI app ad
*@l3d1c · Sep 25, 2026* — tags : Product UI, Photos
Source : https://prompt-motion.com/l3d1c-0e35a3
Post d'origine : https://x.com/l3d1c/status/2103536553930752011

```text
create a motion design prompt for an ad for our site
```

### What day is it
*@tankazunori0914 · HyperFrames · Oct 2, 2026* — tags : Kinetic type, Music
Source : https://prompt-motion.com/tankazunori0914-0fc886
Post d'origine : https://x.com/tankazunori0914/status/2105917770907156748

```text
今日何曜日だっけ？BGM付きの30秒のかっこいいモーショングラフィックスで教えて（全力を出してください）
```

### ocrX app launch video
*@mehul4795 · Sep 25, 2026* — tags : Product UI
Source : https://prompt-motion.com/mehul4795-4a7007
Post d'origine : https://x.com/mehul4795/status/2103420457110417532

```text
Create a product launch video for ocrX Android app.
```

### GravityDEX anime hype edit
*@MicheleHarmonic · Sep 24, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/micheleharmonic-77628e
Post d'origine : https://x.com/MicheleHarmonic/status/2103111448352244175

```text
Make a GravityDEX x Gojo Satoru edit that goes hard
```

### Pixel wizard crypto animation
*@0xEvinho · Sep 24, 2026* — tags : Characters
Source : https://prompt-motion.com/0xevinho-3777d8
Post d'origine : https://x.com/0xEvinho/status/2103212966703436195

```text
make a similar version but with a crypto reference
```

### The Last Light animated short
*@faroukzy · Sep 25, 2026* — tags : Characters
Source : https://prompt-motion.com/faroukzy-9ff23e
Post d'origine : https://x.com/faroukzy/status/2103387771180138551

```text
make a 4-minute animated short that blows my mind.
```

### Personal research intro reel
*@Madhav_XO · Sep 25, 2026* — tags : Kinetic type, Particles, Code
Source : https://prompt-motion.com/madhav-xo-f97f20
Post d'origine : https://x.com/Madhav_XO/status/2103605007396524440

```text
make a 10 sec video on whatever you know about me
```

### AI Arena product promo
*@ezshine · Sep 25, 2026* — tags : Product UI, Code
Source : https://prompt-motion.com/ezshine-c90d73
Post d'origine : https://x.com/ezshine/status/2103501705698750731

```text
设计个动画，介绍本项目的各项特性，像是专业的产品介绍宣传片，最后要生成 16:9 的mp4 视频
```

### Claude motion design reel
*@ghinaiya_nirmal · Sep 25, 2026* — tags : Kinetic type, Shapes, Music
Source : https://prompt-motion.com/ghinaiya-nirmal-5d8fec
Post d'origine : https://x.com/ghinaiya_nirmal/status/2103540656182308943

```text
make your own 15-second motion reel. go all out
```

### Shop chatbot mascot promo
*@anas0ra · Sep 25, 2026* — tags : Characters
Source : https://prompt-motion.com/anas0ra-e57aea
Post d'origine : https://x.com/anas0ra/status/2103490331815952637

```text
fait moi une vidéo sympa pour https://heeya.fr
```

### AI data centre 3D film (utilisé 2 fois)
*@mdaman010 · HTML · effort High · Sep 26, 2026* — tags : Diagrams
Source : https://prompt-motion.com/mdaman010-e7226a
Post d'origine : https://x.com/mdaman010/status/2103845689713111079

```text
Show me what goes on inside an AI data centre.
```

### Parenting app hype video
*@francoxavier33 · Remotion · Sep 25, 2026* — tags : Product UI, Phone, Kinetic type
Source : https://prompt-motion.com/francoxavier33-d2dfd2
Post d'origine : https://x.com/francoxavier33/status/2103486218323341663

```text
make a hype demo/launch video for @momwiseai
```

### Chain.wtf pitch video
*@SPEARwtf · Sep 26, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/spearwtf-3c1fd1
Post d'origine : https://x.com/SPEARwtf/status/2103857153308029058

```text
Create a 30sec pitch video for @chaindotwtf
```

### Three.js Skyraider aircraft model
*@BuildFastWithAI · Three.js · effort High · Sep 24, 2026* — tags : Product UI
Source : https://prompt-motion.com/buildfastwithai-ed9447
Post d'origine : https://x.com/BuildFastWithAI/status/2103152898708582551

```text
Build a Douglas A-1H Skyraider in Three.js
```

### Chuseok pixel night scene
*@hoyoyoda · Sep 25, 2026* — tags : Characters
Source : https://prompt-motion.com/hoyoyoda-3a5c08
Post d'origine : https://x.com/hoyoyoda/status/2103400046922543147

```text
한국의 추석에 어울리는 요소를 서치해서 픽셀 애니메이션을 구성해서 제작해줘
```

### Risograph studio intro
*@rneayan · Sep 25, 2026* — tags : Diagrams, Kinetic type
Source : https://prompt-motion.com/rneayan-474bcf
Post d'origine : https://x.com/rneayan/status/2103401006281441493

```text
make about my studio with Risograph style
```

### Prompting mistakes video tutorial
*@henkvaness · Sep 26, 2026* — tags : Diagrams
Source : https://prompt-motion.com/henkvaness-0e06af
Post d'origine : https://x.com/henkvaness/status/2103801351993975279

```text
make educational video out of article.
```

### UK dubstep track with ASCII visuals
*@Rames_Jusso · HyperFrames · Sep 24, 2026* — tags : Music, Code
Source : https://prompt-motion.com/rames-jusso-589f80
Post d'origine : https://x.com/Rames_Jusso/status/2103200703598776559

```text
140 BPM rusko/skream style UK dubstep
```

### Claude self-promo spot
*@slvDev · effort Max · Sep 25, 2026* — tags : Product UI, Phone, Kinetic type
Source : https://prompt-motion.com/slvdev-64c45a
Post d'origine : https://x.com/slvDev/status/2103569170075975986

```text
create 15+ sec self-promotion promo
```

### Matra caption app promo
*@gautam_mer1 · Remotion, React · Sep 26, 2026* — tags : Product UI, Phone, Photos
Source : https://prompt-motion.com/gautam-mer1-2ae354
Post d'origine : https://x.com/gautam_mer1/status/2103703336780530003

```text
an Apple-style 30s video of my app
```

### ODATANO Cardano hype edit
*@maxalexweber · Sep 24, 2026* — tags : Kinetic type, Particles
Source : https://prompt-motion.com/maxalexweber-67688b
Post d'origine : https://x.com/maxalexweber/status/2103118009535459784

```text
Make a ODATANO edit that goes hard
```

### Ball escaping twelve rings
*@kantamk · Sep 24, 2026* — tags : Shapes, Music
Source : https://prompt-motion.com/kantamk-61f410
Post d'origine : https://x.com/kantamk/status/2103148907228176511

```text
make a video that could go viral.
```

### Shin Majin-shiki promo
*@Majin_AppSheet · HyperFrames · Sep 25, 2026* — tags : Kinetic type
Source : https://prompt-motion.com/majin-appsheet-2d3c1a
Post d'origine : https://x.com/Majin_AppSheet/status/2103497319899693327

```text
シンまじん式のPV作って
```

### Claude motion design showreel
*@sudo_kiran · Sep 25, 2026* — tags : Kinetic type, Shapes, Particles
Source : https://prompt-motion.com/sudo-kiran-49176d
Post d'origine : https://x.com/sudo_kiran/status/2103463886372696074

```text
Go all out.
```
