#!/usr/bin/env python3
import argparse, json, subprocess
from pathlib import Path

def sh(cmd):
    subprocess.run(cmd, check=True)

def probe(path):
    out=subprocess.check_output([
        "ffprobe","-v","error","-show_entries","format=duration",
        "-of","default=nw=1:nk=1",str(path)
    ], text=True).strip()
    return float(out)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("master")
    ap.add_argument("output_dir")
    ap.add_argument("--count",type=int,default=5)
    ap.add_argument("--seconds",type=float,default=30.0)
    ap.add_argument("--episode",type=int,required=True)
    a=ap.parse_args()

    master=Path(a.master)
    out=Path(a.output_dir); out.mkdir(parents=True,exist_ok=True)
    total=probe(master)
    clip=min(a.seconds, max(4.0,total))
    if total <= clip:
        starts=[0.0]*a.count
    else:
        fractions=[0.08,0.26,0.44,0.62,0.80,0.92]
        starts=[]
        for i in range(a.count):
            f=fractions[i] if i < len(fractions) else (i+1)/(a.count+1)
            starts.append(min(max(0.0,total*f-clip/2), max(0.0,total-clip)))

    manifest={"episode":a.episode,"source":str(master),"shorts":[]}
    for i,start in enumerate(starts,1):
        target=out/f"SOULUME_EP{a.episode:02d}_short_{i:02d}.mp4"
        vf=(
          "[0:v]split=2[bg0][fg0];"
          "[bg0]scale=1080:1920:force_original_aspect_ratio=increase,"
          "crop=1080:1920,gblur=sigma=24[bg];"
          "[fg0]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
          "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]"
        )
        sh([
            "ffmpeg","-y","-ss",f"{start:.3f}","-i",str(master),"-t",f"{clip:.3f}",
            "-filter_complex",vf,"-map","[v]","-map","0:a:0?",
            "-c:v","libx264","-preset","veryfast","-crf","23",
            "-c:a","aac","-b:a","128k","-movflags","+faststart",str(target)
        ])
        dur=probe(target)
        # hard local checks for vertical social output
        p=json.loads(subprocess.check_output([
            "ffprobe","-v","error","-select_streams","v:0",
            "-show_entries","stream=width,height,codec_name",
            "-of","json",str(target)
        ],text=True))
        s=p["streams"][0]
        if s.get("width")!=1080 or s.get("height")!=1920:
            raise SystemExit(f"Short {i} invalid resolution: {s}")
        if dur < min(clip, total)-1.0:
            raise SystemExit(f"Short {i} too short: {dur}")
        manifest["shorts"].append({
          "index":i,"start_seconds":round(start,3),"duration_seconds":round(dur,3),
          "file":str(target),"hook_status":"GENERATE_NATIVE_HOOK_FROM_EPISODE_LORE",
          "destination":"corresponding long-form Episode"
        })

    (out/"shorts_manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=="__main__":
    main()
