# CommonGround challenge submission package

This directory contains the materials needed to complete the WebMCP Challenge submission without rewriting copy or improvising the demo on deadline day.

## Files

- `DEVPOST_SUBMISSION.md` — ready-to-paste title, descriptions, implementation explanation, and testing instructions.
- `VIDEO_SCRIPT.md` — timed narration and matching screen direction.
- `SHOT_LIST.md` — production checklist for every clip and the proof it gives judges.
- `NARRATION.txt` — source narration used for the male voice track.
- `SUBMISSION_CHECKLIST.md` — official requirements and final quality gates.
- `artifacts/commonground-male-narration.mp3` — generated male neural narration.
- `artifacts/commonground-male-narration.vtt` — subtitle timing source.
- `artifacts/video-inspector.html` — local frame-inspection helper used by the quality-control script.

The raw and final MP4 files stay out of Git because the public YouTube upload is the canonical delivery artifact.

## Reproduce the screen capture

Requirements: Windows, Google Chrome, Node.js, pnpm, and `ffmpeg` available on `PATH` for screen capture.

```powershell
pnpm run capture:demo
node scripts/inspect-demo-video.mjs
```

The capture script launches an isolated Chrome application window with WebMCP enabled. It executes real tools through `document.modelContext.executeTool`, drives the visible scenario and setup interfaces, and records a silent 1600×900 source. The final 1920×1080 edit pairs that source with the narration track and ends before the three-minute limit.

## Final handoff

1. Watch the rendered MP4 end-to-end with sound.
2. Upload it to YouTube as **Public**, not Unlisted or Private.
3. Add the YouTube URL to `README.md`, `DEVPOST_SUBMISSION.md`, and Devpost.
4. Make the GitHub repository public and verify it in a logged-out browser.
5. Submit before Thursday, September 3, 2026 at 1:00 PM Pacific Time.

