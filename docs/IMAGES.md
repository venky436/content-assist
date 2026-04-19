# Image Generation Flow

How the **Image Generation** feature turns any creator idea into a 2-or-3 image visual story (struggle → decision → result) and attaches it to a post.

---

## 1. What it does

Input: an idea (+ optional caption + optional modifier + optional count).
Output: 2 or 3 AI-generated images that tell a coherent visual arc, each tagged with a strict `sceneType` and a short human emotional `label` (e.g. *"Can't focus"*, *"Should I quit?"*, *"Back in control"*).

Key properties:

- **Niche-agnostic.** Works for business, study, relationships, finance, lifestyle, career, parenting, etc. Never defaults to gym/fitness or to laptop/phone/desk unless the idea is literally about screens.
- **Gemini plans, Replicate renders.** Gemini-2.5-flash silently extracts `WHO / PROBLEM / CONTEXT` and writes 3 scene prompts. Replicate's `black-forest-labs/flux-dev` renders the selected scenes in parallel at 1:1 / webp.
- **Explicit tap to generate.** Images never auto-generate — gated behind a *Generate Images* button to control cost ($0.003/image ≈ $0.006 per 2-image gen, $0.009 per 3-image gen).
- **Regenerate preserves the arc.** Regenerating images for a saved post reuses the same `sceneTypes` the post was generated with, so the story structure stays intact.
- **Graceful fallback.** Broken/expired Replicate URLs render an "Image unavailable / Regenerate to refresh" placeholder.
- **Download to gallery.** Each tile (and the preview modal) has a one-tap *Download* action using `expo-file-system` + `expo-media-library`.

---

## 2. User flow (mobile)

### Generate tab — adding images to a fresh post

```
┌──────────────────────────────────────────────┐
│  ✨ GENERATE tab (after hooks/caption/tags)   │
│                                               │
│  ... HooksList ... CaptionBlock ... Hashtags  │
│                                               │
│  ┌─ How many? ──────────── [2 images] [3 imgs]│  ← CountChips
│  └───────────────────────────────────────────┘│
│                                               │
│  [  ✨  Generate images  ]   ← full-width     │
└─────────────────┬────────────────────────────┘
                  │ tap
                  ▼
        ┌──────────────────┐
        │ ImageLoadingSkel │  2 or 3 shimmer tiles (~8–15s)
        └────────┬─────────┘
                 │ onSuccess
                 ▼
┌──────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐ ┌──────┐ │
│  │ [struggle]   │  │ [decision]   │ │ [res]│ │  (3-image)
│  │ "Can't focus"│  │ "Should I…?" │ │ "Back│ │
│  │              │  │              │ │ in…" │ │
│  │ ☐  ⬇         │  │ ☐  ⬇         │ │ ☐ ⬇  │ │
│  └──────────────┘  └──────────────┘ └──────┘ │
│                                               │
│  [ Regenerate ]   [ Regenerate as… ]          │  ← modifier sheet
│                                               │
│  [ 💾 Save to workspace ]                     │  ← selected imgs
└──────────────────────────────────────────────┘
```

- Tap a tile to toggle selection (accent border + checkmark, haptic).
- Tap a tile label to open **ImagePreviewModal** (full-screen view + download + swipe between images).
- Tap **⬇** to save the image directly to the device photo library (asks permission first time).
- Tap **Regenerate as…** to open `ModifierSheet` → pick *More dramatic / Minimal / Vibrant / Moody* or *Custom…*.
- Tap **Save** — only selected images are stored on the post.

### Saved tab — regenerating images for an existing post

Open any saved post that has images → tap **🔄 Regenerate images** → optional modifier → new Replicate URLs replace the post's `images[]`, preserving the same scene types and count (2 stays 2, 3 stays 3).

---

## 3. Flowchart — end-to-end request lifecycle

```
 ┌────────────────────────────────────────────────────────────────┐
 │                            MOBILE                              │
 │                                                                │
 │   User taps "✨ Generate Images"                               │
 │   (count: 2 | 3 from CountChips, default 2)                    │
 │                                                                │
 │   imagesApi.generate({ idea, caption?, count })                │
 │           │                                                    │
 └───────────┼────────────────────────────────────────────────────┘
             │  HTTP POST /images/generate
             ▼
 ┌────────────────────────────────────────────────────────────────┐
 │                        SERVER — Hono                           │
 │                                                                │
 │   OpenAPIHono route validation (zod)                           │
 │           │                                                    │
 │           ▼                                                    │
 │   images.handler.ts                                            │
 │           │                                                    │
 │           ▼                                                    │
 │   ╔════════════════════════════════════════╗                   │
 │   ║ STEP 1 — Gemini scene planning         ║                   │
 │   ║                                        ║                   │
 │   ║   buildImagePrompt({idea,caption,mod}) ║                   │
 │   ║           ↓                            ║                   │
 │   ║   generateJson(prompt, {               ║                   │
 │   ║     systemInstruction:                 ║                   │
 │   ║        IMAGE_PROMPT_SYSTEM,            ║                   │
 │   ║     timeoutMs: 10_000                  ║                   │
 │   ║   })  ← gemini-2.5-flash, JSON mode    ║                   │
 │   ║           ↓                            ║                   │
 │   ║   sanitizeScenes(raw)                  ║                   │
 │   ║     • strict sceneType enum filter     ║                   │
 │   ║     • dedupe by type                   ║                   │
 │   ║     • order: struggle → decision →     ║                   │
 │   ║       result                           ║                   │
 │   ╚════════════════════════════════════════╝                   │
 │           │                                                    │
 │           ▼                                                    │
 │   ╔════════════════════════════════════════╗                   │
 │   ║ STEP 2 — Scene selection               ║                   │
 │   ║                                        ║                   │
 │   ║   pickScenesToRender(scenes,           ║                   │
 │   ║                      count,            ║                   │
 │   ║                      sceneTypes?)      ║                   │
 │   ║                                        ║                   │
 │   ║   sceneTypes?  → keep exactly those    ║                   │
 │   ║   count === 3  → all 3 scenes          ║                   │
 │   ║   count === 2  → struggle + result     ║                   │
 │   ║                  (skip decision)       ║                   │
 │   ╚════════════════════════════════════════╝                   │
 │           │                                                    │
 │           ▼                                                    │
 │   ╔════════════════════════════════════════╗                   │
 │   ║ STEP 3 — Replicate render (parallel)   ║                   │
 │   ║                                        ║                   │
 │   ║   Promise.all(scenes.map(scene =>      ║                   │
 │   ║     generateImages(scene.prompt, {     ║                   │
 │   ║       count: 1,                        ║                   │
 │   ║       aspectRatio: "1:1"               ║                   │
 │   ║     })))                               ║                   │
 │   ║   → black-forest-labs/flux-dev         ║                   │
 │   ║     num_inference_steps: 28, webp, Q90 ║                   │
 │   ║     timeout 60s/call                   ║                   │
 │   ║                                        ║                   │
 │   ║  ┌─ Replicate 402? ──────────────┐     ║                   │
 │   ║  │ → ReplicateError code:        │     ║                   │
 │   ║  │   "insufficient_credit"       │     ║                   │
 │   ║  │ → 502 with tailored message   │     ║                   │
 │   ║  │   ("Add credit at             │     ║                   │
 │   ║  │    replicate.com/billing")    │     ║                   │
 │   ║  └───────────────────────────────┘     ║                   │
 │   ╚════════════════════════════════════════╝                   │
 │           │                                                    │
 │           ▼                                                    │
 │   ╔════════════════════════════════════════╗                   │
 │   ║ STEP 4 — Assemble + validate response  ║                   │
 │   ║                                        ║                   │
 │   ║   images[i] = {                        ║                   │
 │   ║     url, prompt, generatedAt,          ║                   │
 │   ║     sceneType, label                   ║                   │
 │   ║   }                                    ║                   │
 │   ║   generateImagesResponseSchema         ║                   │
 │   ║     .safeParse(response)               ║                   │
 │   ║                                        ║                   │
 │   ║   logger.info({ count, sceneTypes,     ║                   │
 │   ║     labels, latencyMs, modifier, ... })║                   │
 │   ╚════════════════════════════════════════╝                   │
 │           │                                                    │
 └───────────┼────────────────────────────────────────────────────┘
             │  HTTP 200 { images, enhancedPrompt, who, problem, context }
             ▼
 ┌────────────────────────────────────────────────────────────────┐
 │                          MOBILE                                │
 │                                                                │
 │   useGenerateImages().onSuccess → setGeneratedImages(images)   │
 │           │                                                    │
 │           ▼                                                    │
 │   ImageGrid                                                    │
 │     • ordered struggle → decision → result                     │
 │     • each ImageTile: scene pill, label, ⬇ download,           │
 │       ☐ checkbox, broken-image fallback                        │
 │     • tap → ImagePreviewModal (swipe, download, close)         │
 │                                                                │
 │   Save → SavedPost.images[] = selected images                  │
 │     (persisted in AsyncStorage)                                │
 └────────────────────────────────────────────────────────────────┘
```

---

## 4. API contract

### `POST /images/generate`

**Request**
```json
{
  "idea": "Why people don't take you seriously",
  "caption": "It's not what you say. It's how you say it.",
  "count": 2,
  "modifier": "more dramatic"
}
```
- `idea`: 3–500 chars (required)
- `caption`: ≤500 chars (optional — helps Gemini pick mood)
- `count`: `2 | 3` (optional, default `2`)
- `modifier`: ≤80 chars (optional — applies to all scenes)
- `sceneTypes`: `Array<"struggle" | "decision" | "result">` (optional — regenerate flow only)

**Response — 200**
```json
{
  "images": [
    {
      "url": "https://replicate.delivery/...webp",
      "prompt": "young professional mid-sentence in a meeting room...",
      "generatedAt": 1745080000000,
      "sceneType": "struggle",
      "label": "Not heard"
    },
    {
      "url": "https://replicate.delivery/...webp",
      "prompt": "same professional holding the room's attention...",
      "generatedAt": 1745080000000,
      "sceneType": "result",
      "label": "Finally heard"
    }
  ],
  "enhancedPrompt": "[struggle|Not heard] ... | [result|Finally heard] ...",
  "who": "young professional",
  "problem": "ideas get dismissed in meetings",
  "context": "corporate meeting room"
}
```

**Response — 502**
```json
{ "error": "insufficient_credit", "message": "Image service is out of credit. Add credit at replicate.com/account/billing and retry." }
```
Possible `error` codes:
- `prompt_enhancement_failed` — Gemini call failed or returned unusable JSON
- `timeout` — Gemini or Replicate exceeded timeout budget
- `generation_failed` — Replicate returned no URLs or errored
- `insufficient_credit` — Replicate 402 (account needs top-up)

### `POST /images/regenerate`

Same request/response shape. Mobile sends existing `sceneTypes` + `count` from the saved post so the new images preserve the narrative arc.

---

## 5. Gemini prompt design

The image pipeline's quality is driven almost entirely by the system prompt.

### Step 1 — silent extraction

Gemini is instructed to silently extract `WHO / PROBLEM / CONTEXT` from the idea before generating prompts. Those fields are echoed in the response for logging + future personalization.

### Step 2 — 3-scene fixed arc

Scenes are fixed in structural order:
1. **`struggle`** — the problem happening (frustration, failure, stuck)
2. **`decision`** — the turning point (hesitation, internal conflict)
3. **`result`** — the positive state (clarity, focus, breakthrough)

Gemini always returns all 3. The server picks which to render based on `count` / `sceneTypes`.

### Step 3 — emotional labels

For each scene, Gemini writes a 2–4 word human emotional label (`label` field). Rules:
- First-person or direct emotional voice. Feels like a thought the viewer has.
- Niche-adapted (a student's label differs from a founder's).
- Forbidden words: *"struggle", "decision", "result", "distraction", "action", "transition"*.

Examples per type (adapted, not copied verbatim):
- struggle → *"Can't focus"*, *"Stuck again"*, *"Views, no growth"*
- decision → *"Should I quit?"*, *"One more scroll?"*, *"Keep going?"*
- result → *"Finally locked in"*, *"Back in control"*, *"This works"*

### Step 4 — Context Enrichment Rule (the anti-generic guardrail)

Every scene `prompt` must contain:
- **SUBJECT** — concrete, specific to WHO
- **ACTION** — WHAT is happening physically (not just "sitting" or "looking")
- **ENVIRONMENT** — WHERE (meeting room, classroom, stage, kitchen mid-argument, etc.)
- **WHY-CLUE** — a visible detail tying the scene to the idea (body language of others, reactions, objects)
- MOOD, LIGHTING, STYLE, *"Instagram reel aesthetic"*, *"high detail"*
- 30–55 words total

**Hard ban** on defaulting to laptop / phone / desk / headphones / notebook unless the idea is literally about screens (*"remote work burnout"*, *"screen time"*, etc.). This stops Gemini from reducing every creator idea to "person staring at laptop."

Example bad vs good (built into the system prompt):
- Idea: *"Why people don't take you seriously"*
  - ❌ *"person sitting with laptop, looking frustrated"*
  - ✅ *"young professional mid-sentence in a meeting room, colleagues looking at their phones or turned away, visible disinterest, subject's shoulders tense, fluorescent overhead light, editorial documentary style"*

### Generation config

- `model: gemini-2.5-flash`
- `thinkingConfig.thinkingBudget = 0`
- `maxOutputTokens: 2048`
- `responseMimeType: "application/json"`
- `temperature: 0.9`
- 10-second `AbortController` timeout

---

## 6. Server layout

`apps/server/src/modules/images/`
- `images.route.ts` — wires `POST /images/generate` and `POST /images/regenerate` via `OpenAPIHono`.
- `images.schema.ts` — `createRoute` definitions referencing shared schemas.
- `images.handler.ts` — `enhanceScenes` → `pickScenesToRender` → parallel Replicate render → assemble + validate.
- `images.prompt.ts` — `IMAGE_PROMPT_SYSTEM` + `buildImagePrompt({idea, caption?, modifier?})`.

`apps/server/src/services/`
- `gemini/gemini.client.ts` — `generateJson(prompt, { systemInstruction, timeoutMs })` with `GeminiError` (code: `timeout | generation_failed`).
- `replicate/replicate.client.ts` — `generateImages(prompt, { count, aspectRatio, timeoutMs })` with `ReplicateError` (code: `timeout | generation_failed | insufficient_credit`). Detects 402s from error message regex and maps them to `insufficient_credit`.

Mounted in `apps/server/src/app.ts`: `app.route("/images", images)`.

---

## 7. Mobile layout

### Data layer

`apps/mobile/modules/images/`
- `api.ts` — `imagesApi.generate(req)` and `imagesApi.regenerate(req)` → ky POST, zod-validated.
- `hooks.ts` — `useGenerateImages()` React Query mutation.
- `download.ts` — `downloadImageToGallery(url)` via `expo-file-system` + `expo-media-library`.

### Components

`apps/mobile/modules/images/components/`
- `CountChips.tsx` — 2 / 3 picker (default 2).
- `GenerateImagesButton.tsx` — full-width secondary button, disabled while pending.
- `ImageGrid.tsx` — orders by `sceneType`, 2-up (or 3-up) responsive grid.
- `ImageTile.tsx` — image + scene pill + emotional label + ⬇ download + ☐ checkbox + broken-URL fallback.
- `ImagePreviewModal.tsx` — full-screen modal with swipe, download, close; z-indexed close button.
- `ImageLoadingSkeleton.tsx` — shimmer tiles matching the requested count.
- `ImageErrorState.tsx` — code-aware error card (timeout / out-of-credit / generic); hides Retry when credit is the blocker.
- `RegenerateImagesBar.tsx` — Regenerate + Regenerate-as controls. Bound to `isPending`.
- `ModifierSheet.tsx` — bottom sheet with preset chips + Custom.

### Screen wiring

- `app/(tabs)/index.tsx` — Generate flow. State: `generatedImages`, `selectedImageUrls`, `imageCount`. Save payload includes selected images with `sceneType + label`.
- `app/saved/[id].tsx` — Saved detail. `handleRegenerateImages` extracts existing `sceneTypes` and `count` from `post.images` and passes both to preserve the arc.

### Persistence

`SavedPost.images?: Array<{ url, prompt, generatedAt, sceneType?, label?, type? (legacy) }>` — stored in AsyncStorage via the saved-posts module. `type` kept optional for backwards compatibility with earlier saves that used a free-string label.

---

## 8. Cost & safety

- **Model:** `black-forest-labs/flux-dev` on Replicate ≈ **$0.003/image**.
  - 2-image gen ≈ $0.006 · 3-image gen ≈ $0.009.
- **Logged per generation:** `{ idea, count, requestedCount, sceneTypes, labels, modifier, latencyMs, who, problem }`. Lets you audit spend + quality trends.
- **Anti-spam:** every Generate / Regenerate button binds `disabled` to `isPending`, and handlers early-return if already pending — so double taps don't double-bill.
- **No rate limit yet** (intentional for MVP). Add one if abuse shows up.
- **Broken URL fallback:** `expo-image.onError` sets a per-tile error flag → tile renders *"Image unavailable / Regenerate to refresh"* placeholder. Handles Replicate CDN URL expiration without blocking the rest of the post.

---

## 9. Verification checklist

1. `REPLICATE_API_TOKEN` + `GEMINI_API_KEY` in `apps/server/.env`.
2. `pnpm --filter @content-assist/shared build` → shared dist carries `sceneTypeSchema` + `count` + `sceneTypes` fields.
3. `pnpm typecheck` across workspaces → clean.
4. Server smoke (3 niche-varied ideas):
   - *"gym motivation for beginners"* → `who: beginner athlete`, struggle+result that look like gym content.
   - *"why students can't focus for more than 20 minutes"* → struggle = frustrated student at a desk, result = focused studying. **No gym.**
   - *"why your posts get views but no followers"* → struggle = low analytics, result = confident on-camera. **No gym.**
5. `count: 3` → 3 tiles with distinct `struggle / decision / result` labels in that order.
6. Regenerate a saved 3-image post → new URLs, same 3 scene types, same count.
7. Revoke `REPLICATE_API_TOKEN` temporarily → 502 with `insufficient_credit`-style error UI (or `generation_failed` if not a 402).
8. Deliberately 402 the account → `ImageErrorState` shows *"Out of image credit"*, Retry is hidden.
9. Mobile preview modal: open, swipe between images, tap ⬇ → "Saved to gallery" confirmation, tap close → dismisses.
10. Broken-URL test: manually hardcode an expired URL in a SavedPost → tile renders the fallback placeholder.

---

## 10. Out of scope (deferred)

- Render the `decision` scene by default (adds 50% cost; user already opts in via `count: 3`).
- Image persistence to device FS / S3 — right now we only keep Replicate CDN URLs (+ fallback prompt to regenerate).
- Per-user rate limiting / daily caps.
- "Post to Instagram" share flow.
- Server-side image editing (upscale, inpaint).
