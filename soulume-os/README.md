# SOULUME OS v0.1 — ZERO EXTRA SPEND

Goal: Architect brief -> Episode Spec -> verified long-form master -> packaging -> publish -> analytics -> next episode.

## Immutable operating rule
Until traction is proven, buy no extra credits, subscriptions or generation limits. Prefer existing access, free quotas and deterministic local/open-source tools. If a free quota is exhausted, use a fallback or report the blocker; never purchase automatically.

## Daily Architect interface
Anton supplies only:
1. destination/location;
2. 3–5 things S. notices/experiences;
3. what S. realizes;
4. music feeling / listening job (optional reference);
5. optional lore/visual seed.

Everything else is inferred from the World Bible and analytics.

## Pipeline states
BRIEF -> SPEC -> ASSETS -> AUDIO_CORE -> VISUAL_CORE -> RENDER -> QA -> PACKAGE -> PUBLISH -> VERIFY -> ANALYTICS -> MEMORY

A state may advance only when its gate passes. A public upload is forbidden when QA fails.

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
- related Shorts plan;
- verified destination channel = SOULUME.

## Failure policy
Never claim success from a scheduled job alone. Verify final file and public URL. Never publish a known-corrupt/noise-only/wrong-version file.


## Analytics source hierarchy
Primary direct analytics source: Windsor.ai YouTube connector (connected account 41791). Use it for video views, estimated minutes watched, average view duration, traffic source, subscribers gained/lost, shares, comments, likes and video metadata. Metricool is auxiliary for publishing/planning and can provide per-video watch minutes, average view duration, traffic source and channel evolution.

Important limitation: the currently exposed Windsor.ai YouTube field catalog does not expose YouTube impression CTR. Metricool's current YouTube metric catalog also does not expose organic thumbnail impressions/CTR. Treat CTR/impressions as a YouTube Studio/browser-only metric unless a connector later exposes it; do not invent or estimate it.

Feedback cadence after publication:
- 24h: early packaging/distribution read.
- 72h: initial content/listening-job read.
- 7d: comparative decision.
Every review ends with one primary bottleneck and one next experiment.
