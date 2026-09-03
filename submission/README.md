# CommonGround challenge submission package

This directory contains the materials needed to complete the WebMCP Challenge submission without rewriting copy or improvising the demo on deadline day.

**Public demo video:** <https://youtu.be/pGRNtlabnbg>

## Files

- `DEVPOST_SUBMISSION.md` — ready-to-paste title, descriptions, implementation explanation, and testing instructions.
- `DEVPOST_ADDITIONAL_INFO.md` — technical testing instructions, repository details, agent/client coverage, and AI-tool disclosure for the Additional Info step; personal eligibility answers are intentionally excluded.
- `devpost-thumbnail-3x2.png` — 1536×1024 Devpost project thumbnail combining the project message with a real production workspace screenshot, optimized for the recommended 3:2 ratio and under the 5 MB limit.
- `devpost-thumbnail.html` — reproducible HTML/CSS source for the Devpost thumbnail.
- `devpost-gallery/` — the three selected Project Media images, numbered in upload order.
- `VIDEO_SCRIPT.md` — timed narration and matching screen direction.
- `SHOT_LIST.md` — production checklist for every clip and the proof it gives judges.
- `AGENT_CAPTURE_RUNBOOK.md` — exact prompt and acceptance gate for the genuine external Site Tools clip.
- `NARRATION.txt` — source narration used for the male voice track.
- `SUBMISSION_CHECKLIST.md` — official requirements and final quality gates.
- `artifacts/commonground-male-narration-v2.mp3` — final 2:06 warm male neural narration, updated for 27 tools.
- `artifacts/commonground-male-narration-v2.vtt` — synchronized captions for the replacement narration.
- `artifacts/commonground-final-submission-master.mp4` — final Adobe-rendered 1920×1080 submission master, approximately 2:06, combining the genuine Codex Site Tools capture with the product story and male narration.
- `artifacts/commonground-male-narration.mp3` and `.vtt` — superseded 17-tool narration retained only for fallback history.
- `artifacts/video-inspector.html` — local frame-inspection helper used by the quality-control script.
- `artifacts/commonground-final-demo-agent.mp4` — superseded Adobe-rendered cut retained locally as fallback history.
- `artifacts/webmcp-production-27-tools.png` — production verification frame showing the deployed 27-tool status.

Raw capture intermediates stay out of Git. The compact final submission master is committed for team handoff; the public YouTube upload remains the canonical Devpost delivery artifact.

## Reproduce the screen capture

Requirements: Windows, Google Chrome, Node.js, pnpm, and `ffmpeg` available on `PATH` for screen capture.

```powershell
pnpm run capture:demo
node scripts/inspect-demo-video.mjs
```

The capture script launches an isolated Chrome application window with WebMCP enabled. It executes real tools through `document.modelContext.executeTool`, drives the visible scenario and setup interfaces, and records a silent 1600×900 source. The accepted final master instead opens with the recognizable Codex conversation and CommonGround built-in browser, then combines that genuine Site Tools footage with the strongest product views and the synchronized male narration.

## Final handoff

1. Watch the rendered MP4 end-to-end with sound.
2. Confirm the [YouTube video](https://youtu.be/pGRNtlabnbg) remains **Public** and plays while logged out.
3. Paste the prepared Devpost copy and verify its links.
4. Verify the public GitHub repository in a logged-out browser.
5. Submit before Thursday, September 3, 2026 at 1:00 PM Pacific Time.
