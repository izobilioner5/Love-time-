#!/usr/bin/env python3
import argparse,json,re,subprocess,sys
from pathlib import Path
def run(c):
    p=subprocess.run(c,text=True,capture_output=True)
    if p.returncode: raise RuntimeError(p.stderr)
    return p
def sample(p,start,d=30):
    x=subprocess.run(["ffmpeg","-v","info","-ss",str(start),"-t",str(d),"-i",str(p),"-af","silencedetect=n=-55dB:d=2,volumedetect","-f","null","-"],text=True,capture_output=True)
    s=x.stderr
    get=lambda pat: float(re.search(pat,s).group(1)) if re.search(pat,s) else None
    return {"start":start,"decode_ok":x.returncode==0,"silence_events":len(re.findall(r"silence_start:",s)),"max_volume_db":get(r"max_volume:\s*([-\d.]+) dB"),"mean_volume_db":get(r"mean_volume:\s*([-\d.]+) dB")}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--target-duration",type=float); ap.add_argument("--max-size-mb",type=float,default=490); a=ap.parse_args()
    p=Path(a.video); d=json.loads(run(["ffprobe","-v","error","-show_streams","-show_format","-of","json",str(p)]).stdout)
    dur=float(d["format"].get("duration",0)); size=p.stat().st_size/1048576; streams=d["streams"]
    v=next((s for s in streams if s.get("codec_type")=="video"),{}); au=next((s for s in streams if s.get("codec_type")=="audio"),{})
    samples=[sample(p,s) for s in [0,max(0,dur/2-15),max(0,dur-30)]]
    fail=[]
    if not v: fail.append("missing video stream")
    if not au: fail.append("missing audio stream")
    if a.target_duration is not None and abs(dur-a.target_duration)>2: fail.append("duration mismatch")
    if size>a.max_size_mb: fail.append("file exceeds size cap")
    if any(not x["decode_ok"] for x in samples): fail.append("sample decode failure")
    if any(x["silence_events"] for x in samples): fail.append("silence detected in sampled QC")
    print(json.dumps({"pass":not fail,"failures":fail,"duration_seconds":dur,"size_mb":round(size,2),"video":{"codec":v.get("codec_name"),"width":v.get("width"),"height":v.get("height")},"audio":{"codec":au.get("codec_name"),"sample_rate":au.get("sample_rate"),"channels":au.get("channels")},"samples":samples},indent=2))
    sys.exit(0 if not fail else 2)
if __name__=="__main__": main()
