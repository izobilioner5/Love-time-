#!/usr/bin/env python3
import json, sys
from pathlib import Path
def main():
    if len(sys.argv)!=3: raise SystemExit("Usage: build_publish_package.py episode_spec.json package.json")
    s=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")); ep=int(s["episode"])
    p={
      "episode":ep,"location":s["location"],
      "youtube":{"category":"MUSIC","madeForKids":False,"privacy":"public","isAiGeneratedContent":True,
        "title_status":"GENERATE_FROM_CURRENT_SEARCH_RESEARCH","description_status":"GENERATE_EN_PLUS_RU",
        "thumbnail_status":"GENERATE_AND_QC","tags_status":"GENERATE_FROM_CURRENT_SEARCH_INTENT",
        "first_comment_status":"GENERATE_IN_S_VOICE_EN_PLUS_RU","playlist_status":"VERIFY_BEFORE_PUBLISH"},
      "story":{"public_signature":"S.","realization":s["architect_intent"]["realization"],"must_include_backward_link":True,"must_include_forward_seed":True,"architect_visible":False},
      "publish_gate":{"requires_qa_pass":True,"requires_final_video":True,"requires_thumbnail":True,"requires_verified_destination_channel":True}
    }
    Path(sys.argv[2]).write_text(json.dumps(p,indent=2,ensure_ascii=False),encoding="utf-8")
    print(sys.argv[2])
if __name__=="__main__": main()
