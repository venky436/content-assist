# Generate Flow

How the **Generate** feature turns a creator's idea into a post-ready package (5 hooks + caption + 10 hashtags).

---

## 1. What it does

Input: an idea + content format (reel / image / story).
Output: 5 distinct hooks, one marked **recommended** with a `Why this works:` reason, a 2-line caption with a CTA, and 8–12 India-relevant hashtags.

Also exposes a second endpoint that regenerates **only the hooks** (sharper, with an optional `stronger` flag and an `avoidHooks` list) for the "Make hooks stronger" UX without re-generating caption and hashtags.

---

## 2. User flow (mobile — Generate tab)

```
┌─────────────────────────────────────────────┐
│  ✨ GENERATE  tab                            │
│                                              │
│  Hero: "Post-ready content in seconds."      │
│                                              │
│  YOUR IDEA                                   │
│  [ TextArea — placeholder: "Describe your   │
│    content idea" · 500-char counter ]        │
│                                              │
│  CONTENT FORMAT                              │
│  [🎬 Reel] [🖼️ Image Post] [⚡ Story]         │
│                                              │
│  [  ✨  Generate  ]   ← full-width primary   │
└────────────────┬────────────────────────────┘
                 │ tap
                 ▼
        ┌────────────────────┐
        │  ResultsSkeleton    │  (~1–2.5s)
        │  (hooks / caption / │
        │   hashtags blocks)  │
        └────────┬───────────┘
                 │ onSuccess
                 ▼
┌─────────────────────────────────────────────┐
│  🔥 5 VIRAL HOOKS                  [Copy all]│
│                                              │
│  ┌── 🔥 RECOMMENDED ───────── [Copy] ──┐     │
│  │  "You quit at week 2 for a reason." │     │
│  │  BEST FOR ENGAGEMENT                 │     │
│  │  Why this works: Highlights a        │     │
│  │   common mistake hurting progress    │     │
│  └──────────────────────────────────────┘    │
│                                              │
│  OTHER HOOKS                                 │
│  ┌──────────────────────────────────────┐   │
│  │ 2  Why 90% quit before week 3        │   │
│  │ 3  Most gym plans fail on day 14     │   │
│  │ 4  Skip motivation. Build a system.  │   │
│  │ 5  I quit my gym on day 13.          │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [ ✨ Make hooks stronger ]                  │
│                                              │
│  ✍️ CAPTION                          [Copy]  │
│  ┌──────────────────────────────────────┐   │
│  │  Most people quit after 2 weeks.     │   │
│  │  What's stopping you?                 │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  # 10 HASHTAGS                       [Copy]  │
│  [#GymConsistency] [#FitnessJourney] ...     │
└─────────────────────────────────────────────┘
```

**Screen path**: `apps/mobile/app/(tabs)/index.tsx` → calls `useGenerate()` from `apps/mobile/modules/generate/hooks.ts`.

**"Make hooks stronger"** (task #2 generator): only regenerates hooks + `recommendedHook` + `recommendedReason` — caption and hashtags stay put. Uses `useRegenerateHooks()` → `POST /generate/hooks` with `stronger: true` and `avoidHooks: previousHooks`.

---

## 3. API contract

### `POST /generate`

**Request**
```json
{
  "idea": "Gym motivation for beginners",
  "contentType": "reel"
}
```
- `idea`: 3–500 chars
- `contentType`: `"reel" | "image" | "story"`

**Response — 200**
```json
{
  "hooks": [
    "Why did you quit at week 2?",
    "You're skipping warm-ups wrong.",
    "You already know the answer.",
    "Skip leg day this week.",
    "I quit the gym on day 13."
  ],
  "recommendedHook": "Why did you quit at week 2?",
  "recommendedReason": "Creates curiosity about why motivation disappears",
  "caption": "Most people quit after 2 weeks.\nWhat's stopping you?",
  "hashtags": [
    "#GymConsistency", "#FitnessJourney", "#WorkoutMotivation",
    "#GymLifeIndia", "#HabitBuilding", "#FitnessTips",
    "#ConsistencyIsKey", "#StayConsistent", "#FitnessGoals",
    "#HealthIndia"
  ]
}
```

**Response — 400** (invalid request shape): zod validation error from `@hono/zod-openapi` default hook.
**Response — 502**: Gemini call failed, parse failed, or cleaned output didn't match schema — `{ error: "generation_failed" | "timeout", message: "..." }`.

### `POST /generate/hooks`

Regenerate only hooks for an existing idea.

**Request**
```json
{
  "idea": "Gym motivation for beginners",
  "contentType": "reel",
  "stronger": true,
  "avoidHooks": [
    "Why did you quit at week 2?",
    "You're skipping warm-ups wrong."
  ]
}
```

**Response — 200**
```json
{
  "hooks": [ "...5 new hooks..." ],
  "recommendedHook": "...",
  "recommendedReason": "..."
}
```

---

## 4. Server pipeline

### Module layout

`apps/server/src/modules/generate/`
- `generate.route.ts` — wires `POST /generate` and `POST /generate/hooks` via `OpenAPIHono`.
- `generate.schema.ts` — `createRoute` definition for the full `/generate`.
- `hooks.schema.ts` — `createRoute` definition for `/generate/hooks`.
- `generate.handler.ts` — main request handler for `/generate`.
- `hooks.handler.ts` — handler for `/generate/hooks` (supports `stronger` + `avoidHooks`).
- `generate.prompt.ts` — builds the Gemini prompt.
- `generate.normalize.ts` — input normalization (lowercase, typo + slang fixes).
- `generate.clean.ts` — output cleaning (hook filtering, tier dedupe, scoring, recommendation).

### Request lifecycle

```
  HTTP POST /generate  { idea, contentType }
               │
               ▼
   ┌─────────────────────────────┐
   │ Hono route validation (zod) │
   │ via @hono/zod-openapi       │
   └──────────────┬──────────────┘
                  │ valid body
                  ▼
   ┌─────────────────────────────┐
   │ generate.handler.ts         │
   │                             │
   │ 1. normalizeIdea(idea)      │  ← e.g. "ZYM" → "gym"
   │ 2. buildGeneratePrompt()    │  ← 5-section prompt
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ generateJson(prompt, {      │
   │   timeoutMs?: not set here  │
   │ })                          │  ← gemini-2.5-flash,
   └──────────────┬──────────────┘      responseMimeType: JSON
                  │ raw JSON
                  ▼
   ┌─────────────────────────────┐
   │ Cleaning + recommendation   │
   │                             │
   │  cleanHooks(raw.hooks)      │  ← 3-tier dedupe
   │  cleanCaption(raw.caption)  │
   │  cleanHashtags(raw.hashtags)│
   │  buildReasonMap()           │
   │  pickRecommendedHook()      │  ← scoring
   │  reasonFor(recommended, map)│
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ generateResponseSchema      │
   │   .safeParse(cleaned)       │
   └──────────────┬──────────────┘
                  │ ok     │ fail
                  ▼        ▼
              200 JSON   502 generation_failed
```

### Prompt structure (`generate.prompt.ts`)

Five logical blocks, concatenated with newlines:

1. **Persona + goal** — "expert Instagram content strategist", not generic AI.
2. **Idea + format hint** — `"{idea}"` + one-line content-type hint.
3. **Understanding block** — interpret intent, extract real insight, require context words.
4. **Hook rules** — 7-word cap, 5-pattern order (Question / Mistake / Direct "You" / Contrarian / Story), mandatory signals (curiosity/pain/contradiction), mandatory quotas (≥1 confrontational, ≥1 controversial, ≥1 open-loop), different first word per hook, no clickbait.
5. **Caption rules** — exactly 2 lines, L1 problem/claim, L2 CTA or curiosity, <180 chars, no soft phrases.
6. **Hashtag rules** — exactly 10, mix niche + broad + India-regional + 1–2 emotional/problem tags.
7. **Final behavior** — "I would actually post this" test.
8. **Output format** — strict JSON `{ "hooks": [], "reasons": [], "caption": "", "hashtags": [] }` with the `reasons` array the same length as `hooks`, each reason in human voice (no AI-speak).

### Output cleaning

**Hook cleaning** (`cleanHooks`) uses a **three-tier** pipeline:

```
Raw hooks from Gemini
       │
       ▼
 sanitizeHook(): word count ≤ 9, not in banned list
       │
       ▼
Tier classification per hook:
  • preferred → banned-free AND has ≥1 signal
  • flat      → banned-free, no signals (pattern 4 territory)
  • banned    → contains banned phrase
       │
       ▼
 Tier A: pick preferred, strict dedupe (unique first word + <0.7 overlap)
 Tier B: relax to 0.85 overlap
 Tier C: exact-dupe only
       │  (if still < 5)
       ▼
 Tier B (flat): fill from flat pool
       │  (if still < 5)
       ▼
 Tier C (banned): last-resort fill from banned pool
       │
       ▼
 Up to 5 hooks returned (schema accepts 4–5)
```

Why three tiers? Pattern 4 (Bold Contrarian) hooks like *"Skip leg day this week"* don't have direct-address / tension / curiosity signals by design. Strict filtering would kill them. Flat tier keeps them as valid filler if the banned-free preferred pool can't reach 5 on its own.

**Recommendation** (`pickRecommendedHook`) scores each hook by additive signals:
- +2 direct address (`you / your / you're`)
- +2 tension word (`wrong / fail / problem / mistake / broken / ruining / killing`)
- +2 open loop (`why / here's / this is why / the reason / do this instead / the fix`)
- +1 ends with `?` or `…` (curiosity marker)
- +1 emotional word (`quit / impossible / pain / struggle`)
- +1 length ≤ 6 words

Highest scorer wins. Ties broken by shorter length.

**Reason** (`reasonFor`): pulls from Gemini's parallel `reasons` array indexed by the normalized hook key. Rejected if it contains AI-speak (`leveraging / utilizing / seamlessly / fostering / optimizing / synergy / elevate / holistic / robust`); falls back to static `explainHook()` that derives a short 2-fragment label from which signals fired (`Direct challenge + curiosity gap`, etc.).

**Caption cleaning** keeps at most 2 lines separated by `\n`, trimmed, capped at 200 chars with ellipsis if over.

**Hashtag cleaning** dedupes (case-insensitive), prefixes `#` if missing, caps at 10.

---

## 5. Example — full run

**Input**
```json
{
  "idea": "zym motivation for beginners",
  "contentType": "reel"
}
```

After `normalizeIdea`: `"gym motivation for beginners"` (fixed typo `zym → gym`).

**Gemini raw output** (schematic)
```json
{
  "hooks": [
    "Why did you quit at week 2?",
    "You're skipping warm-ups wrong.",
    "You already know the answer.",
    "Skip leg day this week.",
    "I quit the gym on day 13."
  ],
  "reasons": [
    "Opens a loop about quitting — viewers need the reveal",
    "Names a specific error most beginners make",
    "Direct tone, forces self-reflection on commitment",
    "Bold contrarian rest-day stance defies the hustle culture",
    "Personal story + concrete day creates instant relatability"
  ],
  "caption": "Most people quit after 2 weeks.\nWhat's stopping you?",
  "hashtags": [
    "#GymConsistency", "#FitnessJourney", "#WorkoutMotivation",
    "#GymLifeIndia", "#HabitBuilding", "#FitnessTips",
    "#ConsistencyIsKey", "#StayConsistent", "#FitnessGoals",
    "#HealthIndia"
  ]
}
```

**Server cleaning picks**: hook #1 (`"Why did you quit at week 2?"`) — score 6 (direct-address +2, open-loop "why" +2, short +1, `?` ending +1). Reason pulled from Gemini's parallel array.

**Final response to client** — see §3 above.

Mobile renders this into the layout in §2.

---

## 6. "Make hooks stronger" pipeline

When user taps the *Make hooks stronger* button after a generation:

```
 previous generation (state)
         │
         ▼
 handleMakeStronger():
  avoidHooks = results.hooks
  stronger   = true
         │
         ▼
 POST /generate/hooks { idea, contentType, stronger, avoidHooks }
         │
         ▼
 buildHooksOnlyPrompt():
  SAME hook rules
  + "MAKE THESE HOOKS SHARPER" intensity block
  + AVOID-list with previous hooks
         │
         ▼
 Gemini → new 5 hooks + reasons
         │
         ▼
 Same cleanHooks + pickRecommendedHook + reasonFor
         │
         ▼
 200: { hooks, recommendedHook, recommendedReason }
         │
         ▼
 Mobile: setResults(prev => prev ? {
   ...prev,
   hooks, recommendedHook, recommendedReason
 } : prev)
```

Caption + hashtags untouched; only the hooks section re-renders.

---

## 7. Where to look

| Concern | File |
|---|---|
| Route wiring | `apps/server/src/modules/generate/generate.route.ts` |
| Main handler | `apps/server/src/modules/generate/generate.handler.ts` |
| Make-stronger handler | `apps/server/src/modules/generate/hooks.handler.ts` |
| Prompt text | `apps/server/src/modules/generate/generate.prompt.ts` |
| Typo/slang normalize | `apps/server/src/modules/generate/generate.normalize.ts` |
| Hook cleaning + scoring | `apps/server/src/modules/generate/generate.clean.ts` |
| Gemini client (timeout, system instruction) | `apps/server/src/services/gemini/gemini.client.ts` |
| Shared zod contract | `packages/shared/src/schemas/generate.ts` |
| Mobile API call | `apps/mobile/modules/generate/api.ts` |
| Mobile React Query hook | `apps/mobile/modules/generate/hooks.ts` |
| Screen | `apps/mobile/app/(tabs)/index.tsx` |
| Result components | `apps/mobile/modules/generate/components/` |

---

## 8. Envelope of behavior

- **Model**: `gemini-2.5-flash` with `thinkingConfig.thinkingBudget = 0`, `maxOutputTokens = 2048`, `temperature = 0.9`, `responseMimeType: "application/json"`.
- **Latency target**: ~2s (observed 1.5–2.5s in dev).
- **Typical hook length**: 4–7 words.
- **Caption length**: 100–180 chars, 2 lines.
- **Hashtag count**: schema 8–12, prompt asks for 10, cleaner caps at 10.
- **Failure modes**: 502 on Gemini down / parse failure / cleaned-output schema mismatch; no retry loop (retry is a user-level action — tap Generate again).
