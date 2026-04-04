# Colourmap Research Document

> From energy to clarity.

---

## Executive Summary

Colourmap is a personal cockpit that does something no existing app does: it puts what you feel and what you do in the same frame, and over time, it turns that data into a story about who you are.

The market has productivity tools (Notion, Todoist) and wellness tools (Headspace, Daylio). Nobody builds for the space between — the person who is both doing things and feeling things about doing those things, and who needs a feedback loop between the two. That person is everyone. That gap is Colourmap.

**What it is today:** A two-column cockpit (feeling left, doing right) with check-ins on the Hawkins emotional scale, FGAC inner trackers (Fear/Gratitude/Avoidance/Confusion) with progressive questioning, a Day Map for tracking activities, missions, a notebook with rich editing and music tools, and a Journey page with archetypes, narrative tones, and an AI cat companion.

**What it is becoming:** A soul cartography tool — a living map of who you are, how you change, and what matters to you. Archetypes that evolve. Chapters that name your life phases. A topographic map of your emotional territories. An AI companion that speaks in your chosen voice and notices what you miss.

**Why it matters:** Every human being has the same fundamental need — to understand themselves well enough to act with clarity. Therapy is expensive and episodic. Journaling is solitary and structureless. Meditation helps you be still but doesn't connect to your day. Colourmap is the bridge: structured enough to reveal patterns, warm enough to feel like a personal space, intelligent enough to mirror back what you can't see.

**The core philosophy answers:**

- **The tagline:** From energy to clarity.
- **Who it's for:** The restless reflective person — not a beginner, not an expert. Someone who feels deeply and acts ambitiously but lacks a feedback loop between the two.
- **Who it's NOT for:** People in acute crisis (they need a therapist). People who want to be told what to do. Emotional optimizers who want KPIs on feelings.
- **What "getting better" means:** Not happiness going up. Clarity. The range narrows, chapters get longer, fears dissolve, notes shift from reactive ("I feel bad") to observational ("I notice I drop after meals").
- **The AI's role:** Companion, not therapist. Mirror, not coach. It proposes, the user confirms. It says "I notice..." never "You should..." The user writes the story. The app holds the pen.
- **The cat:** Core, not gimmick. The emotional safety layer. People say things to a cat they won't type into a blank field.
- **The notebook:** A pillar, not a distraction. Life doesn't have compartments. The person writing a song at 10pm is the same person who checked in as "Fear" at 2pm.
- **Retention:** The accumulation becomes irreplaceable. After 6 months, deleting the app means deleting your self-portrait. No feature retains — the story retains.

---

## What Does Success Really Mean?

Before diving into psychology models and feature analysis, the foundational question: what does it mean for a human being to succeed at being a human being?

Success in Colourmap is not:
- Feeling good all the time (that's avoidance)
- Completing all your missions (that's productivity theater)
- Having a high emotional average (that's suppression of the low)
- Using the app every day (that's dependency)

Success is **the gap between stimulus and response getting wider.** It's Viktor Frankl's core insight: "Between stimulus and response there is a space. In that space is our freedom and our power to grow."

Colourmap succeeds when:
- You notice you're afraid *before* you avoid
- You see that your body pulse drops every Tuesday and you investigate why
- You name a chapter "The Rebuilding" and mean it
- You check in less often but with more depth
- The fears list gets shorter not because you ignore them but because you faced them
- The cat says something and you think "yes, that's exactly it"

### How Can the App Ask the Right Questions?

The secret isn't better questions — it's better timing. The right question at the wrong moment is noise. The right question at the right moment is a key.

**Principles for question design:**

1. **Match the emotional altitude.** When someone is at Shame (slider low), don't ask "What are you grateful for?" Ask "What feels heavy right now?" The FGAC system already does this — the contextual placeholders change based on the Hawkins level. Extend this everywhere.

2. **Go one level deeper, not ten.** The FGAC progressive chain (3 questions per tracker) works because it goes: surface → consequence → action. "What are you afraid of?" → "What would happen if it came true?" → "What's one small thing you can face?" Each question peels one layer. Never jump from surface to abyss.

3. **Let silence be an answer.** If someone opens the Fear tracker and types nothing, that IS data. The app should notice patterns of avoidance — the questions you open but don't answer. Over time, the cat could gently observe: "You've opened Fear three times this week without writing. Something is circling."

4. **Ask about the gap, not the poles.** Don't ask "Are you happy or sad?" Ask "What's the distance between where you are and where you want to be?" The Life Scan does this with bipolar sliders. The Journey archetype system does this by computing who you are from what you do, not what you say.

5. **Questions that evolve with the user.** A first-week user needs "What's on your mind?" A three-month user needs "What pattern do you notice in your Tuesday drops?" The AI has the data to ask the second question. The challenge is knowing when the user is ready for it.

6. **Questions that connect domains.** The most powerful question isn't about one thing — it's about the relationship between two things. "You checked in as Courage after every Focus Zone session this week. What is it about deep work that makes you feel strong?" This is the feeling+doing bridge made verbal.

7. **Questions the user didn't know they needed.** The archetype system, the chapter naming, the dark period protocol — these are all structured question-asking. But the most powerful moment is when the AI asks something unexpected and true. That requires rich context and restraint — the AI must know a lot and say little.

The ultimate question the app asks, every day, in every feature, is: **"What do you notice?"** Not "How do you feel?" (too direct) or "What happened?" (too external). Just: what do you notice? About your body. About your energy. About your fear. About the gap between who you are and who you're becoming.

That noticing IS the product.

---

## 1. Why This App Matters

### The Gap Nobody Talks About

There is a strange void in the personal tools market. On one side: productivity apps that track what you do (Todoist, Notion, Things). On the other: wellness apps that track how you feel (Daylio, Headspace, Calm). Almost nothing sits between them. And that gap -- between doing and feeling -- is where most people actually live.

The core insight behind Colourmap is deceptively simple: **what you do and how you feel are the same conversation.** A bad day at work shows up in your body. A morning run shows up in your focus. A fight with a partner shows up in your creative output. These connections are obvious when you say them out loud, but no existing tool makes them visible.

### Why Existing Tools Fail

**Daylio** captures mood and activities but treats them as separate data points. You log "good mood" and "exercise" but the app never shows you the relationship. It is a counting machine, not a mirror. The interface is bright and gamified -- it wants you to feel good about logging, not about understanding.

**Reflectly** uses AI to generate journal prompts but they are generic. "What are you grateful for today?" is the same question whether you are thriving or falling apart. The AI does not know you. It does not build a model of your patterns over time. It is a prompt generator, not a companion.

**Headspace** and **Calm** are meditation delivery systems. They help you practice stillness but capture nothing about your life. You close the app and return to the same chaos. There is no bridge from the cushion to the workday.

**Finch** gamifies self-care with a virtual pet. The mechanic works for habit formation but trivializes the emotional layer. Feeding a cartoon bird because you drank water is charming for a week. It does not help you understand why you have been anxious for three months.

**Woebot** and **Youper** attempt CBT-style interventions but feel clinical. They are therapy-in-a-box without the therapist's ability to read between the lines. They ask structured questions but cannot sit with ambiguity.

**Bearable** is the closest competitor in terms of data richness -- it tracks symptoms, moods, activities, and medications. But it is designed for people managing chronic conditions, not for people seeking self-understanding. The interface is dense and medical.

### What Makes the Feeling+Doing Bridge Unique

Colourmap does not ask you to choose between reflection and action. The cockpit layout -- feeling on the left, doing on the right -- is the product philosophy made spatial. You see both simultaneously. Over time, the correlations emerge not because the app calculates them, but because you see them side by side, day after day.

This is closer to how a good therapist works. They do not separate "how are you?" from "what are you doing?" They hold both and help you see the threads. Colourmap is the tool that holds both.

---

## 2. Psychology Foundations

### Cognitive Behavioral Therapy (CBT)

CBT's core model: thoughts influence feelings, which influence behaviors, which reinforce thoughts. This is the triangle that Colourmap's cockpit makes visible.

- **Check-in slider** maps to the feeling vertex. The emotional vocabulary (Crushed through Expansive) gives language to affective states, which is itself a CBT technique called "affect labeling."
- **Missions and trackers** map to the behavior vertex. What you are doing today, what is blocking you, what you are avoiding.
- **Life scan reflective questions** target the thought vertex. "What are you most afraid of?" and "What are you avoiding? Why?" are direct cognitive restructuring prompts.

Research reference: Beck (1979) established that naming and externalizing cognitive-emotional patterns reduces their power. The simple act of moving a slider and seeing "Heavy" appear is a form of cognitive distancing -- the feeling becomes an object you can observe rather than a state you are drowning in.

### Dialectical Behavior Therapy (DBT)

DBT focuses on emotional regulation through four modules: mindfulness, distress tolerance, emotional regulation, and interpersonal effectiveness. Colourmap touches all four.

- **Mindfulness**: The check-in is a mindfulness bell. The post-submit reflection ("Take one breath") is an explicit micro-practice. The time-of-day awareness ("Still up.") invites noticing.
- **Distress tolerance**: The Dark Period Protocol provides a structured way to sit with pain without acting destructively. The question "What has helped before?" mirrors DBT's crisis survival strategies.
- **Emotional regulation**: The Hawkins-inspired slider creates a spectrum rather than binary good/bad. This trains what DBT calls "checking the facts" -- is it really a 15, or is it a 35 that feels like a 15?
- **Interpersonal effectiveness**: The Sharing door in the life scan (Connected/Isolated, Guarded/Open) directly maps to DBT's interpersonal effectiveness module.

### Acceptance and Commitment Therapy (ACT)

ACT emphasizes psychological flexibility: the ability to be present with difficult feelings while still moving toward valued actions. This is precisely the two-column cockpit model.

- **Acceptance**: The check-in does not try to fix your emotional state. It names it. "Stuck" is a valid place to be. The app does not say "try to feel better."
- **Defusion**: Seeing your emotional state as a word on a screen -- "Heavy" -- creates distance from the experience. You have heaviness; you are not heaviness.
- **Values**: Missions represent what matters to you. The life scan question "What don't you want in your life anymore?" is a values clarification exercise.
- **Committed action**: Custom cockpit sections (Body, Discipline, Connection) are committed action plans. They bridge understanding to daily behavior.

### Positive Psychology

Martin Seligman's PERMA model (Positive Emotion, Engagement, Relationships, Meaning, Achievement) maps cleanly onto Colourmap's structure:

- **Positive Emotion**: Check-in captures the full spectrum, including positive states.
- **Engagement**: The Day Map tracks energy and activity blocks, mapping to flow states.
- **Relationships**: The Sharing door and connection trackers.
- **Meaning**: The Journey page's chapter system and archetype identity.
- **Achievement**: Missions, completed trackers, and the visual accumulation of daily data.

The strengths-based approach (Seligman & Csikszentmihalyi, 2000) is reflected in the life scan's "What is flowing? What feels good right now?" -- equal emphasis on what works, not just what is broken.

### Internal Family Systems (IFS)

IFS, developed by Richard Schwartz, proposes that the psyche contains multiple "parts" -- protectors, exiles, and managers -- organized around a core Self. Colourmap's archetype system is a direct (if simplified) implementation of this model.

- **Main archetype** (Seeker, Builder, Healer, Warrior, Artist) represents the dominant part that is leading right now.
- **Inner archetypes per category** (Feeling: Observer/Empath/Stoic/Phoenix; Doing: Architect/Explorer/Monk/Rebel; Sharing: Anchor/Mirror/Torch/Lone Wolf) represent the inner committee -- different parts active in different life domains.
- **The tone system** (Cowboy, Warrior, Princess, Mythologic, Practical) is the voice of Self -- the user chooses how their inner observer speaks to them.

This is not clinical IFS, but it borrows the core insight: you are not one thing. You contain multitudes. Naming the parts reduces their unconscious control.

### Hawkins Scale of Consciousness

David Hawkins' Map of Consciousness (1995) proposes that human emotional states exist on a logarithmic scale from 20 (Shame) to 1000 (Enlightenment), with 200 (Courage) as the critical threshold between contractive and expansive states.

Colourmap's emotional vocabulary draws from this:

| Slider Range | Word | Hawkins Parallel |
|---|---|---|
| 0-12 | Crushed | Shame/Guilt/Apathy (20-50) |
| 13-25 | Heavy | Grief/Fear (75-100) |
| 26-37 | Stuck | Desire/Anger (125-150) |
| 38-50 | Still | Pride/Courage (175-200) |
| 51-62 | Steady | Neutrality/Willingness (250-310) |
| 63-75 | Open | Acceptance/Reason (350-400) |
| 76-87 | Alive | Love/Joy (500-540) |
| 88-100 | Expansive | Peace/Enlightenment (600+) |

The app wisely avoids Hawkins' literal numbers and spiritual framing. Instead, it uses the structural insight: emotions exist on a spectrum from contraction to expansion, and awareness of where you are on that spectrum is itself a shift toward expansion.

### Maslow's Hierarchy of Needs

The three doors of the life scan map to Maslow's hierarchy:

- **Feeling** (Energy, Relaxation, Emotions, Presence) = Physiological and Safety needs. You cannot focus on growth if your body is exhausted and your nervous system is in fight-or-flight.
- **Doing** (Focus, Motivation, Creative, Discipline) = Esteem and Self-Actualization needs. Purpose, competence, and creative expression.
- **Sharing** (Connected, Honest, Giving, Belonging) = Love and Belonging needs. The social fabric.

The scan's diagnostic logic (suggest Body & Rest section if Feeling scores low) respects Maslow's progression: address the foundation before building upward.

### Jung's Archetypes and Individuation

Carl Jung proposed that psychological growth (individuation) involves integrating unconscious archetypes -- the Shadow, Anima/Animus, Persona, and Self. Colourmap's archetype system operationalizes this in an accessible way (see Section 3).

The life scan's reflective questions are Jungian in spirit:
- "What is weighing you down?" invites Shadow work.
- "What are you most afraid of?" names the Shadow's territory.
- "What is flowing?" identifies where the Self is already integrated.

---

## 3. The Archetype System -- Deep Design

### How Archetypes Work in Psychology

Archetypes are recurring patterns of human experience that show up across cultures, myths, and individuals. Jung identified them as structural elements of the collective unconscious. Joseph Campbell extended this into the Hero's Journey -- a narrative arc that describes how people grow through departure, initiation, and return.

Carol Pearson's 12 archetypes (Innocent, Orphan, Hero, Caregiver, Explorer, Rebel, Lover, Creator, Jester, Sage, Magician, Ruler) provide a more practical framework. Each archetype represents a motivational pattern -- what drives you, what you fear, what you seek.

### How Colourmap Implements Archetypes

The current implementation defines five main archetypes:

| Archetype | Core Drive | Shadow Side | Trigger Data |
|---|---|---|---|
| **The Seeker** | Clarity through questioning | Analysis paralysis, confusion as identity | Confusion markers in check-ins, multiple fears |
| **The Builder** | Structure from chaos | Rigidity, control, over-engineering | Above-average emotional state, multiple strengths |
| **The Healer** | Wisdom from wounds | Martyrdom, absorbing others' pain | Gratitude markers, fear acknowledgment |
| **The Warrior** | Courage through facing | Aggression, inability to rest | High courage indicators, fear + forward movement |
| **The Artist** | Full-spectrum feeling | Instability, emotional overwhelm | Creative tags, frequent check-ins |

The inner archetypes add depth per life domain:

- **Feeling**: Observer (detached awareness), Empath (absorbs everything), Stoic (controlled, steady), Phoenix (transforms through burning)
- **Doing**: Architect (plans and builds), Explorer (tries new paths), Monk (disciplined simplicity), Rebel (breaks rules to create)
- **Sharing**: Anchor (stabilizes others), Mirror (reflects truth), Torch (inspires), Lone Wolf (self-sufficient isolation)

### Making Archetypes Meaningful, Not Gimmicky

The risk with any archetype system in a consumer app is that it becomes a personality quiz -- fun for five minutes, forgotten by day two. Three design principles prevent this:

**1. Archetypes Change.** The archetype is computed from recent data, not a one-time quiz. If you go through a period of discipline and focus, your main archetype shifts from Seeker to Builder. If loss hits, you might become a Healer. This mirrors the Jungian concept of individuation as an ongoing process.

**2. Archetypes Are Descriptive, Not Prescriptive.** The archetype card says "Searching for clarity. Questions drive you forward." It does not say "You should search for clarity." It names what is already happening. This is the difference between a horoscope and a mirror.

**3. Inner Archetypes Create Tension.** A user might be a Warrior overall but have an Empath in their Feeling domain and a Lone Wolf in their Sharing domain. These tensions are not bugs -- they are the interesting part. The warrior who feels deeply and struggles to connect: that is a specific, recognizable person. The archetype system should surface these contradictions, not smooth them away.

### Future Evolution

The archetype system should eventually integrate with the AI companion:

- The cat companion speaks differently to a Seeker ("The fog is data, not punishment") than to a Warrior ("Rest is not retreat").
- Archetype transitions could trigger reflective moments: "You have been a Builder for three weeks. What are you constructing?"
- Inner archetype conflicts could surface as insights: "Your Empath in Feeling and your Lone Wolf in Sharing are pulling in opposite directions. Which one needs attention?"

---

## 4. The Soul Cartography Vision

### The Map Idea

The most ambitious visual feature Colourmap could build is a topographic map of the self. Not a chart. Not a dashboard. A landscape -- with terrain, elevation, regions, and paths.

Imagine opening Colourmap to a page that looks like a hand-drawn map. Not a satellite photo -- something closer to Tolkien's maps of Middle-earth or a 19th-century explorer's cartography. Warm paper texture. Ink-like lines. Named regions.

### How It Could Work

**Emotional Territories**

Each emotional state occupies a region on the map. When you check in at "Crushed," you are in the lowlands -- perhaps labeled something poetic like "The Flats" or "Still Water." "Expansive" puts you in the high peaks. The map fills in over time as you visit different emotional territories. Unexplored areas remain blank, like uncharted territory on old maps.

**Fear Canyons**

The fears you name in the life scan become canyons or ravines on the map. "Fear of failure" might be a deep gorge between the Doing highlands and the Sharing plains. As you work through fears (high courage check-ins, completed missions that face the fear), the canyon gets a bridge drawn across it. The fear does not disappear from the map. It becomes a crossed canyon.

**Strength Mountains**

Self-identified strengths become peaks. The more data confirms the strength (consistent high energy, creative output, discipline streaks), the taller the peak. A mountain named "Discipline" that you have not visited in weeks starts to look weathered.

**Vision Horizons**

The vision text from the life scan becomes a horizon line on the map -- a distant landmark you are traveling toward. As you take actions aligned with your vision (missions completed, relevant trackers consistent), your position on the map moves closer to the horizon.

**Connection Rivers**

The Sharing dimension manifests as rivers and waterways. Isolation dries them up. Connection fills them. The river network shows your social health without numbers.

**The Path**

Your daily check-ins trace a path across the map. Over weeks and months, you can see where you have traveled. Loops (returning to the same emotional territory repeatedly) become visible as circular paths. Breakthroughs (moving from low to high) show as ascending trails.

### Why This Could Be the Most Unique Visual Feature in Any Wellness App

Every competitor uses the same visual vocabulary: line charts, bar charts, calendars with colored dots, circular progress rings. These are accounting tools applied to human experience.

A cartographic metaphor changes the relationship with data entirely:

- **It is spatial, not temporal.** You are not looking at "my mood this week." You are looking at "where I am."
- **It accumulates.** The map gets richer, not longer. A line chart from a year ago scrolls off the screen. A map from a year ago shows where you have been.
- **It invites exploration.** A chart says "your numbers went down." A map says "you have not visited the high country in a while."
- **It is personal.** Two people with identical data would have different maps because they named their fears differently, their visions point in different directions, and their paths traced different routes.

### Implementation Considerations

This is not a V2 feature. It is a V3 or V4 feature that requires:

- Substantial data accumulation (months of check-ins and scans).
- A custom rendering system (Canvas or SVG with procedural generation).
- A cartographic design language that is beautiful, readable, and emotionally resonant.
- Careful performance work (the map grows over time; it cannot become slow).

The risk is building something that looks impressive but does not feel personal. The map must be generated from real data, not from templates. Every feature of the terrain should be traceable to something the user actually experienced.

---

## 5. AI Integration -- The Companion Model

### Not Therapist, Not Coach, Not Chatbot

The most important design decision in Colourmap's AI system is what it is not. It is not a therapist (it does not diagnose or treat). It is not a coach (it does not set goals or hold you accountable). It is not a chatbot (you do not have conversations with it).

It is a **companion** -- more precisely, a **mirror with a voice.** It reflects what it sees. It names patterns you might not notice. It speaks in a tone you chose. And it shuts up when there is nothing useful to say.

### The Current Implementation

Colourmap currently uses AI in three places:

1. **Post-check-in insight**: After you check in, a 2-sentence reflection appears. Sentence one names what it notices about this moment. Sentence two connects it to a trend, a mission, or a fear from your life scan. It uses Claude Haiku for speed and cost.

2. **Today summary**: After 2+ check-ins in a day, the app synthesizes the emotional trajectory -- connecting how you felt to what you were doing. This is the feeling+doing bridge made explicit by AI.

3. **Journey reflection**: The cat companion on the Journey page reflects on your broader patterns across recent check-ins, life scan data, fears, and strengths. This uses the tone system to adopt a specific voice.

### The Cat Companion Concept

The AI speaks through a cat avatar. This is not arbitrary:

- **Cats observe without judgment.** A cat watches you from the corner. It does not tell you what to do. It just... sees.
- **Cats have personality.** The tone system gives each cat a distinct character (Dusty the cowboy cat, Ronin the warrior cat, Luna the princess cat, Oracle the mystic cat, Pixel the practical cat).
- **Cats are warm but independent.** This prevents the companion from feeling clingy or performative. It does not need you to come back. It is just there when you do.
- **Humor is built in.** A cat companion gives permission for lightness even in heavy moments. The cowboy cat saying "Reckon you been riding hard this week" is more accessible than a clinical observation.

### The Tone System

Five tones provide five completely different relationships with the same data:

| Tone | Voice Character | When It Works Best |
|---|---|---|
| Cowboy | Laconic, earthy, no sugar | When you need honesty without polish |
| Warrior | Disciplined, respectful, martial | When facing challenges head-on |
| Princess | Graceful, nurturing, poetic | When needing gentleness and self-compassion |
| Mythologic | Symbolic, archetypal, layered | When seeking deeper meaning in patterns |
| Practical | Data-driven, clear, no metaphors | When you want the facts, not the feelings |

The user chooses their tone. This is important. It means the app adapts to where you are, not where it thinks you should be. Someone in a dark period might choose the Warrior for strength or the Princess for comfort. Someone on a good streak might enjoy the Cowboy's dryness. The choice itself is data about self-awareness.

### How AI Reads Patterns Humans Miss

The real power of AI in this context is not generation -- it is pattern recognition across time. Humans are notoriously bad at:

- Remembering how they felt last Tuesday
- Noticing slow emotional drifts (gradually getting heavier over weeks)
- Connecting specific behaviors to emotional outcomes
- Seeing cyclical patterns (always anxious on Sunday nights)

The AI has access to all check-in history, life scan answers, mission data, and tracker patterns. It can surface observations like:

- "Your last three Wednesday check-ins have all been below 30."
- "When you hit your Body tracker 5/5, your next check-in averages 15 points higher."
- "You mentioned fear of failure in your life scan. Your check-ins during the project launch dipped to Stuck."

These are not insights that require sophisticated reasoning. They require memory and attention -- things AI has in abundance and humans do not.

### Privacy Considerations

All AI processing uses the user's own data, sent to an API at inference time. Key principles:

- **No data leaves for training.** Anthropic's API does not use inputs for model training.
- **Data stays in context.** The AI sees recent check-ins and scan answers only when invoked. There is no persistent AI memory beyond the database.
- **The user controls invocation.** AI reflections are triggered by user action (checking in, tapping "Reflect on my journey"), not by push notifications or autonomous analysis.
- **Transparency.** The AI's input data should be visible to the user. If it references your fears or strengths, you should be able to trace that back to what you wrote.

### Future AI Features

- **Weekly digest**: A narrative summary of the week's emotional journey, generated Sunday evening.
- **Correlation discovery**: "I noticed you sleep better on days you do morning walks. This week you skipped three mornings and your energy scores dropped."
- **Crisis detection**: If check-in patterns indicate sustained distress (multiple days below 20), a gentle prompt: "You have been in heavy territory for a while. Would you like to talk to someone?" with local crisis resources.
- **Archetype narration**: The cat companion weaves archetype language into reflections, making the archetype system feel alive rather than static.

---

## 6. Dark Period Protocol

### The Problem

Any emotional tracking app will be used during dark periods. This is both the app's greatest responsibility and its greatest risk. Get it wrong, and you make someone feel worse (guilt for low scores, comparison with past highs, clinical detachment). Get it right, and you provide a rare thing: a tool that helps in darkness without pretending to be a light.

### What the Research Says About Dark Periods

**Affect labeling** (Lieberman et al., 2007): Simply naming an emotion ("I feel heavy") reduces amygdala activation. The check-in slider with emotional vocabulary does this automatically.

**Expressive writing** (Pennebaker, 1997): Writing about emotional experiences for 15-20 minutes improves physical and psychological health. The note field and life scan questions provide this channel.

**Social baseline theory** (Coan & Sbarra, 2015): Proximity to trusted others reduces the neural cost of dealing with threats. The Sharing trackers and the companion model (however artificial) provide a form of perceived social presence.

**Behavioral activation** (Martell et al., 2001): During depression, action precedes motivation, not the other way around. The tracker system supports this -- you do not need to feel like walking to check "Moved today."

**Meaning-making** (Park, 2010): People who can construct meaning from suffering recover faster. The archetype system and journey narrative ("You are in a Seeker phase -- the fog is part of the path") provide a meaning-making framework.

### Design Principles for Darkness

**1. No judgment on low scores.** The app never says "you seem down" or "your scores have been low." It says "Crushed." That is the word. That is enough.

**2. Darkness is valid data.** A check-in at 10 is not a worse check-in than one at 80. It is a different position on the map. The app should treat it with the same visual care.

**3. Reduce friction, not increase it.** In dark periods, even opening an app feels like effort. The check-in should be faster, not slower. One slider move. No note required. No tags required. Submit.

**4. Offer, do not push.** The Dark Period Protocol card says "Need support?" -- it does not pop up unsolicited. The user chooses to engage. Inside, it asks structured questions ("How dark does it feel right now?", "What triggered this?", "Have you been here before?", "What has helped before?") that mirror evidence-based crisis assessment without using clinical language.

**5. Name the pattern.** If the AI notices sustained low check-ins, it might say through the cat companion: "You have been in heavy territory for five days. That is a long time. What has helped before?" This names the reality without catastrophizing.

**6. Provide the next step, not the solution.** The Dark Period card asks "What do you need right now? One thing." This is from dialectical behavioral therapy's distress tolerance skills -- when everything is overwhelming, one thing is manageable.

### What This Is Not

This is not a medical app. It does not diagnose. It does not provide crisis intervention. It does not replace therapy. If patterns suggest genuine danger, the appropriate response is:

- A gentle message acknowledging persistent difficulty
- Local crisis resources (988 Suicide and Crisis Lifeline, Crisis Text Line)
- Encouragement to talk to a professional

The line between "helpful emotional tool" and "practicing medicine without a license" is real, and the app must stay firmly on the helpful side.

---

## 7. Card System for Action

### The Problem with Habits

Every habit app uses the same mechanic: daily streaks. Duolingo, Headspace, Wordle, Habitica -- they all show you a chain and dare you to break it. This works for a while. Then you miss a day, the chain breaks, and guilt replaces motivation. You stop opening the app.

Colourmap explicitly rejects streaks ("No scheduled cadence, no streaks, no reminders" from the product doc). But it needs something to drive daily engagement with the tracker system. The card metaphor offers an alternative.

### Tarot-Inspired Action Cards

Imagine: instead of a checklist, your daily trackers are dealt to you as cards. Not literal tarot, but borrowing the metaphor of drawing from a deck.

**Daily Draw**: Each morning, your tracker items are presented as cards. "Moved today" is a card with a small illustration. "Deep work" is another. You flip them face-up when you complete them.

**Challenge Cards**: Occasionally, based on your data patterns, the app deals a challenge card. "Your energy has been low. Today's challenge: 10 minutes outside before noon." These are generated from tracker data and life scan answers, not random.

**Reflection Cards**: At the end of the day (or when you check in), a reflection card appears. Not a quiz -- a single question. "What was the best moment today?" or "What are you carrying into tomorrow?"

### Why Cards Work

- **No streaks.** You draw new cards every day. Yesterday's cards are gone. There is no chain to break.
- **Agency.** You choose which cards to flip. No one is tracking completion percentage. If you flip 2 out of 5, that is 2 things you did.
- **Discovery.** Challenge cards introduce novelty without requiring the user to set new goals. The app suggests based on data; you decide whether to accept.
- **Ritual.** Drawing cards is a ritual, not a task. It takes 5 seconds and creates a moment of intention at the start of the day.

### Implementation Path

This does not require a complete redesign. The custom cockpit sections already work as collapsible cards. The evolution:

1. Add a visual card state (face-down/face-up) to trackers.
2. Generate one challenge card per day based on tracker data and check-in patterns.
3. Add a single reflection card that appears with the daily summary.

The key is restraint. One challenge card, not five. One reflection question, not a questionnaire. The card system should feel like a whisper, not a shouting notifications.

---

## 8. Retention and Growth

### What Actually Makes People Come Back

Traditional retention mechanics (streaks, push notifications, leaderboards) work through external motivation. They create obligation, not desire. Colourmap needs a different approach because the product philosophy explicitly rejects these patterns.

Research on intrinsic motivation (Deci & Ryan's Self-Determination Theory, 2000) identifies three drivers:

- **Autonomy**: The feeling that you choose to do this. Colourmap's "on-demand, no reminders" stance preserves autonomy.
- **Competence**: The feeling that you are getting better at something. Seeing emotional patterns, completing missions, and watching tracker data accumulate creates a sense of mastery over self-understanding.
- **Relatedness**: The feeling of connection. The cat companion, the tone system, and eventually social features provide this.

### The Chapter System as Retention

The Journey page's chapter system ("Name your current chapter") creates a narrative arc. You are not just logging data day after day -- you are living a story with chapters. When a chapter ends (you name a new one), the data from the old chapter becomes a completed narrative: "The Building Phase" or "After the Move."

Chapters create natural re-engagement moments. When something significant changes in your life, the app offers a way to mark it. This is more powerful than a streak because it is meaningful -- you come back not because the app told you to, but because your life changed and you want to name it.

### Journey Progression as Motivation

The archetype system evolves with your data. Watching your archetype shift from Seeker to Builder is a form of progression that is not gamified -- it is observed. You did not earn Builder status by checking boxes. The app noticed that your patterns changed.

Over time, the Journey page should show archetype transitions as a timeline. "March: The Seeker. April: The Warrior. May: The Builder." This creates a narrative of growth that is specific to your experience.

### Social Features That Could Work Without Being Social Media

Colourmap's non-goals currently include social features, and this is wise for V1. But some social mechanics could enhance the product without introducing comparison, performance, or toxicity:

- **Accountability pairs**: Two people share their check-in status (not the data, just "checked in today" / "not yet"). No scores, no comparison. Just presence.
- **Anonymous pattern sharing**: "47% of Colourmap users who identified discipline as a weakness improved after 30 days of Body tracking." Aggregated, anonymized, inspiring without comparing.
- **Shared chapters**: A couple or close friends name a shared chapter they are living through together. Each sees their own data; the chapter name is the only shared element.

---

## 9. Monetization

### Freemium Model

**Free tier** (the full core product):

- Unlimited check-ins
- Missions and Back of Mind
- Life scan (full 3-door assessment)
- 2 custom cockpit sections
- Day Map (basic)
- 3 themes (Paper, Golden, Night)
- Check-in history (last 7 entries)

**Premium tier** ($6.99/month or $49.99/year):

- Unlimited custom cockpit sections
- AI companion (post-check-in insights, journey reflections, daily synthesis)
- Full check-in history (all time)
- Archetype system and Journey page
- Dark Period Protocol with AI support
- Extended themes and customization (10+ themes)
- Data export (CSV, JSON)
- Weekly/monthly narrative digests

### Why This Split Works

The free tier is genuinely useful. You can check in, track missions, do a life scan, and manage two program sections. This is more than enough to establish the habit and experience the feeling+doing bridge.

The premium tier adds depth and intelligence. AI features have real marginal cost (API calls to Anthropic), so gating them behind a subscription is economically necessary, not just a monetization choice. The archetype system and extended history provide the long-term engagement features that justify ongoing payment.

### AI Usage Tiers

AI costs scale with usage. Possible structure:

- **Free**: No AI features.
- **Premium**: 50 AI reflections per month (covers daily use plus journey reflections).
- **Premium+** ($12.99/month): Unlimited AI, advanced pattern analysis, weekly digests.

### Professional Version for Therapists

A significant future revenue opportunity: a therapist dashboard.

- Client grants read access to their Colourmap data.
- Therapist sees check-in history, life scan results, tracker patterns, and emotional trajectory between sessions.
- Before each session, the therapist has context: "Client has been Stuck/Heavy for 8 days. Life scan shows Doing door declined. Missions are stalled."
- The client does not need to spend 15 minutes catching the therapist up on their week.

Pricing: $29.99/month per therapist seat, with per-client fees at scale.

### Data Export for Clinical Use

Premium users can export their data in structured formats for sharing with healthcare providers. This positions Colourmap as a complement to professional care, not a replacement.

---

## 10. Visual Design Philosophy

### Warm, Not Clinical

The dominant aesthetic in wellness apps is one of two flavors: clinical white (Woebot, Youper) or playful bright (Daylio, Finch). Colourmap stakes out a third position: **warm and grounded.**

The brown/ochre palette (`#5C3018`, `#C4A060`, `#E0844A`) evokes natural materials -- leather, aged paper, warm wood. This is intentional. You are not in a hospital. You are not in a playground. You are in a personal study, a worn journal, a quiet corner.

### The Color System

The app uses a deliberate color vocabulary:

- **Browns and ochres** (`#5C3018`, `#C4A060`, `#C88820`): Warmth, ground, structure. Used for text, borders, and UI chrome.
- **Terracotta** (`#E0844A`): Energy, action, the Doing domain.
- **Soft red** (`#D4605A`): Intensity, challenge, the Feeling domain and dark periods.
- **Blue** (`#3A8AC4`): Calm, depth, the Sharing domain.
- **Green** (`#7A8A50`, `#80B868`): Growth, health, body and nature.
- **Purple** (`#9B6BA0`): Mystery, creativity, the inner world.

This palette follows the 60-30-10 rule: 60% warm neutrals (paper backgrounds, brown text), 30% secondary domain colors (per section), 10% accent (active states, highlights).

### Why Serif Fonts for Titles

The app uses serif fonts for headings ("Journey", "Cockpit", chapter titles). This is unusual in a tech product and intentional. Serif fonts connote:

- **Permanence.** Your emotional journey is not a feed to scroll through. It is something that accumulates weight.
- **Warmth.** Serifs have been associated with personal, literary contexts since handwritten letters.
- **Differentiation.** Every other wellness app uses sans-serif. Serifs immediately signal "this is different."

Body text remains in a clean sans-serif for readability. The contrast between serif titles and sans-serif content creates a hierarchy that feels like a well-designed book.

### The Losange (Diamond) Motif

Throughout the UI, a small diamond shape appears as a decorative element: section dividers, the "more" menu button, breathing exercise dots. This losange motif:

- Provides visual rhythm without heavy borders or lines.
- Evokes a compass rose (navigation, direction).
- Creates a subtle brand element that is recognizable without being a logo.
- At small sizes, reads as a decorative period or waypoint marker.

### How Design Creates Emotional Safety

The most important job of Colourmap's design is not to look beautiful. It is to feel safe. When someone opens the app at their lowest moment, the visual environment should say: "You can be here. This is your space."

Safety comes from:

- **Predictability.** Everything starts collapsed. No surprises. You choose what to open.
- **Breathing room.** Generous whitespace. The post-submit reflection screen has one word and one sentence on a full screen. The app is not afraid of emptiness.
- **Muted intensity.** Colors are warm but not saturated. Nothing screams. The loudest visual element is the emotional word on the check-in screen, and even that is more warm than bright.
- **No performance.** There are no scores, achievements, or gamification elements that imply you should be doing better. The app simply shows where you are.

### Specific UI Concepts

**The Check-In Screen**: The emotional word ("Steady", "Alive") should be the largest element on any screen in the app. It floats above the slider, perhaps 32-48px, serif font, in a color that corresponds to the emotional range. As the slider moves, the word crossfades. The note field sits below, small and unassuming. Tags are soft pills. The submit button is understated. Everything defers to the word.

**The Day Map**: A horizontal timeline of the day, divided into blocks that the user fills in with activities and energy levels. Colors are warm and organic. The visual effect should resemble a watercolor strip -- bands of color that show how energy flowed through the day, not a rigid chart.

**The Journey Page**: Centered, vertical, almost scroll-like. Like reading a personal chronicle. The archetype card sits prominently, framed in its color. Below, the chapter title in serif. Then the cat companion's reflection. The page should feel like a single page in a personal codex.

---

## 11. Fun and Humor

### Why Apps Do Not Need to Be Serious to Be Therapeutic

There is a pervasive assumption in wellness technology that emotional tools must be solemn. Meditation apps whisper. Therapy apps use clinical language. Mood trackers show you graphs.

This misses something fundamental about human emotional processing: humor is a coping mechanism, not a distraction from coping. Research on humor as emotional regulation (Samson & Gross, 2012) shows that humor increases positive affect and reduces negative affect even when the content of the humor is about the difficult experience itself.

A cowboy cat saying "Reckon you been riding hard this week, partner" about your anxiety is not minimizing the anxiety. It is offering a different relationship with it. You are not "suffering from anxiety." You are "riding hard." The metaphor reframes without dismissing.

### The Cat Companion as Humor Vehicle

The cat companion is the primary channel for humor in the app, and this is by design:

- **Cats are inherently funny.** The collision between a cat's dignified demeanor and a cowboy accent is absurd enough to break tension.
- **Five tones means five comedy styles.** The Cowboy is deadpan. The Princess is warmly ironic. The Mythologic is unintentionally profound in a way that makes you smile. The Practical is funny because it is so blunt.
- **The cat has a name.** Dusty, Ronin, Luna, Oracle, Pixel -- these are characters, not interfaces. Characters can be endearing. Interfaces cannot.

### Easter Eggs and Delight

Small moments of unexpected delight keep an app feeling alive:

- **The breathing exercise** (StepBack component) activates from a tiny, almost-hidden dot. Finding it feels like discovering a secret room.
- **Extreme check-in values** could trigger special responses. Check in at 0? The cat might say something unusually gentle. Check in at 100? "I have never seen the peaks this clear."
- **Long-term milestones** without fanfare. After 100 check-ins, a subtle change in the UI -- perhaps the losange motif gains a slightly different color. No badge, no notification. Just a quiet shift that rewards attention.
- **Time-of-day voice variations.** "Still up." at 3am hits different than "Good morning." at 8am. This is already implemented but could go further -- the cat companion could reference the time: "Luna notices it is very late."

### The Balance

Humor should never undermine the serious moments. When someone is in the Dark Period Protocol, the cat companion drops the jokes. The cowboy cat does not say "reckon you need to saddle up" to someone in crisis. It says something direct and warm. The tone system should detect emotional context and modulate accordingly.

---

## 12. Competitive Analysis

### Detailed Comparison

| Feature | Daylio | Reflectly | Finch | Headspace | Calm | Woebot | Youper | Bearable | Colourmap |
|---|---|---|---|---|---|---|---|---|---|
| Mood tracking | Icons, 5 levels | Journaling | Simple | None | None | CBT-based | AI-based | Detailed | Hawkins slider |
| Activity tracking | Categories | None | Self-care tasks | Meditation | Meditation | None | None | Symptoms/meds | Missions + trackers |
| Feeling+doing bridge | No | No | Partial | No | No | Partial | Partial | No | **Core feature** |
| AI companion | No | Generic prompts | No | None | None | CBT bot | AI therapist | No | Toned companion |
| Self-assessment | No | No | No | No | No | CBT tools | PHQ-9 | Symptom checkers | Life scan |
| Visual metaphor | Calendar | Journal | Virtual pet | Nature scenes | Nature scenes | Chat | Chat | Charts | **Cockpit/map** |
| Emotional vocabulary | Emojis | Freetext | Emojis | N/A | N/A | Clinical | Clinical | Medical | **Poetic scale** |
| Crisis support | No | No | No | No | No | Emergency resources | Emergency resources | No | **Dark Period Protocol** |
| Identity/archetypes | No | No | No | No | No | No | No | No | **Archetype system** |
| Streak-free | No (streaks) | No (streaks) | No (streaks) | No (streaks) | No (streaks) | Yes | Yes | Yes | **Yes** |

### What Each Competitor Does Well

**Daylio**: Frictionless mood logging. The 5-emoji scale is fast. The correlation between activities and moods is the right idea, poorly executed.

**Reflectly**: Beautiful UI. The journal format feels personal. AI prompts reduce the blank-page problem.

**Finch**: Brilliant engagement mechanic for the first month. The virtual pet creates genuine emotional attachment.

**Headspace**: World-class content. The meditation library and the visual design (animations, illustrations) set a standard for calm, approachable wellness tech.

**Calm**: Sleep stories and ambient sounds fill a real need. The brand positioning ("calm") is perfect.

**Bearable**: The most data-rich tracker. For people managing chronic conditions, it is genuinely useful. The correlation engine is strong.

### Where Colourmap Fills the Gap

No competitor offers:

1. **The two-column cockpit.** Feeling and doing, side by side, in one glance.
2. **A diagnostic deep dive** (life scan) that generates a personalized daily program.
3. **An archetype system** that evolves with your data.
4. **AI that speaks in character** (toned companion cats) rather than clinical or generic.
5. **Poetic emotional vocabulary** instead of emojis or medical terms.
6. **A streak-free philosophy** that respects the user's autonomy.
7. **A dark period protocol** designed specifically for difficult times.

---

## 13. User Needs (From Research)

### What People Actually Want from Mental Health Tools

Qualitative research on mental health app usage (Chandrashekar, 2018; Torous et al., 2019; Linardon, 2020) consistently surfaces these themes:

**"I want to understand my patterns, not just log them."** The most common complaint about mood trackers is that they collect data but provide no insight. Users want the "aha" moment: "Oh, that is why I felt terrible on Thursday."

**"I need something that works when I am low, not just when I am motivated."** Most apps are designed for the motivated user. Features like streaks and goals assume forward momentum. Users need tools that are useful when they cannot get out of bed.

**"Don't tell me what to feel."** Prescriptive apps ("Try to think of something positive!") are actively harmful during genuine distress. Users want reflection, not instruction.

**"I want it to feel personal, not like a template."** Generic prompts and one-size-fits-all programs lose engagement fast. Users want to feel like the tool knows them.

**"I'll quit if it makes me feel guilty."** Streak breaks, missed notifications, and declining scores create negative associations with the app. Users want a tool they can leave and return to without punishment.

### Common Complaints About Existing Apps

- "Daylio asks me how I feel but never does anything with the data."
- "Reflectly's AI prompts feel like they were written for someone else."
- "Headspace helps in the moment but I forget everything after."
- "My therapist told me to journal but I never know what to write."
- "I tried Woebot but it felt like doing homework."
- "Finch was cute but I felt stupid logging my water intake to feed a bird."
- "I want something between therapy and nothing."

### The Gap Between Therapy and Self-Help

Therapy is expensive, scheduled, and requires a human relationship. Self-help books are generic, passive, and require sustained self-motivation. The gap between them is enormous, and most people live in it.

Colourmap occupies this gap by providing:

- **Structure without rigidity.** The check-in gives you a framework but not a script.
- **Personalization without a therapist.** The life scan and AI adaptation make it feel tailored.
- **Continuity without appointments.** Your data is always there, accumulating, reflecting.
- **Depth without clinical overhead.** The archetype system and poetic vocabulary create meaning without medical framing.

---

## 14. Feature Roadmap

### Phase 1: Foundation (Current -- V1/V2)

Already built or in progress:

- Check-in with emotional vocabulary and tags
- Post-submit reflection and time-of-day awareness
- Missions and Back of Mind
- Check-in history
- Life scan (3 doors, reflective questions, program suggestions)
- Custom cockpit sections with trackers
- Day Map (energy timeline)
- Journey page (archetypes, tones, cat companion)
- Notebook (notes, ideas, journal, music)
- Dark Period Protocol
- Three themes

### Phase 2: Intelligence (V3)

**Weekly/monthly narrative digests.** AI-generated summaries of emotional patterns, tracker consistency, and mission progress. Delivered as a card on the cockpit or Journey page, not as a push notification.

**Correlation engine.** Surface connections between tracker data and check-in patterns. "Weeks you hit Body 5/5, your average check-in was 12 points higher." This is the data science layer that turns accumulation into insight.

**Archetype evolution timeline.** Show how your archetype has shifted across chapters. Make the identity journey visible as a narrative, not just a current state.

**Enhanced AI context.** Give the companion access to tracker patterns, not just check-ins and scan answers. The AI should know "you walked 6 out of 7 days this week" when reflecting on your energy.

### Phase 3: Soul Map (V4)

**The cartographic visualization.** The topographic map described in Section 4. This is the visual centerpiece that differentiates Colourmap from everything else.

**Fear bridges and strength peaks.** Dynamic terrain features that evolve with data. Fears you have faced become crossed canyons. Strengths you have demonstrated become prominent peaks.

**Exploration mode.** Navigate your map. Zoom into specific time periods. See where you were a month ago. Watch the path you have traveled.

### Phase 4: Connection (V5)

**Accountability pairs.** Minimal social feature: see that your partner/friend checked in today, nothing more.

**Therapist dashboard.** Professional read-only access to client data with session prep summaries.

**Anonymous community insights.** Aggregated data that normalizes experience: "65% of users in their Seeker phase transition to Builder within 60 days."

### Phase 5: Platform (V6+)

**API for researchers.** Anonymized, consented data access for academic research on emotional patterns.

**Custom card decks.** Therapists or coaches create custom tracker programs that clients can import into their cockpit.

**Organizational version.** Teams share a chapter and track collective wellbeing without individual data exposure.

### Prioritization Principles

1. **Intelligence before social.** AI-powered insights are more valuable and less risky than social features.
2. **Depth before breadth.** Make the core loop (check-in + missions + trackers) richer before adding new surfaces.
3. **Visual payoff accumulates.** The soul map should only launch when there are enough users with enough data to make it meaningful. Launching with sparse maps would be disappointing.
4. **Revenue before scale.** Premium features should fund development. Do not chase user growth at the expense of product quality.

---

## 15. Technical Architecture for Scale

### Current Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API routes (thin orchestrators) + Drizzle ORM
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **AI**: Vercel AI SDK + Anthropic Claude (Haiku for speed/cost)
- **Hosting**: Vercel (assumed from Next.js)

### How This Scales

**Database**: Supabase/PostgreSQL handles the data model well. Check-ins, scan answers, tracker entries, and notebook entries are all simple row-oriented data. At 10,000 daily active users with 3 check-ins/day, that is 30,000 rows/day -- trivial for PostgreSQL.

Indexes needed as scale grows:
- `check_ins(user_id, created_at DESC)` -- already critical for queries
- `daily_tracker_entries(user_id, date)` -- daily lookups
- `life_scan_answers(user_id, key)` -- scan answer retrieval

**AI costs**: Claude Haiku is cost-efficient (~$0.25/M input tokens, ~$1.25/M output tokens). A typical AI reflection uses ~500 input tokens and ~100 output tokens. At 3 reflections/user/day and 10,000 users, daily AI cost is approximately $4-5. This scales linearly and is manageable within premium subscription revenue.

**Frontend performance**: The current architecture renders most components client-side with `use client`. As data grows, two optimizations become necessary:
- Paginated check-in history (currently fetches all)
- Virtualized lists for notebook entries
- Server Components for initial data loading (move API calls to RSC where possible)

### When to Add Real-Time Sync

Current architecture: fetch on mount, optimistic updates. This works for single-device usage. Real-time sync (Supabase Realtime) becomes necessary when:

- Users expect cross-device consistency (phone + desktop)
- Collaborative features launch (accountability pairs, therapist dashboard)
- The Day Map needs live updates from multiple input sources

Implementation: Supabase Realtime subscriptions on `check_ins` and `daily_tracker_entries` tables, with conflict resolution favoring most-recent-write.

### When to Add Offline Support

Offline is not in V1 non-goals by accident. It adds significant complexity:

- Local-first database (IndexedDB via a library like Dexie or electric-sql)
- Conflict resolution for check-ins created offline
- Queue for API calls that failed offline

Offline becomes necessary when:
- Mobile app launches (users expect mobile apps to work offline)
- Users in areas with poor connectivity adopt the product
- The product reaches a scale where "requires network" is a meaningful churn driver

### Mobile App (React Native)

The current web app works on mobile browsers but lacks native feel. A React Native app (or Expo) becomes worthwhile when:

- User research shows mobile is the primary use case (likely -- check-ins happen on the go)
- Push notifications are needed (weekly digests, crisis support follow-ups)
- Native gestures would improve UX (swipe between cockpit columns, drag-to-reorder)

Approach: React Native with shared business logic. The API layer stays the same. UI is rebuilt natively. Shared: emotional vocabulary mapping, life scan config, archetype computation.

### Voice Input

Listed as a non-goal currently, but worth reconsidering for a future phase. Voice check-ins ("Hey Colourmap, I'm feeling heavy today, work was rough") could:

- Reduce friction further (faster than moving a slider)
- Capture nuance that a number cannot (tone of voice, word choice)
- Enable check-ins while walking, driving, or lying in bed

Implementation: Whisper API for transcription, then NLP to extract emotional state and context tags. The check-in would have both a transcribed note and an AI-estimated slider value that the user can adjust.

### Data Architecture for the Soul Map

The cartographic visualization requires a different data layer:

- **Precomputed terrain**: A nightly job that processes check-in, scan, and tracker data into terrain features. This avoids computing the map on every page load.
- **Vector tile-like rendering**: For maps that grow over months/years, a tile-based approach (render visible area only) prevents performance degradation.
- **Procedural generation**: Terrain shapes should be algorithmically generated from data, not hand-drawn. This requires a cartographic algorithm layer (Perlin noise for terrain, graph algorithms for paths).

### Cost Projections

| Users (DAU) | Database | AI (monthly) | Hosting | Total/month |
|---|---|---|---|---|
| 100 | Free tier | ~$5 | Free tier | ~$5 |
| 1,000 | $25 | ~$50 | $20 | ~$95 |
| 10,000 | $75 | ~$500 | $100 | ~$675 |
| 100,000 | $300 | ~$5,000 | $500 | ~$5,800 |

At 10,000 DAU with 20% premium conversion at $6.99/month, revenue is ~$14,000/month against ~$675 in infrastructure costs. The economics work.

---

## What Makes This Genuinely Different

After analyzing the product, its competitors, its psychology foundations, and its technical architecture, five things stand out as genuinely differentiated:

**1. The feeling+doing bridge is the product, not a feature.** Every competitor treats mood and activity as separate domains. Colourmap's two-column cockpit makes the interaction between them the core value proposition. This is not a mood tracker with a to-do list bolted on. The columns are in conversation.

**2. The emotional vocabulary changes the relationship with data.** "Crushed," "Heavy," "Stuck," "Still," "Steady," "Open," "Alive," "Expansive." These are not clinical terms or emojis. They are words that create recognition. The moment you see "Stuck" and think "yes, that is exactly it" -- that is the product working.

**3. The life scan creates a personal program, not a generic one.** Most apps have the same onboarding for everyone. Colourmap's life scan diagnoses your specific state across three dimensions and generates tracker programs tailored to your weak points. The section you get is not "Wellness" -- it is "Body & Rest" because your energy and relaxation scored low.

**4. The archetype system gives identity to your patterns.** No competitor names who you are becoming. "You are a Seeker with an Empath heart and a Rebel's work style" is a sentence that creates meaning. It is not a score. It is an identity.

**5. The visual language says "you matter."** Warm tones. Serif fonts. Breathing room. Diamond motifs. A breathing exercise hidden behind a tiny dot. These details communicate: this is a personal space, crafted with care, that treats your emotional life as something worthy of attention.

---

## Risks and Challenges

### Product Risks

- **Complexity creep.** The app has many surfaces (cockpit, life scan, journey, notebook, day map, programs, overview). The challenge is keeping each surface simple while the system grows.
- **AI dependency.** If AI quality degrades or costs spike, the premium tier's value proposition weakens. Diversifying AI providers (adding OpenAI or local models as fallbacks) mitigates this.
- **The soul map could underwhelm.** If the cartographic visualization is not beautiful and personal enough, it becomes a gimmick. Better to delay it than launch it mediocre.

### Market Risks

- **The wellness app market is crowded.** Discovery is expensive. Colourmap needs a clear positioning hook -- "the cockpit for your inner life" or "the app that bridges feeling and doing" -- to cut through noise.
- **Premium conversion depends on AI value.** Users need to experience AI reflections before committing. A well-designed free trial of premium (7 days, 14 days) is critical.
- **Therapist adoption is slow.** The professional version requires trust, compliance work (HIPAA), and integration with existing workflows. This is a long-term play.

### Ethical Risks

- **People in crisis using the app instead of seeking help.** The Dark Period Protocol must include clear, visible pathways to professional support.
- **AI generating harmful reflections.** Even with careful system prompts, AI can occasionally produce insensitive or triggering content. A review mechanism and safety guardrails (content filtering on output) are necessary.
- **Data privacy.** Emotional data is among the most sensitive personal data. Encryption at rest, minimal data collection, clear data deletion pathways, and GDPR/CCPA compliance are non-negotiable.

### Technical Risks

- **Supabase vendor lock-in.** The current architecture is tightly coupled to Supabase for auth and database. Abstracting the data layer (Drizzle helps here) preserves optionality.
- **AI API stability.** Anthropic's API is relatively new. Rate limits, outages, or pricing changes could impact the product. Implementing request queuing and graceful degradation is important.
- **Mobile performance.** The Day Map (EnergyMap component) is a complex client-side component with many interactive elements. On lower-end devices, this could lag. Performance testing on real devices is essential before any mobile launch.

---

*This document reflects the state of Colourmap as of March 2026. It should be updated as the product evolves, user research accumulates, and new competitive dynamics emerge.*
