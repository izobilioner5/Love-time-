#!/usr/bin/env python3
import json, sys
from pathlib import Path

def main():
    if len(sys.argv)!=3:
        raise SystemExit("Usage: build_distribution_manifest.py episode_spec.json distribution.json")
    s=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    ep=int(s["episode"])
    loc=s["location"]
    out={
      "episode":ep,
      "location":loc,
      "outputs":{
        "youtube_long":{"required":True,"status":"PENDING"},
        "youtube_shorts":{
          "required":True,
          "default_count":5,
          "min_count":4,
          "max_count":6,
          "format":"9:16",
          "purpose":"traffic acquisition into long-form episode",
          "rules":[
            "materially distinct hooks",
            "use only QA-approved episode assets",
            "preserve S. canon",
            "do not make near-duplicate cuts",
            "attach related long-form destination where supported"
          ],
          "status":"PENDING"
        },
        "youtube_community":{
          "required_package":True,
          "formats":["diary_fragment","still","poll","question","lore_clue"],
          "publish_if_connector_supports":True,
          "status":"PENDING"
        },
        "threads":{
          "required_package":True,
          "native_adaptation":True,
          "public_language":"English",
          "user_translation":"Russian",
          "status":"PENDING"
        },
        "instagram":{
          "required_package":True,
          "publish_if_connected":True,
          "reels_from_short_assets":True,
          "stories_optional":True,
          "public_language":"English",
          "user_translation":"Russian",
          "status":"PENDING"
        }
      },
      "global_rules":{
        "public_signature":"S.",
        "architect_visible":False,
        "zero_extra_spend":True,
        "do_not_block_other_channels_if_one_connector_missing":True
      }
    }
    Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print(sys.argv[2])

if __name__=="__main__":
    main()
