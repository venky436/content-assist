# Background music (BGM) tracks

Drop royalty-free MP3 files here. The video pipeline picks one based on `tone`:

| File               | Tone           | Suggested feel                         |
| ------------------ | -------------- | -------------------------------------- |
| `motivational.mp3` | `motivational` | Upbeat, driving, building              |
| `calm.mp3`         | `calm`         | Steady, warm, mid-tempo                |
| `emotional.mp3`    | `emotional`    | Soft, pensive, slow                    |

## Requirements

- Format: MP3
- Length: at least 30s (the pipeline loops shorter tracks automatically)
- Volume: pipeline mixes at 12% (`0.12`) so the raw file can be normal loudness
- Rights: royalty-free + commercially usable — e.g. Pixabay Music, YouTube Audio Library, Uppbeat free tier

## Fallback

If a file is missing, the pipeline **skips BGM** and delivers a TTS-only voiceover track. No crash.
Put at least one file here to hear music.

## Not committed by default

These MP3s are typically gitignored. Each developer drops their own licensed copies in.
