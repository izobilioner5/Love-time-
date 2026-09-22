#!/usr/bin/env python3
import json, sys
from pathlib import Path
STATES=["BRIEF","SPEC","ASSETS","AUDIO_CORE","VISUAL_CORE","RENDER","QA","PACKAGE","PUBLISH","VERIFY","ANALYTICS","MEMORY"]
def main():
    if len(sys.argv)<3: raise SystemExit("Usage: pipeline_state.py state.json STATUS [detail]")
    p=Path(sys.argv[1]); status=sys.argv[2].upper(); detail=" ".join(sys.argv[3:]) if len(sys.argv)>3 else ""
    d=json.loads(p.read_text()) if p.exists() else {"states":{x:"PENDING" for x in STATES},"history":[]}
    if status not in STATES: raise SystemExit("Unknown state")
    idx=STATES.index(status)
    for prior in STATES[:idx]:
        if d["states"].get(prior)!="PASS":
            raise SystemExit(f"Cannot advance to {status}: {prior} is not PASS")
    d["states"][status]="PASS"; d["history"].append({"state":status,"detail":detail})
    p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(d,indent=2),encoding="utf-8"); print(p)
if __name__=="__main__": main()
