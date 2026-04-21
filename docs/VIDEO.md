# Video Module

How the Video feature turns generated content + images into a ready-to-post reel — composed locally with FFmpeg, with a TTS voiceover, optional background music, and scene-typed motion.

---

## 1. What it does

Input: an idea + caption + 2–3 already-generated images (with optional `sceneType` each).
Output: a 12–18 second 1080×1920 MP4 with:
- **AI-generated voiceover** (OpenAI TTS) — female or male voice, built from hook + caption.
- **Ken Burns motion** per scene type (punch-in / dolly / pan-up / zoom-in / zoom-out / static / pan L/R).
- **Crossfade transitions** between scenes (0.45s fade).
- **Optional background music** mixed at 12% volume behind the voiceover.
- **HTTP Range streaming** — the MP4 plays inline in `<video>` / `expo-video` without buffering the whole file.

Key properties:

- **No AI video model.** The video is *composed*, not generated. FFmpeg = $0. Cost is OpenAI TTS (~$0.005 per video) + the underlying images.
- **Predictable length.** 12–18 seconds. Enforced by `MIN_VIDEO_SEC = 12` and `MAX_VIDEO_SEC` in `video.compose.ts`.
- **Ephemeral storage.** Videos live in `os.tmpdir()/content-assist-videos/<id>.mp4` for ~1 hour. After TTL, a background sweep deletes them. Users download to keep.
- **Graceful fallbacks.** Missing BGM file → voice-only. Missing FFmpeg → tailored error. Missing OpenAI key → tailored error.
- **Scene-typed story.** `struggle` image gets punch-in motion, `decision` gets cinematic dolly, `result` gets pan-up. Reads as a 3-beat visual story.
- **Voice picker.** Female (`nova`) or Male (`onyx`) OpenAI voice, user-selectable.

---

## 2. User flow (mobile + web)

### Trigger

Video is **opt-in**. It appears only after at least 2 images have been generated.

```
Generate content (hooks + caption + hashtags)
        ↓
Generate images (2 or 3)
        ↓
▼ Reel video (optional) section appears ▼
        ↓
Pick voice (Female / Male)  +  Toggle BGM on/off
        ↓
Tap "Generate video"
        ↓
~15–25s skeleton → Video player appears inline
        ↓
Play · Pause · Download · Regenerate
```

### UI controls

| Control       | Where                                 | Default     |
| ------------- | ------------------------------------- | ----------- |
| `VoicePicker` | `apps/admin/src/modules/video/components/VoicePicker.tsx` / `apps/mobile/modules/video/components/VoicePicker.tsx` | Female (`nova`) |
| `BgmToggle`   | Below voice picker                    | On          |
| Generate btn  | Primary CTA                           | —           |
| `VideoPlayer` | After generation                      | Autoplay muted |

---

## 3. End-to-end flowchart

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                         MOBILE / WEB                            │
 │                                                                 │
 │   User picks voice + BGM + taps "Generate video"                │
 │         │                                                       │
 │   videoApi.generate({                                           │
 │     idea, caption, hook,                                        │
 │     images: [{url, sceneType, label}],                          │
 │     bgm: true, tone: "motivational", voice: "female"            │
 │   })                                                            │
 │         │                                                       │
 └─────────┼───────────────────────────────────────────────────────┘
           │  HTTP POST /video/generate
           ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                        SERVER — Hono                            │
 │                                                                 │
 │   generateVideoHandler (video.handler.ts)                       │
 │         │                                                       │
 │         ▼                                                       │
 │   ╔═══════════════════════════════════════╗                     │
 │   ║ 1. BUILD VOICEOVER TEXT               ║                     │
 │   ║   buildVoiceoverScript({idea,caption, ║                     │
 │   ║                        hook})         ║                     │
 │   ║   target ≥ 240 chars so it fills ≥15s ║                     │
 │   ╚═══════════════════════════════════════╝                     │
 │         │                                                       │
 │         ▼                                                       │
 │   ╔═══════════════════════════════════════╗                     │
 │   ║ 2. TEXT-TO-SPEECH (OpenAI)            ║                     │
 │   ║                                       ║                     │
 │   ║   voice="male"  → onyx                ║                     │
 │   ║   voice="female"→ nova                ║                     │
 │   ║                                       ║                     │
 │   ║   synthesizeSpeech(voiceover, {voice})║                     │
 │   ║   → MP3 Buffer (~15s audio)           ║                     │
 │   ╚═══════════════════════════════════════╝                     │
 │         │                                                       │
 │         ▼                                                       │
 │   ╔═══════════════════════════════════════╗                     │
 │   ║ 3. RESOLVE BGM                        ║                     │
 │   ║                                       ║                     │
 │   ║   if bgm && resolveBgmPath(tone):     ║                     │
 │   ║     1. assets/bgm/<tone>.mp3 if exists║                     │
 │   ║     2. fallback: any MP3 alphabetical ║                     │
 │   ║     3. null → skip BGM                ║                     │
 │   ╚═══════════════════════════════════════╝                     │
 │         │                                                       │
 │         ▼                                                       │
 │   ╔═══════════════════════════════════════╗                     │
 │   ║ 4. FFMPEG COMPOSE (video.compose.ts)  ║                     │
 │   ║                                       ║                     │
 │   ║   4a. Download each image → /tmp      ║                     │
 │   ║   4b. Probe voiceSec via ffprobe      ║                     │
 │   ║   4c. Plan scene length:              ║                     │
 │   ║       perScene = clamp(4s .. 6s)      ║                     │
 │   ║       totalSec = clamp(12 .. 20s)     ║                     │
 │   ║       (minus N-1 xfade overlap)       ║                     │
 │   ║   4d. Render clip per scene:          ║                     │
 │   ║       motion = motionForScene(type)   ║                     │
 │   ║         struggle → punch-in           ║                     │
 │   ║         decision → dolly              ║                     │
 │   ║         result   → pan-up             ║                     │
 │   ║         unknown  → pan L/R alternate  ║                     │
 │   ║   4e. stitchClipsWithCrossfade()      ║                     │
 │   ║       xfade 0.45s between clips       ║                     │
 │   ║   4f. mixAudio(voice, bgm, totalSec)  ║                     │
 │   ║       voice padded w/ apad to fill    ║                     │
 │   ║       bgm looped via -stream_loop -1  ║                     │
 │   ║       amix: voice 100% + bgm 12%      ║                     │
 │   ║   4g. muxVideoAndAudio → faststart MP4║                     │
 │   ╚═══════════════════════════════════════╝                     │
 │         │                                                       │
 │         ▼                                                       │
 │   ╔═══════════════════════════════════════╗                     │
 │   ║ 5. WRITE TO /tmp + RETURN URL         ║                     │
 │   ║                                       ║                     │
 │   ║   reserveVideoPath(videoId)           ║                     │
 │   ║   → /tmp/content-assist-videos/<id>.mp4║                    │
 │   ║                                       ║                     │
 │   ║   origin = new URL(c.req.url).origin  ║                     │
 │   ║   videoUrl = `${origin}/videos/<id>.mp4`║                   │
 │   ║                                       ║                     │
 │   ║   response = { videoUrl, voiceover,   ║                     │
 │   ║                durationMs, tone,      ║                     │
 │   ║                bgmUsed, voice }       ║                     │
 │   ╚═══════════════════════════════════════╝                     │
 │         │                                                       │
 └─────────┼───────────────────────────────────────────────────────┘
           │  HTTP 200 JSON
           ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                          CLIENT                                 │
 │                                                                 │
 │   VideoPlayer receives videoUrl                                 │
 │   <video src={videoUrl} playsInline loop autoPlay muted>        │
 │         │                                                       │
 │         ▼                                                       │
 │   iOS AVPlayer / HTML5 <video> requests the file:               │
 │                                                                 │
 │   GET /videos/<id>.mp4                                          │
 │     ↓ server's videosStatic route (video.route.ts)              │
 │     ↓ handles Range: bytes=0-1048575                            │
 │     ↓ returns 206 Partial Content + Content-Range header        │
 │                                                                 │
 │   Player streams chunks + plays inline.                         │
 │   "Tap to unmute" badge overlays until first interaction.       │
 │                                                                 │
 │   User: Play · Pause · Download MP4 · Regenerate                │
 └─────────────────────────────────────────────────────────────────┘

 Background job (startVideoCleanup):
   every 15min → scan /tmp/content-assist-videos/
   delete any file older than 1 hour (TTL_MS).
```

---

## 4. API contract

### `POST /video/generate`

**Request**
```json
{
  "idea": "why beginners quit the gym in 2 weeks",
  "caption": "Motivation fades. Systems don't.\nBuild the habit, not the motivation.",
  "hook": "Why did you quit the gym at week 2?",
  "images": [
    {
      "url": "https://replicate.delivery/.../struggle.webp",
      "sceneType": "struggle",
      "label": "Can't focus"
    },
    {
      "url": "https://replicate.delivery/.../decision.webp",
      "sceneType": "decision",
      "label": "Should I quit?"
    },
    {
      "url": "https://replicate.delivery/.../result.webp",
      "sceneType": "result",
      "label": "Back in control"
    }
  ],
  "bgm": true,
  "tone": "motivational",
  "voice": "female"
}
```

Required:
- `idea` (3–500 chars)
- `caption` (1–500 chars)
- `images` (2–3 items, each `{url, sceneType?, label?}`)

Optional:
- `hook` — lets the voiceover open with a scroll-stopper.
- `voiceover` — full text override (if present, skips `buildVoiceoverScript`).
- `bgm` — defaults to `true`.
- `tone` — `motivational | calm | emotional`. Drives BGM file pick.
- `voice` — `female | male`. Defaults to `female` (`nova`).

**Response — 200**
```json
{
  "videoUrl": "http://localhost:3000/videos/1712349876543-abc123.mp4",
  "voiceover": "Why did you quit the gym at week 2? Motivation fades. Systems don't. Build the habit, not the motivation.",
  "durationMs": 15200,
  "tone": "motivational",
  "bgmUsed": true,
  "voice": "female"
}
```

**Response — 502**

```json
{ "error": "ffmpeg_not_installed", "message": "FFmpeg is not installed on the server. Install it (e.g. `brew install ffmpeg`) and restart." }
```

Possible error codes:

| Code                  | Cause                                                  |
| --------------------- | ------------------------------------------------------ |
| `tts_not_configured`  | `OPENAI_API_KEY` is missing from server env.            |
| `tts_failed`          | OpenAI TTS API returned an error (rate limit, auth).    |
| `ffmpeg_not_installed`| `ffmpeg` binary not on PATH.                            |
| `timeout`             | TTS or FFmpeg exceeded time budget.                     |
| `composition_failed`  | FFmpeg exited non-zero or produced malformed output.    |

### `GET /videos/:id.mp4`

Streams the composed MP4 with **HTTP Range** support.

- **No Range header** → `200 OK` with full body + `Accept-Ranges: bytes` (advertises range support so the player requests chunks next).
- **Range: bytes=X-Y** → `206 Partial Content` + `Content-Range: bytes X-Y/total` + `Accept-Ranges: bytes`.
- File missing → `404 Not Found`.
- Malformed range → `416 Range Not Satisfiable`.

This is what lets iOS AVPlayer (expo-video) and HTML5 `<video>` play the file inline without buffering all 1–3MB upfront.

---

## 5. Voiceover text

`buildVoiceoverScript()` in `video.prompt.ts` assembles the TTS input:

```ts
let voiceover = [hook, caption].filter(Boolean).join(" ");

// Too short for a 12s+ reel? Prepend idea for context.
if (voiceover.length < 240) {
  voiceover = `${idea}. ${voiceover}`;
}

return voiceover.slice(0, 500);
```

Target: ≥ 240 chars (~60 words ~15s speech). Caps at 500 chars to avoid runaway reels. If the client passes a `voiceover` field directly, we use that verbatim.

---

## 6. Motion per scene type

Implemented in `renderClip()` via FFmpeg's `zoompan` filter. Max zoom is **1.08** (soft, not aggressive).

| sceneType   | Motion                | Description                                              |
| ----------- | --------------------- | -------------------------------------------------------- |
| `struggle`  | **punch-in**          | Starts at 1.15×, snaps to 1.0× in the first 18%, holds. Reads as an "impact / arrival". |
| `decision`  | **dolly**             | Zoom 1.0 → 1.07 + subtle diagonal drift up-right. Cinematic push. |
| `result`    | **pan-up**            | Constant 1.08× zoom, crop window slides upward (~5% of image height). Release / reveal. |
| *(unknown)* | **pan-right / -left** | Alternates based on index. Used when sceneType is absent (e.g. user-uploaded images, legacy saves). |
| legacy      | `zoom-in`, `zoom-out`, `static` | Retained for backward compatibility; not currently picked by `motionForScene`. |

Each clip is rendered at 1080×1920 / 30fps / libx264 / CRF 22 / yuv420p.

### Transitions

`stitchClipsWithCrossfade()` replaces plain concat with FFmpeg `xfade`:

```
[0:v][1:v]xfade=transition=fade:duration=0.45:offset=<D-XFADE>[v1]
[v1][2:v]xfade=transition=fade:duration=0.45:offset=<2D-2*XFADE>[v]
```

Total output length = `N × perScene − (N−1) × XFADE_SEC`.

`perScene` is auto-compensated so the final total still hits the `12–18s` window.

---

## 7. Audio mix

`mixAudio()` handles two paths:

### Voice-only (no BGM file, or `bgm: false`)
```
ffmpeg -i voice.mp3 -af "apad,atrim=0:<totalSec>" -c:a aac -b:a 128k mixed.m4a
```
`apad` pads the voice track with silence to `totalSec` so the video doesn't get truncated by `-shortest` at the mux step.

### Voice + BGM
```
ffmpeg -i voice.mp3 -stream_loop -1 -i bgm.mp3 \
  -filter_complex "[0:a]apad[voice];[1:a]volume=0.12[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[mix];[mix]atrim=0:<totalSec>[a]" \
  -map "[a]" -c:a aac -b:a 128k mixed.m4a
```

`-stream_loop -1` loops the BGM if it's shorter than the video. `volume=0.12` = 12% (`BGM_VOLUME`). `amix duration=first` stops when the padded voice track ends.

### BGM resolution

`resolveBgmPath(tone)` in `services/bgm/bgm.service.ts`:

1. Look for exact match: `apps/server/src/assets/bgm/<tone>.mp3` (where `<tone>` is `motivational` / `calm` / `emotional`).
2. Fallback: any MP3 in that folder, alphabetically. Logs `bgm: tone file missing, falling back`.
3. No MP3s present → returns `null` → pipeline gracefully skips BGM and returns `bgmUsed: false`.

---

## 8. Storage + cleanup

`apps/server/src/services/video-storage/video-storage.service.ts`:

- **Location:** `os.tmpdir() + /content-assist-videos/<id>.mp4`. Using `/tmp` means files survive process restarts but vanish on OS reboot.
- **TTL:** 1 hour (`TTL_MS = 3_600_000`).
- **Sweep interval:** 15 minutes (`CLEANUP_INTERVAL_MS = 900_000`).
- **Bootstrap:** `startVideoCleanup()` called in `app.ts` on server start. Runs one sweep immediately then sets an interval.
- **Filename:** `<Date.now()>-<random8>.mp4`. Sanitized on read — any non-alphanumeric characters are stripped before joining to the storage path (guards against `..` / `/`).

If a user opens a saved post more than 1h after it was generated, `videoUrl` 404s. The saved detail screen shows the "Videos live ~1 hour. Download to keep permanently." hint under the player so this is expected.

---

## 9. Client: mobile + web

### Shared

- **Package**: `@content-assist/shared/src/schemas/video.ts` — `generateVideoRequestSchema`, `generateVideoResponseSchema`, `videoToneSchema`, `videoVoiceSchema`.
- **SavedPost.video** (`shared/src/types/index.ts`) — persists `{ videoUrl, voiceover, durationMs, bgmUsed, voice, generatedAt }`.

### Mobile (`apps/mobile`)

- `modules/video/api.ts` — `videoApi.generate()` via `ky`, zod-validated.
- `modules/video/hooks.ts` — `useGenerateVideo()` React Query mutation.
- `modules/video/download.ts` — saves MP4 to camera roll via `expo-file-system` + `expo-media-library`.
- `modules/video/components/VideoPlayer.tsx` — uses `expo-video`. Autoplay muted, `playingChange` listener for play/pause overlay, download + regenerate buttons.
- `modules/video/components/VoicePicker.tsx`, `BgmToggle.tsx`, `VideoSkeleton.tsx`, `VideoErrorState.tsx`.
- Wiring in `app/(tabs)/index.tsx` (Faceless Generate flow) + `app/saved/[id].tsx` (saved detail).

### Web (`apps/admin`)

- `modules/video/api.ts` — same contract, `ky` HTTP, zod-validated.
- `modules/video/components/VideoPlayer.tsx` — native HTML5 `<video>` with autoplay muted + "Tap to unmute" overlay. Download uses `fetch + blob + createObjectURL`.
- Mode-toggle aware: Video block only renders in Faceless mode, once ≥2 images exist.
- Saved detail at `app/saved/[id]/page.tsx` renders `VideoPlayer` when `post.video` is present.

---

## 10. Example walk-through

### Input
Idea: *"why your posts get views but no followers"*
Caption (from `/generate/content`): *"Views don't equal loyalty.\nMake them feel something."*
Recommended hook: *"Why do people watch but never follow?"*
Images: 3 scenes (struggle / decision / result) from `/images/generate`.
Voice: **male** · BGM: **on**.

### What the server does
1. `buildVoiceoverScript` → *"Why do people watch but never follow? Views don't equal loyalty. Make them feel something."* (123 chars → still under 240, so prepends idea → *"why your posts get views but no followers. Why do people watch but never follow? Views don't equal loyalty. Make them feel something."*)
2. `synthesizeSpeech(..., { voice: "onyx" })` → ~15.8s MP3.
3. `resolveBgmPath("motivational")` → finds `motivational.mp3` (or first MP3 fallback).
4. `composeVideo`:
   - perScene = 5.4s (so total = 5.4 × 3 − 2 × 0.45 = 15.3s).
   - Clip 0 (struggle): punch-in.
   - Clip 1 (decision): dolly.
   - Clip 2 (result): pan-up.
   - Crossfade stitch → silent video.
   - Mix voice (15.8s) with BGM at 12%, trim to 15.3s.
   - Mux → faststart MP4.
5. Returns `videoUrl: http://192.168.1.12:3000/videos/1712349876543-abc123.mp4`.

### What the client shows
- Vertical 9:16 player autoplays muted.
- "Tap to unmute" badge top-left until tapped.
- Bottom-right meta pill: *15.3s · 🎵 BGM*.
- Voiceover text rendered below the player.
- Download MP4 / Regenerate buttons.
- User taps Save → `SavedPost.video = { videoUrl, voiceover, durationMs: 15300, bgmUsed: true, voice: "male", generatedAt: ... }`.

### What fails gracefully
- No BGM file? → `bgmUsed: false`, voice-only audio.
- FFmpeg not installed? → 502 `ffmpeg_not_installed`, UI says *"FFmpeg is not installed. Install it and restart."*
- `OPENAI_API_KEY` missing? → 502 `tts_not_configured`, UI says *"Voiceover is not configured. Add OPENAI_API_KEY to the server .env and restart."*
- Opens saved post 2h later? → `<video>` gets 404, player shows native "failed to load". The hint under the player says "Download to keep permanently" — user regenerates.

---

## 11. Cost model

| Component             | Cost                         | Notes                                          |
| --------------------- | ---------------------------- | ---------------------------------------------- |
| FFmpeg composition    | **$0**                       | Runs on your server.                           |
| OpenAI TTS (tts-1)    | ~$0.015 / 1,000 chars        | 300-char voiceover = **$0.0045**.              |
| BGM                   | **$0**                       | Royalty-free MP3s shipped in the repo.         |
| Replicate (upstream)  | ~$0.003 / image × 2–3        | Already paid during `/images/generate`.        |
| **Per video total**   | **~$0.005**                  | Just the voiceover call.                       |

---

## 12. File map

**Server**
- `apps/server/src/modules/video/video.prompt.ts` — voiceover text builder.
- `apps/server/src/modules/video/video.compose.ts` — FFmpeg pipeline (Ken Burns + crossfade + audio mix + mux).
- `apps/server/src/modules/video/video.schema.ts` — OpenAPI/zod route.
- `apps/server/src/modules/video/video.handler.ts` — request orchestration + error codes.
- `apps/server/src/modules/video/video.route.ts` — `POST /video/generate` + `GET /videos/:id.mp4` (with Range support).
- `apps/server/src/services/tts/openai-tts.client.ts` — OpenAI SDK wrapper.
- `apps/server/src/services/bgm/bgm.service.ts` — BGM resolution + fallback.
- `apps/server/src/services/ffmpeg/ffmpeg.client.ts` — `spawn`-based FFmpeg wrapper + `ffprobe`.
- `apps/server/src/services/video-storage/video-storage.service.ts` — /tmp storage + TTL cleanup.
- `apps/server/src/assets/bgm/*.mp3` — royalty-free BGM files (drop-in).

**Shared**
- `packages/shared/src/schemas/video.ts`

**Mobile**
- `apps/mobile/modules/video/api.ts`, `hooks.ts`, `download.ts`
- `apps/mobile/modules/video/components/VideoPlayer.tsx`, `VoicePicker.tsx`, `BgmToggle.tsx`, `VideoSkeleton.tsx`, `VideoErrorState.tsx`, `GenerateVideoButton.tsx`

**Web (admin)**
- `apps/admin/src/modules/video/api.ts`, `hooks.ts`
- `apps/admin/src/modules/video/components/VideoPlayer.tsx`, `VoicePicker.tsx`, `BgmToggle.tsx`, `VideoSkeleton.tsx`, `VideoErrorState.tsx`

---

## 13. Verification

1. **Env** — add `OPENAI_API_KEY=sk-...` to `apps/server/.env`. Install FFmpeg: `brew install ffmpeg`.
2. **BGM (optional)** — drop `motivational.mp3` into `apps/server/src/assets/bgm/`. Any MP3 works as a fallback.
3. **Server smoke:**
   ```
   curl -X POST http://localhost:3000/video/generate \
     -H 'content-type: application/json' \
     -d '{
       "idea":"why your posts get views but no followers",
       "caption":"Views don'\''t equal loyalty.\nMake them feel something.",
       "hook":"Why do people watch but never follow?",
       "images":[
         {"url":"https://picsum.photos/seed/1/1080/1920","sceneType":"struggle"},
         {"url":"https://picsum.photos/seed/2/1080/1920","sceneType":"result"}
       ],
       "bgm":true,
       "voice":"female"
     }'
   ```
   Expect `200` with `videoUrl`, `durationMs` between 12000–20000, `bgmUsed: true` (if MP3 present).

4. **Range streaming smoke:**
   ```
   curl -I http://localhost:3000/videos/<id>.mp4
   ```
   Expect `Accept-Ranges: bytes` in the headers.
   ```
   curl -I -H "Range: bytes=0-1023" http://localhost:3000/videos/<id>.mp4
   ```
   Expect `HTTP/1.1 206 Partial Content` and `Content-Range: bytes 0-1023/...`.

5. **Client smoke (mobile)** — Generate content → Generate images → pick voice → tap *Generate video* → skeleton → `<VideoPlayer>` appears → plays inline. Download + Regenerate work.

6. **Client smoke (web)** — same flow at `http://localhost:3001/generate`. `<video>` starts muted, "Tap to unmute" overlay dismisses on click, download triggers a browser save.

7. **TTL smoke** — `startVideoCleanup` interval is 15min; to test instantly, drop `TTL_MS` to `60_000` temporarily and confirm the file disappears after a minute.

---

## 14. Out of scope (deferred)

- **User-uploaded BGM + images + voice** (Phase 2 candidate).
- **Persistent cloud storage** (S3 / Cloudinary) so saved videos survive server restarts.
- **Per-scene modifier** (e.g. "make scene 2 more dramatic") — currently modifier applies to all scenes at image-gen time.
- **Scene 4–5 support** — enum is strict `struggle | decision | result`; extending would require prompt + motion additions.
- **Video caption subtitles** — burnt-in text would need a separate pass (`drawtext` or ASS subtitle mux).
- **Real rotation effects** — current "dolly" is a zoom + diagonal drift; true 1–2° rotation would require the `rotate` filter + corner-cropping.
