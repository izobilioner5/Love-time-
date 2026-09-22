# SOULUME OS v0.2 — ARCHITECT MODE / ZERO EXTRA SPEND

Goal: Architect direction -> episode -> multi-channel distribution -> verified publication -> analytics -> next episode.

## Start-of-work trigger
There is NO fixed 08:00 start. The old scheduled 08:00 Architect Brief is disabled.

The daily conveyor starts when Anton actually begins work. In ChatGPT, the first SOULUME work message of the day is treated as the start signal and the assistant immediately runs the Architect Brief. No fixed wake-up time is assumed.

## Daily Architect interface
Before the five questions, state the production promise for this cycle:
**One Architect Brief will produce:**
- 1 long-form SOULUME YouTube Episode;
- automatic Shorts cutdowns for traffic acquisition;
- YouTube Community content;
- Threads content;
- Instagram content once the SOULUME Instagram connection is available;
- packaging, QA, publishing handoff and analytics loop.

Anton supplies only:
1. destination/location;
2. 3–5 things S. notices/experiences;
3. what S. realizes;
4. music feeling / listening job (optional reference);
5. optional lore/visual seed.

Do not ask separate process questions about Shorts, Community, Threads, Instagram, SEO, montage, thumbnail or publishing when they can be inferred from canon and the episode.

## Mandatory episode outputs
Every real Episode produces a **content cluster**, not a single video:

### A. YouTube Long-form
- final master;
- title + RU translation;
- description + RU translation;
- thumbnail;
- tags/search intent;
- S. Little Note / first comment;
- playlist/end-screen/backward-link logic;
- verified publish URL.

### B. YouTube Shorts — mandatory acquisition layer
Default target: 4–6 materially different Shorts per Episode unless the source material genuinely does not support that many.
Each Short must:
- be 9:16;
- have a distinct hook, not duplicate the same opening;
- use a strong visual/music/lore moment from the Episode;
- preserve the S. canon;
- act as a discovery door into the corresponding long-form Episode;
- carry a clear related-video/episode intent where the platform supports it;
- be packaged and scheduled/published only after source QA.

Shorts are not optional promotional leftovers. They are a required traffic-acquisition output of the Episode factory.

### C. YouTube Community
Create at least one episode-linked Community concept/post package:
- diary fragment / still / poll / question / lore clue as appropriate;
- S. voice;
- links conceptually back to the current Episode;
- never reveal the Architect inside canon.

If the currently connected publisher cannot publish YouTube Community posts, still generate the complete package and mark the connector as the blocker rather than skipping this output.

### D. Threads
Generate a native Threads package from the Episode:
- concise English public copy;
- Russian translation for Anton;
- one or more distinct story/lore/travel angles;
- no mechanical duplication of YouTube description;
- use connected SOULUME Threads only when verified.

### E. Instagram
Once SOULUME Instagram is connected:
- Reel cutdowns from the same approved vertical assets;
- caption package;
- optional Story sequence/stills;
- consistent S. identity and episode lore;
- do not require Anton to brief Instagram separately.

If Instagram is not connected, prepare the package anyway and keep publishing as the only blocker.

## Pipeline states
START -> BRIEF -> SPEC -> ASSETS -> AUDIO_CORE -> VISUAL_CORE -> RENDER -> QA -> PACKAGE -> DISTRIBUTION_CLUSTER -> PUBLISH -> VERIFY -> ANALYTICS -> MEMORY

A state may advance only when its gate passes. A public upload is forbidden when QA fails.

## Immutable operating rule
Until traction is proven, buy no extra credits, subscriptions or generation limits. Prefer existing access, free quotas and deterministic local/open-source tools. If a free quota is exhausted, use a fallback or report the blocker; never purchase automatically.

## Free render module
`python3 render/render_episode.py config/episode.json`

The renderer:
- loudness-normalizes source tracks;
- crossfades them into a unique core;
- loops the whole core to the requested duration;
- builds a low-bitrate cinematic Ken-Burns visual core from approved keyframes;
- loops the whole visual core;
- muxes H.264/AAC into a long-form MP4.

## QA module
`python3 render/qa_episode.py output/master.mp4 --target-duration 21355 --max-size-mb 490`

Checks:
- video/audio streams exist;
- duration;
- file-size ceiling;
- decode at beginning / middle / end;
- sampled silence detection;
- sample peak/mean levels.

## World rules
- Public heroine signature: `S.` only.
- Architect never appears inside canon.
- 80% utility/music, 15% visual world, 5% lore.
- Every episode creates at least one backward link and one unresolved forward seed.
- Starting Episode 04, the universe subtly responds to S.; anomalies are shown, never explained outright.
- Audience reactions influence presentation/peripheral lore, not immutable core without Architect approval.

## Publish gate
Required before public:
- QA pass;
- final English title + Russian translation;
- description + Russian translation;
- thumbnail;
- episode number and playlist;
- Music category;
- madeForKids=false;
- correct AI disclosure;
- first/pinned comment copy;
- mandatory Shorts package;
- Community package;
- Threads package;
- Instagram package when connection exists, otherwise prepared-and-blocked;
- verified destination channels = SOULUME.

## Failure policy
Never claim success from a scheduled job alone. Verify final file and public URL. Never publish a known-corrupt/noise-only/wrong-version file. Do not block the entire episode because one secondary social connector is unavailable; finish all other outputs and identify the exact remaining connector blocker.

## Analytics source hierarchy
Primary direct analytics source: Windsor.ai YouTube connector (connected account 41791). Use it for video views, estimated minutes watched, average view duration, traffic source, subscribers gained/lost, shares, comments, likes and video metadata. Metricool is auxiliary for publishing/planning and can provide per-video watch minutes, average view duration, traffic source and channel evolution.

Important limitation: the currently exposed Windsor.ai YouTube field catalog does not expose YouTube impression CTR. Metricool's current YouTube metric catalog also does not expose organic thumbnail impressions/CTR. Treat CTR/impressions as a YouTube Studio/browser-only metric unless a connector later exposes it; do not invent or estimate it.

Feedback cadence after publication:
- 24h: early packaging/distribution read;
- 72h: initial content/listening-job read;
- 7d: comparative decision.

Every review ends with one primary bottleneck and one next experiment, including which Short/social entry point drove useful discovery when data is available.

## Verified cloud conveyor — 2026-09-22
Two cloud smoke tests completed successfully. Latest verified:
- https://github.com/izobilioner5/Love-time-/actions/runs/35745796551
- result: success;
- hard QA: PASS;
- 1920x1080 H.264 + AAC 44.1 kHz stereo;
- direct test master: https://github.com/izobilioner5/Love-time-/releases/download/soulume-ep99-pipeline-2/SOULUME_EP99_master.mp4

Asset rule: use episode-specific quality assets when present; generate procedural audio and use the fallback S. visual only for missing slots.

GitHub Release MP4 -> Metricool handoff was verified with a safe private draft in SOULUME brand 7035936. Canary post id: 380158200, UUID: 6462255968076385968. It is draft=true, autoPublish=false, privacy=private and must never be treated as a public release.

For a real episode:
Architect Brief -> update run_request.json -> cloud workflow -> QA PASS -> Release MP4 URL -> distribution cluster -> Metricool/available publishers -> verify actual public URLs.
