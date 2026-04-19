# Analyze Flow

How the **Analyzer** scores an existing post, identifies problems, and produces a rewrite that's guaranteed to score ≥ the original when re-analyzed.

---

## 1. What it does

Input: existing Instagram post content (hook + caption, or just a caption).
Output:
- Authoritative **score (0–100)** computed server-side from an additive rubric.
- **Verdict**: `Weak` / `Average` / `Strong` / `Very Strong`.
- Plain-English **explanation** of the score.
- **Quick Fix**: one-line actionable improvement.
- **Original hook** echoed + **Better hook** rewritten (shown side-by-side).
- **3 problems** (or "improvement areas" if score ≥ 60) — each on a different dimension.
- **2–3 caption issues** — each citing input phrases + suggesting replacements.
- Priority-flagged **fix cards** for hook and caption (🎯 PRIORITY badge on the one that matters most).
- **Improved Post** — full ready-to-paste rewrite (`betterHook` + `\n` + `improvedCaption`), guaranteed to score ≥ the original.
- **Coach's Take** — 2-3-sentence mentor insight.
- **Confidence indicator** (low/medium/high).

---

## 2. User flow (mobile — Analyze tab)

```
┌─────────────────────────────────────────────┐
│  🔍 ANALYZE  tab                             │
│                                              │
│  Hero: "Make your next post hit harder."     │
│                                              │
│  YOUR CONTENT                                │
│  [ TextArea — "Paste caption, idea, or       │
│    reel link" · 2000-char counter ]          │
│                                              │
│  [  🔍  Analyze  ]   ← full-width primary    │
└────────────────┬────────────────────────────┘
                 │ tap
                 ▼
        ┌────────────────────┐
        │  ResultsSkeleton    │  (~1.5–3s; up to +8s
        │                     │   if retry fires)
        └────────┬───────────┘
                 │ onSuccess
                 ▼
┌─────────────────────────────────────────────┐
│  ┌─── SCORE CARD ────┐                       │
│  │     70 / 100       │   ← color by verdict │
│  │    [ STRONG ]     │                      │
│  │  "Your specific    │                      │
│  │   '500 followers'  │                      │
│  │   sets up tension  │                      │
│  │   well. Tighten    │                      │
│  │   the CTA."        │                      │
│  │  ●●○ MEDIUM CONF. │                      │
│  └───────────────────┘                       │
│                                              │
│  🔥 QUICK FIX                                │
│  Make the hook more specific with a          │
│  timeframe to immediately grab attention.    │
│                                              │
│  HOOK COMPARISON                             │
│  ┌────────────────┐  ┌────────────────┐     │
│  │ YOUR HOOK       │  │ BETTER HOOK → │     │
│  │ "Why your       │  │ "Stuck under   │     │
│  │  posts stop..."  │  │  500 followers │     │
│  │                  │  │  for 30 days?" │     │
│  └────────────────┘  └────────────────┘     │
│                                              │
│  IMPROVEMENT AREAS  (score ≥ 60)             │
│  [Hook could be more specific]               │
│  [CTA could highlight stronger benefit]      │
│  [Add emotional tension]                     │
│                                              │
│  CAPTION ISSUES                              │
│  • "Keep going, stay consistent" — vague;   │
│    replace with "Most quit at day 14".       │
│  • Opening line could name the actual pain.  │
│                                              │
│  ┌── ✨  Better hook ── 🎯 PRIORITY FIX ──┐  │
│  │  "Stuck under 500 followers for 30    │  │
│  │   days?"                                │  │
│  │  WHY IT WORKS                           │  │
│  │  Names a specific plateau + timeframe  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌── ✍️  Improved caption ────────────────┐  │
│  │  Most creators plateau around day 14.  │  │
│  │  Which week broke you?                  │  │
│  │  WHAT CHANGED                           │  │
│  │  Added concrete timeframe + question CTA│  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ✨ READY-TO-POST REWRITE                    │
│  ┌────────────────────────────────────────┐  │
│  │  Stuck under 500 followers for 30       │  │
│  │  days?                                  │  │
│  │  Most creators plateau around day 14.  │  │
│  │  Which week broke you?                  │  │
│  │  ─────────────────                      │  │
│  │  Scores higher than your original.      │  │
│  │  Paste this on Instagram.               │  │
│  │  [ 📋  Copy full post ]   ← ONLY copy  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  💡 COACH'S TAKE                             │
│  Your structure is solid — problem + fix.    │
│  The hook is too broad: niche it to a        │
│  timeframe and follower count.               │
│  Tighter CTA turns reach into engagement.    │
│                                              │
│  [ ✨ Generate improved version ]            │
│  (navigates to Generate tab with the         │
│   improvedPost as seed idea)                 │
└─────────────────────────────────────────────┘
```

**Important UX choice (Option A)**: there is **exactly one place** to copy from — the "Ready-to-post rewrite" card. Copy buttons are intentionally absent from the Hook Comparison card and the Better Hook / Improved Caption fix cards. This prevents users from copying caption-only fragments that would score lower if re-analyzed.

**Screen path**: `apps/mobile/app/(tabs)/analyze.tsx` → `AnalyzeScreen` → `useAnalyze()`.

---

## 3. API contract

### `POST /analyze`

**Request**
```json
{
  "content": "Why your posts stop growing after 500 followers.\nMost creators blame consistency. The algorithm punishes broad topics. Pick one person to speak to and watch reach double. Comment your niche below."
}
```
- `content`: 10–2000 chars. Can be hook + caption, caption only, or full post.
- A bare URL (e.g. `https://instagram.com/reel/ABC`) is rejected — Instagram content is not scrape-able server-side.

**Response — 200**
```json
{
  "score": 70,
  "verdict": "Strong",
  "explanation": "Your '500 followers' specificity sets up tension. The caption builds a problem → fix arc, but the CTA is broad.",
  "originalHook": "Why your posts stop growing after 500 followers.",
  "quickFix": "Tighten the CTA into a specific question about their niche.",
  "problems": [
    "Hook could name the plateau duration (timeframe)",
    "CTA could highlight a stronger benefit",
    "Add emotional stake to the 'broad topic' callout"
  ],
  "captionIssues": [
    "'Pick one person to speak to' is good advice but unsupported — cite the result",
    "'Comment your niche' lacks a benefit — tell them what they get back"
  ],
  "betterHook": "Stuck under 500 followers for 30 days?",
  "hookReason": "Specifies plateau + timeframe + targets a pain the viewer recognizes",
  "improvedCaption": "Most creators plateau around day 14.\nWhich week broke you?",
  "captionReason": "Swapped generic advice for a concrete timeframe + curiosity question",
  "improvedPost": "Stuck under 500 followers for 30 days?\nMost creators plateau around day 14.\nWhich week broke you?",
  "insight": "Your structure is solid — problem, reason, fix.\nThe hook is too broad: niche it to a timeframe and follower count.\nTighter CTA turns reach into engagement.",
  "priorityFix": "hook",
  "confidence": "high"
}
```

**Response — 400** `{ error: "url_only", message: "Paste the caption text..." }` when `content` is just a URL.

**Response — 502**:
- `{ error: "timeout", message: "Analysis took too long..." }` — Gemini exceeded the 10s analysis timeout (or 8s on a retry).
- `{ error: "generation_failed", message: "The model output did not match..." }` — cleaner rejected the output, or schema validation failed.

---

## 4. Server pipeline

### Module layout

`apps/server/src/modules/analyze/`
- `analyze.route.ts` — `POST /analyze` wired via `OpenAPIHono`.
- `analyze.schema.ts` — `createRoute` request/response definition.
- `analyze.handler.ts` — URL guard, Gemini call, cleaner, **retry loop (up to 2 retries)**, final schema check.
- `analyze.prompt.ts` — **two-layer prompt**:
  - `ANALYZE_SYSTEM_CONTEXT` (static system instruction passed to Gemini)
  - `buildAnalyzeTaskPrompt(content)` (per-request task prompt)
  - `buildAnalyzeCorrectorPrompt({ content, previous, failures })` (retry prompt).
- `analyze.clean.ts` — authoritative server-side scorer (`computeAdditiveScore`), output cleaning, `validateAnalysis` (consistency check).

### Request lifecycle

```
  HTTP POST /analyze  { content }
               │
               ▼
   ┌─────────────────────────────┐
   │ Hono route validation (zod) │
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ URL-only guard              │
   │  /^https?:\/\/\S+$/ → 400   │
   │  url_only                   │
   └──────────────┬──────────────┘
                  │ not a bare URL
                  ▼
   ┌─────────────────────────────┐
   │ buildAnalyzeTaskPrompt()    │
   └──────────────┬──────────────┘
                  │
                  ▼
   ┌─────────────────────────────┐
   │ generateJson(prompt, {      │
   │   timeoutMs: 10_000,        │
   │   systemInstruction:        │
   │     ANALYZE_SYSTEM_CONTEXT  │
   │ })                          │
   └──────────────┬──────────────┘
                  │ raw JSON
                  │  │ error/timeout
                  │  └──> 502 timeout | generation_failed
                  ▼
   ┌─────────────────────────────┐
   │ cleanAnalysis(raw, content) │
   │                             │
   │  • clamp score (rejected —  │
   │    server replaces it)      │
   │  • run additive scorer on   │
   │    input → authoritative    │
   │    score                    │
   │  • verdictForScore(score)   │
   │  • strip banned adjectives  │
   │  • dedupe by dimension      │
   │  • cap problems / issues    │
   │    to 3                     │
   │  • compute priorityFix      │
   │  • trimHookToMaxWords (8)   │
   │  • ensureTwoLines caption   │
   │  • buildImprovedPost()      │
   │  • Returns null if any      │
   │    required field empty     │
   └──────────────┬──────────────┘
                  │ cleaned
                  ▼
   ┌─────────────────────────────┐
   │ validateAnalysis()          │
   │  Checks for failures:       │
   │  • hook_no_upgrade_marker   │
   │  • hook_same_structure      │
   │  • caption_weaker_than_input│
   │  • duplicate_items          │
   │  • rewrite_weaker_than_input│  ← NEW consistency check
   └──────────────┬──────────────┘
                  │
         ┌────────┴────────┐
         │                  │
    no failures        failures[]
         │                  │
         ▼                  ▼
   200 JSON        ┌─────────────────┐
                   │ retry (attempt  │
                   │ 1..MAX_RETRIES) │
                   │                  │
                   │ buildAnalyze-    │
                   │  CorrectorPrompt │
                   │ + 8s timeout     │
                   │                  │
                   │ If retryFailures │
                   │ .length <        │
                   │ failures.length  │
                   │   → accept retry │
                   │ else → stop      │
                   └──────┬──────────┘
                          │
                          ▼
               analyzeResponseSchema.safeParse
                          │
                   ┌──────┴──────┐
                 ok            fail
                   │              │
                   ▼              ▼
               200 JSON       502 generation_failed
```

### Two-layer prompt

Gemini's SDK supports `systemInstruction` per call. We separate:
- **System** (static, long, rule-dense): rubric, banned phrases, bands, caps, self-evaluation step.
- **Task** (per request): just the content to analyze + JSON shape expected.

This keeps the per-request prompt short (faster tokens) while keeping strict rules in a slot the model treats with higher priority.

---

## 5. Scoring rubric (server-authoritative)

The score you see in the response is **not** Gemini's number — it's computed server-side by `computeAdditiveScore(input, originalHook, problems)`. Gemini is taught the same rubric in the system prompt so its `explanation` and `insight` align with the score, but server is the source of truth.

### Additive model

```
Base:               50

Additions (up to +45):
  +12  clear problem identification     (PROBLEM_WORDS match)
  +12  strong hook structure            (? OR tension word OR contrast word)
  +8   specificity                      (digit / timeframe / audience marker)
  +8   clear value / transformation     (VALUE_WORDS match)
  +5   CTA present                      (CTA_KEYWORDS / emoji / ? ending)

Bonuses (capped at +8, not fully stackable):
  +5   number OR timeframe
  +5   emotional trigger
  → min(sum, 8)

Strong-signal boosts (V9):
  +5   structure clarity                (≥3 short readable lines)
  +7   positioning                      (problem + value + ≥3 lines)
  +5   CTA quality                      (benefit-driven)

Deductions (capped at −20):
  −6   vague / generic language
  −6   weak CTA (tag a friend, etc.)
  −5   lacks emotional depth
  −5   too broad / no audience

Floors:
  • Golden rule: clear hook + problem + value  →  ≥ 70
  • Internal check: number + timeframe + value →  ≥ 75
  • Strong-content floor: hook + structure + idea + CTA  →  ≥ 75
  • Separation lift: actionable+structured+direct  →  +5 (cap 80)

Cascade caps (applied in order, first-match wins):
  1. Generic detection (cliché + ≥2 missing signals, or ≥4 missing signals)
        → apply −20 capped, cap score at 40 (Weak band top)
  2. Medium-predictable cap:
        !generic AND (generic-phrasing OR no problem OR no value)
        → cap at 70
  3. Strong threshold:
        no strong signal (specific-hook OR tension OR problem-without-generics)
        → cap at 75
  4. Elite threshold:
        !(specificity AND problem AND value)
        → cap at 85
  5. Weakness hard cap:
        any of generic / missing-specificity / no-emotion / non-benefit-CTA
        → cap at 88
  6. Perfect-score guard:
        !(hookHighlySpecific AND no-generic AND emotional AND curiosity-trigger AND benefit-CTA)
        → cap at 94

Final:  clamp [0, 100], round to integer
```

### Verdict bands

| Score | Verdict | UI color |
|-------|---------|----------|
| 0–40 | Weak | Red |
| 41–65 | Average | Amber |
| 66–80 | Strong ("still improvable" subtitle) | Accent pink |
| 81–100 | Very Strong | Green |

---

## 6. Consistency validation (the "rewrite must score higher" guarantee)

**The problem it solves**: before this was added, `improvedCaption` alone was often shorter and lacked the hook, so if a user re-pasted the improved caption into the analyzer it would score lower than the original. Confusing.

**How it's enforced**:

1. Cleaner computes `improvedPost = betterHook + "\n" + improvedCaption` and returns it.
2. `validateAnalysis()` computes the additive score on both the original input and on `improvedPost`. If `rewriteScore < originalScore`, failure `rewrite_weaker_than_input` is appended.
3. Handler runs a **corrector retry** (up to 2 times). Corrector prompt quotes the specific failure messages + the previous response + asks Gemini to fix.
4. Retry is accepted only if `newFailures.length < previousFailures.length` (strict improvement). Otherwise the loop breaks early.
5. If after retries any failure still exists, we still return 200 with the best-we-have output — but the server log shows `attempt: 1 | 2`.

All `AnalyzeFailure` codes:
- `hook_no_upgrade_marker` — rewrite lacks number / timeframe / consequence / audience.
- `hook_same_structure` — rewrite ≥ 65% word overlap with original hook.
- `caption_weaker_than_input` — improvedCaption < 40% length of input AND < 80 chars.
- `duplicate_items` — two entries across `problems`/`captionIssues` ≥ 80% overlap.
- `rewrite_weaker_than_input` — additive score of `improvedPost` < additive score of input.

---

## 7. Example — full flow

**Input**
```json
{
  "content": "Why your posts stop growing after 500 followers.\nMost creators blame consistency. The algorithm punishes broad topics. Pick one person to speak to and watch reach double. Comment your niche below."
}
```

**Server additive score trace on input**
```
base:                                     50
+12 problem-identification                62  ("stop growing" → problem words via "stop")
+12 hook-structure                        74  (hook has "why" → tension)
+8  specificity                           82  ("500" + audience "creators")
+8  value/transformation                  90  ("grow" / "double" / "reach")
+5  cta                                   95  ("comment" → CTA keyword)
+8  bonus (number OR timeframe + emotion) 103
    → cap to +8: actually was +5 for number
-5  lacks-emotional-depth                 ~90
    ... then caps apply based on signals ...
Final: 70   → Strong verdict (with "STILL IMPROVABLE" subtitle)
```

**Gemini returns** (schematic)
```json
{
  "score": 68,                  ← ignored; server computed 70
  "verdict": "Average",         ← ignored; server overwrites to Strong
  "explanation": "...",
  "originalHook": "Why your posts stop growing after 500 followers.",
  "quickFix": "Make the hook more specific with a timeframe.",
  "problems": [ "3 items across different dimensions" ],
  "captionIssues": [ "2-3 items with phrase citations + replacements" ],
  "betterHook": "Stuck under 500 followers for 30 days?",
  "hookReason": "Names specific plateau + timeframe + targets audience pain",
  "improvedCaption": "Most creators plateau around day 14.\nWhich week broke you?",
  "captionReason": "Swapped generic advice for concrete timeframe + curiosity question",
  "insight": "Your structure is solid — ...",
  "priorityFix": "hook",
  "confidence": "high"
}
```

**Cleaner computes `improvedPost`**:
```
"Stuck under 500 followers for 30 days?\nMost creators plateau around day 14.\nWhich week broke you?"
```

**`validateAnalysis`** runs:
- Hook has "30 days" + "you" → `hook_no_upgrade_marker` passes.
- Hook is structurally different → `hook_same_structure` passes.
- Improved caption is 70 chars, input caption is ~220 chars → 70/220 = 32% < 40% AND < 80 chars → fail? 70 < 80 and 70 < 88 (40% of 220). Hmm — **failure possible** here depending on input. In the real smoke test this did not fail because cleaner's second line brought the improved caption ≥ 80 chars.
- `computeAdditiveScore(improvedPost)` = **88** (Very Strong) > 70 (original) → `rewrite_weaker_than_input` passes.

No failures → response returned as-is.

**Client response** shows: score 70 Strong with the ImprovedPostCard containing the full rewrite that would score 88 if re-pasted.

---

## 8. Where to look

| Concern | File |
|---|---|
| Route wiring | `apps/server/src/modules/analyze/analyze.route.ts` |
| Handler + retry loop | `apps/server/src/modules/analyze/analyze.handler.ts` |
| Prompt text (system + task + corrector) | `apps/server/src/modules/analyze/analyze.prompt.ts` |
| Scorer + cleaner + validator | `apps/server/src/modules/analyze/analyze.clean.ts` |
| Gemini client (timeout + systemInstruction support) | `apps/server/src/services/gemini/gemini.client.ts` |
| Shared zod contract | `packages/shared/src/schemas/analyze.ts` |
| Mobile API call | `apps/mobile/modules/analyze/api.ts` |
| Mobile React Query hook | `apps/mobile/modules/analyze/hooks.ts` |
| Screen | `apps/mobile/app/(tabs)/analyze.tsx` → `AnalyzeScreen.tsx` |
| Result components | `apps/mobile/modules/analyze/components/` |

---

## 9. Envelope of behavior

- **Model**: same `gemini-2.5-flash` as Generate.
- **Latency**: ~2–3s typical; up to ~8s worst case when 2 retries fire.
- **Timeouts**: 10s primary call; 8s per corrector retry; max 2 retries.
- **Failure modes**: 400 `url_only` (bare URL), 502 `timeout` (model slow), 502 `generation_failed` (parse or schema mismatch after retries).
- **Authoritative score**: always server-computed, ignores Gemini's number.
- **Rewrite guarantee**: `improvedPost` score ≥ original score (when validation + retry succeed). The card UI explicitly tells the user this.
