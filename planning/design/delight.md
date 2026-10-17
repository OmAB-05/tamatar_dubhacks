# **tamatar.si — Delight Spec (Interactivity, Tomato, Sound, Visual Design)**

[Planning index](../README.md) · [Project context](../product/context.md) · [UI plan](ui_planning.md)

> Goal: judges remember us as "the tomato app." The red pen is what makes tamatar useful; the tomato and the sound are what make it memorable.

**Rule \#1: P0 comes first.** Nothing in this doc starts before the midnight gate (one ramp problem working end to end). The exceptions are the visual direction (§2), which Coder A applies while building, and the sound assets (§5), which the third teammate can make right now without touching code.

---

## **1\. The big idea**

The tomato is **a character, not a mascot.** It lives in the corner of the screen, watches you write, reacts to your mistakes, cheers when you get things right, and slowly rots if you keep making the same error. It has a voice (ElevenLabs), a personality (cheeky, encouraging, a little dramatic), and a body you can poke.

Everything interactive in the app ties back to one of three moments:

1. **Writing** — calm, focused, paper-and-pen feel.  
2. **Getting checked** — the red pen moment; dramatic, satisfying.  
3. **Getting it right** — celebration; the tomato goes wild.

---

## **2\. Visual direction**

**Feel:** a premium notebook with a cartoon tomato living in it. Think warm paper, real ink, one bold red, and a single playful character. Not a dashboard, not a generic "AI app" gradient.

| Element | Direction |
| ----- | ----- |
| Background | Warm off-white paper with very faint texture and a soft 24px grid |
| Ink | Near-black blue (like a gel pen), pressure-sensitive |
| Accent | One tomato red, used for the red pen, the Check button, and the tomato only |
| Secondary | Leaf green (tomato stem), used sparingly for "correct" states |
| Fonts | Caveat for anything the red pen "writes"; Inter (or a rounded sans) for UI |
| Panels | Soft, floating cards with gentle shadows; rounded corners; lots of breathing room |
| Toolbar | Floating pill at the bottom, like a pencil case, not a flat bar |
| Motion | Everything springs and settles; nothing snaps or teleports |
| Dark mode | Skip it for the hackathon |

**Small touches that read as "premium":**

* The Check button is a red rubber stamp. It presses down when tapped and "stamps" with a little thud.  
* The red circle overshoots its start point, like a real pen stroke.  
* Corrections in the red pen appear letter by letter, as if handwritten.  
* The problem diagram (the ramp) is drawn in the same hand-drawn style as the student's ink.  
* A tiny paper-texture grain over everything removes the "flat web app" look.

---

## **3\. The tomato character**

### **3.1 Looks**

* Round, glossy, slightly squishy red tomato with a green leafy stem.  
* Simple face: two dot eyes and a small mouth. Eyes can blink and look around.  
* Built from layers (body, stem, eyes, mouth, highlight, rot spots) so each part can animate on its own.  
* Sits in the top-right corner, peeking out from behind the edge of the problem card.

### **3.2 Rot states (tied to mistakes)**

| State | Look | Mood |
| ----- | ----- | ----- |
| Fresh | Bright red, shiny highlight, perky stem | Happy, bouncy |
| Bruised | One soft brown spot, slightly duller | Worried |
| Wilting | Droopy stem, wrinkles, two spots | Sad, sighs |
| Rotten | Brown-green, flies buzzing around, sunken | Dramatic, "I'm dying here" |

Recovery is just as visible: each correct answer heals a spot with a little sparkle.

### **3.3 Idle behavior**

* Blinks every few seconds at random intervals.  
* Eyes follow the Apple Pencil tip as the student writes.  
* Gently bobs up and down, like breathing.  
* If nobody writes for \~30 seconds, it yawns and dozes off (z's float up). Starting to write again wakes it up with a startled jump.

### **3.4 Interactions**

| Trigger | Reaction | Sound |
| ----- | ----- | ----- |
| **Pencil hover** (Apple Pencil hovering over it; iPad Pro with M2 or later supports this) or mouse hover | Peeks further out from behind the card, eyes widen, curious tilt | Soft "ooh?" |
| **Tap** | Squish down and spring back (squash-and-stretch), giggle | Squish \+ giggle |
| **Hard tap / quick double-tap ("hit")** | Gets knocked sideways, wobbles like jelly, dizzy eyes, settles back | Bonk \+ "hey\!" |
| **Flick / drag and let go** | Flies off in that direction, bounces off the screen edge, rolls back home | Boing, rolling |
| **Long press** | Tomato speaks a hint for the current step (ElevenLabs voice) | Voice line |
| **Poke it 5+ times quickly** | Gets annoyed, puffs up red, then sticks its tongue out | Grumble |
| **Tap it when rotten** | A fly buzzes away, it groans | Buzz \+ groan |

These are the moments judges will play with during the demo. Let them poke it.

### **3.5 Reactions to the student's work**

| Event | Tomato reaction |
| ----- | ----- |
| Student presses Check | Leans in, squints, "hmm" while the red pen thinks |
| Mistake found | Winces as the red circle draws; then says the `mark` out loud (optional) |
| Same mistake again | Visibly rots one level; dramatic gasp |
| Correct FBD | Thumbs-up with a leaf, small hop |
| Correct final answer | Jumps, spins, and bursts tomato-seed confetti across the screen |
| 3-in-a-row streak | Puts on tiny sunglasses |
| Fully rotten | Falls over; the student can tap it to "replant" (resets with a pop) |

---

## **4\. The opening sequence**

**Length:** about 3 seconds. Skippable with a tap. Plays once per session.

1. **Blank paper.** Silence for a beat.  
2. **Tomatoes rain down.** Dozens of cartoon tomatoes drop from the top of the screen with real physics: they bounce off each other and pile into a woven basket at the bottom. Each landing makes a soft, cartoony plop, layered and slightly randomized.  
3. **The basket overflows.** Tomatoes keep coming until they spill over and pile up, filling the whole screen with red.  
4. **The reveal.** One tomato in the center blinks. That's our tomato. It looks at the camera.  
5. **The wipe.** The red pile squishes outward and becomes a red ink wipe that reveals the app underneath. The "tamatar.si" wordmark writes itself in red pen across the top.  
6. **"Tap the tomato to start."** Our tomato hops into its corner. The first tap starts the app.

**Why step 6 matters technically:** iPad Safari blocks sound until the user taps something. Making "tap the tomato" the start button unlocks audio for the whole session, so every sound effect after that works. The intro tomatoes can bounce silently, or play sound only if the page was already tapped.

**Demo tip:** in front of the judges, reload the page so they see the intro once.

---

## **5\. Sound design \+ ElevenLabs**

### **5.1 How we use ElevenLabs (recommended approach)**

| Use | ElevenLabs feature | When generated | Why |
| ----- | ----- | ----- | ----- |
| All sound effects | **Sound Effects** (text-to-sound) | **Ahead of time**, saved as audio files in the app | Instant playback, zero latency, works offline, no API cost during the demo |
| Tomato's fixed lines ("hey\!", "hmm", "nice\!", gasps) | **Voice Design** to create the tomato's voice, then **Text to Speech** | **Ahead of time** | Same as above; the tomato always sounds the same |
| Tomato reading hints aloud | **Text to Speech** with the low-latency Flash model | **Live**, through our own server route (key never in the browser) | Hints are different every time |
| *(Stretch)* Talk to the tomato | **Conversational AI / Agents** | Live | "Why is my normal force wrong?" — voice Q\&A with the tomato tutor |

**Key decisions:**

* **Pre-generate everything we can.** Live audio is only for hints. The demo should never wait on a network call for a sound.  
* **Cache spoken hints:** if the same hint was spoken before, replay the saved audio.  
* **Always have a mute button** in the toolbar. Sounds start at a low default volume. People study in libraries.  
* Keep the ElevenLabs API key **server-side only**, same as the Anthropic key.

### **5.2 The tomato's voice**

Use ElevenLabs Voice Design to create a custom voice. Prompt idea for the voice description:

> A small, cheeky, cartoon tomato character. Bright, slightly high-pitched, playful and expressive, quick energy, a little dramatic, warm and encouraging. Sounds like a friendly animated sidekick. Clear diction.

Pick the take that sounds most like a character, not a narrator. Save the voice ID for the backend.

**Personality rules for its lines:**

* Short — under 10 words for reactions, under 25 words for hints.  
* Encouraging but cheeky, never mean. ("Ooh, so close. Check your normal force.")  
* Optional flavor: an occasional Hindi word ("arre\!", "shabash\!") — on-brand with "tamatar" and fun for judges.

### **5.3 Sound effects list (generate in ElevenLabs Sound Effects)**

The third teammate can make all of these in the ElevenLabs web app right now. Generate 3–4 variations of each and pick the best. Export them, name them as below, and hand them to Coder A.

| File name | Trigger | ElevenLabs prompt | Length |
| ----- | ----- | ----- | ----- |
| `plop-1/2/3` | Intro tomatoes landing | Soft cartoon tomato plopping into a wicker basket, squishy, light | 0.3s |
| `basket-fill` | Intro basket overflowing | Many small cartoon tomatoes tumbling and piling up, playful | 1.5s |
| `ink-wipe` | Intro reveal | Quick wet ink brush swoosh across paper | 0.6s |
| `pen-scratch` | Red circle drawing | Red felt-tip marker drawing a quick circle on paper | 0.5s |
| `stamp` | Check button | Rubber stamp pressed firmly onto paper, satisfying thud | 0.3s |
| `thinking` | Waiting for check | Soft pencil tapping on a desk, rhythmic, quiet | 2s, loopable |
| `wrong` | Mistake found | Gentle cartoon "uh-oh" boop, two descending notes, not harsh | 0.4s |
| `correct` | Correct step | Bright cheerful two-note chime, warm marimba | 0.5s |
| `complete` | Problem solved | Short triumphant cartoon fanfare with a pop of confetti | 1.5s |
| `squish` | Tap tomato | Soft cartoon squish of a ripe tomato, rubbery bounce | 0.3s |
| `bonk` | Hit tomato | Cartoon bonk with a wobbly jelly spring | 0.5s |
| `boing` | Flick tomato | Springy cartoon boing bounce | 0.4s |
| `roll` | Tomato rolling back | Small round object rolling on a wooden desk | 1s |
| `buzz` | Fly when rotten | Tiny cartoon fly buzzing | 1s |
| `rot` | Tomato gets worse | Small sad deflating squelch | 0.5s |
| `heal` | Tomato recovers | Sparkly magical twinkle | 0.5s |
| `replant` | Reset from rotten | Pop of a seed sprouting, cheerful | 0.5s |
| `page-turn` | Next question | Notebook page turning | 0.5s |
| `pen-click` | Switching pen/eraser | Ballpoint pen click | 0.1s |
| `eraser` | Erasing a stroke | Short rubber eraser rub on paper | 0.2s |

**Optional: writing sound.** A very quiet pencil-on-paper texture that plays only while the Pencil is moving. Feels amazing when it works, annoying when it doesn't. Try it; cut it if it's distracting.

### **5.4 Fixed voice lines (generate ahead of time with the tomato voice)**

| Moment | Lines (generate 2–3 so it doesn't repeat) |
| ----- | ----- |
| App start | "Okay, let's do some physics\!" · "Ready when you are." |
| Hover | "Ooh?" · "Hi\!" |
| Tapped | Giggle · "Hehe, that tickles." |
| Hit | "Hey\!" · "Ow\! Rude." |
| Thinking | "Hmmm…" · "Let me look…" |
| Mistake | "Ooh, not quite." · "Arre, close\!" |
| Same mistake again | "Again?\! I'm rotting here\!" |
| Correct step | "Nice\!" · "Shabash\!" |
| Problem complete | "You did it\! I'm so ripe right now." |
| Fully rotten | "I'm… done. Tap me to replant." |
| Dozing off | Snore · "Wake me when you write something." |

---

## **6\. More interactive ideas (ranked by judge impact ÷ effort)**

1. **The ramp comes alive (HIGH impact).** When the student solves a problem correctly, the ramp diagram animates: the block actually slides down at the acceleration *they* calculated. If their answer were wrong, it would visibly slide wrong. This shows the physics, not just the grade. Strongest single "wow" in this doc.  
2. **Red pen writes like a person.** Corrections and marks appear letter by letter in Caveat, with the pen-scratch sound.  
3. **Seed confetti** on problem complete, in tomato red and leaf green.  
4. **Tomato eyes follow the Pencil.** Cheap to build and constantly visible.  
5. **Stamp Check button** with press animation and thud.  
6. **Streak sunglasses** at 3 in a row.  
7. **Splat moment.** When the tomato hits fully rotten, it falls off its corner and *splats* onto the screen, leaving a juicy mark that fades. Dramatic and funny; judges will laugh.  
8. **Ask the tomato (stretch).** Long-press the tomato and ask a question out loud; it answers using the current problem as context (ElevenLabs Agents or speech-to-text → Claude → TTS).

---

## **7\. Who does what**

| Person | Delight work | When |
| ----- | ----- | ----- |
| **Third teammate (non-coder)** | Generate all sound effects (§5.3) and the tomato voice \+ fixed lines (§5.2, §5.4) in the ElevenLabs web app. Draw or source the tomato's layered art and 4 rot states. Write the tomato's personality lines. | **Start now** — none of this needs code |
| **Coder A (frontend)** | Visual direction (§2) while building P0. After midnight: tomato character \+ interactions, intro sequence, sound playback, confetti, ramp animation. | §2 now; rest after the 12am gate |
| **Coder B (backend)** | ElevenLabs key in Vercel, a server route that speaks hints (with caching), voice ID config. Stretch: "Ask the tomato." | After the 12am gate |

**Suggested library choices for Coder A (decide, don't debate):** Framer Motion for springs and tomato animation, a lightweight 2D physics library (e.g. Matter.js) for the intro tomato rain, and a small audio library (e.g. Howler.js) for sound playback and mute.

---

## **8\. Updated night schedule**

| Time | What |
| ----- | ----- |
| Now → 12am | P0 as planned. Coder A uses the §2 visual direction. Third teammate makes all audio \+ tomato art. |
| 12–1:30am | Tomato character: layers, idle (blink, bob, eye-follow), rot states |
| 1:30–2:30am | Tomato interactions: hover, tap, hit, flick \+ sounds |
| 2:30–3:30am | Sounds wired across the app \+ mute toggle; tomato reactions to checks |
| 3:30–4:30am | Opening sequence (tomato rain → basket → wipe → tap to start) |
| 4:30–5:30am | Ramp-comes-alive animation \+ seed confetti |
| 5:30–7am | Polish, spoken hints, PDF import if not done |
| 7am | **FEATURE FREEZE** |

PDF import moves later or becomes a "what's next" talking point. The tomato and sound will win more points with judges than import will.

---

## **9\. Cut order (if we're behind)**

1. Ask the tomato (voice Q\&A)  
2. Splat moment  
3. Live spoken hints → keep only the pre-recorded reaction lines  
4. Physics in the intro → a simpler animation of tomatoes dropping in and the red wipe  
5. Flick interaction  
6. Ramp-comes-alive  
7. **Never cut:** the tomato's tap/hit reactions, rot states, the core sound effects (stamp, pen-scratch, correct, wrong), and the mute button.

---

## **10\. Demo moments to rehearse**

* Reload so judges see the intro tomato rain.  
* Make a mistake on purpose → stamp, pen-scratch, tomato winces and says "Arre, close\!"  
* Repeat the mistake → tomato rots and gasps.  
* **Hand the iPad to a judge and tell them to poke the tomato.**  
* Solve it → the block slides down the ramp, seed confetti, the tomato cheers.

