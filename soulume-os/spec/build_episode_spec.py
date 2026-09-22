#!/usr/bin/env python3
import json, sys
from pathlib import Path
REQUIRED=["episode","location","observations","realization"]
def main():
    if len(sys.argv)!=3: raise SystemExit("Usage: build_episode_spec.py architect_brief.json output_spec.json")
    brief=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    missing=[k for k in REQUIRED if not brief.get(k)]
    if missing: raise SystemExit("Missing: "+", ".join(missing))
    ep=int(brief["episode"])
    out={
      "episode":ep,"location":brief["location"],"project_root":"..",
      "architect_intent":{
        "observations":brief["observations"][:5],
        "realization":brief["realization"],
        "music_direction":brief.get("music_direction","infer from realization + listening job"),
        "lore_seed":brief.get("lore_seed","infer one subtle anomaly consistent with World Bible")
      },
      "duration_seconds":int(brief.get("duration_seconds",21355)),
      "audio":{"tracks":[f"assets/ep{ep:02d}/audio/track{i:02d}.mp3" for i in range(1,9)],"crossfade_seconds":4,"target_lufs":-18,"true_peak_db":-2,"bitrate":"96k"},
      "visual":{"images":[f"assets/ep{ep:02d}/visual/scene{i:02d}.jpg" for i in range(1,7)],"scene_seconds":600,"fps":1,"video_bitrate":"80k","zoom_rate":0.00008},
      "output":{"path":f"output/SOULUME_EP{ep:02d}_master.mp4","width":1920,"height":1080},
      "gates":{"backward_link_required":True,"forward_seed_required":True,"zero_extra_spend":True,"publish_only_after_qa_pass":True}
    }
    dst=Path(sys.argv[2]); dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding="utf-8")
    print(dst)
if __name__=="__main__": main()
