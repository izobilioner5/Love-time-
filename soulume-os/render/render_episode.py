#!/usr/bin/env python3
import argparse,json,shlex,subprocess,sys
from pathlib import Path
def run(cmd,check=True):
    print("+"," ".join(shlex.quote(str(x)) for x in cmd),flush=True)
    p=subprocess.run(cmd,text=True,capture_output=True)
    if p.stdout: print(p.stdout)
    if p.stderr: print(p.stderr,file=sys.stderr)
    if check and p.returncode: raise RuntimeError(f"Command failed: {cmd}")
    return p
def probe_duration(p):
    return float(run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",str(p)]).stdout.strip())
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("spec"); a=ap.parse_args()
    spec=json.load(open(a.spec,encoding="utf-8")); spec_dir=Path(a.spec).resolve().parent
    root=(spec_dir/spec.get("project_root",".")).resolve()
    R=lambda x:(Path(x) if Path(x).is_absolute() else (root/x).resolve())
    dur=int(spec["duration_seconds"]); au=spec["audio"]; vi=spec["visual"]; outcfg=spec["output"]
    tracks=[R(x) for x in au["tracks"]]; images=[R(x) for x in vi["images"]]
    for p in tracks+images:
        if not p.exists(): raise FileNotFoundError(p)
    out=R(outcfg["path"]); out.parent.mkdir(parents=True,exist_ok=True)
    wd=out.parent/f'.soulume_ep{spec.get("episode","x")}_work'; wd.mkdir(exist_ok=True)
    inputs=[]; filters=[]; labels=[]
    for i,t in enumerate(tracks):
        inputs += ["-i",str(t)]; lbl=f"a{i}"; labels.append(lbl)
        filters.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,loudnorm=I={au.get('target_lufs',-18)}:TP={au.get('true_peak_db',-2)}:LRA=7[{lbl}]")
    cur=labels[0]
    for i in range(1,len(labels)):
        nxt=f"xf{i}"; filters.append(f"[{cur}][{labels[i]}]acrossfade=d={au.get('crossfade_seconds',4)}:c1=tri:c2=tri[{nxt}]"); cur=nxt
    corea=wd/"audio_core.m4a"
    run(["ffmpeg","-y",*inputs,"-filter_complex",";".join(filters),"-map",f"[{cur}]","-c:a","aac","-b:a","128k",str(corea)])
    longa=wd/"audio_long.m4a"
    run(["ffmpeg","-y","-stream_loop","-1","-i",str(corea),"-t",str(dur),"-c:a","aac","-b:a",au.get("bitrate","96k"),"-ar","44100","-ac","2",str(longa)])
    clips=[]; w=int(outcfg.get("width",1920)); h=int(outcfg.get("height",1080)); fps=int(vi.get("fps",1)); vb=vi.get("video_bitrate","80k")
    for i,img in enumerate(images,1):
        c=wd/f"visual_{i:02d}.mp4"; clips.append(c)
        vf=f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},zoompan=z='min(zoom+{vi.get('zoom_rate',0.00008)},1.06)':d=1:s={w}x{h}:fps={fps},format=yuv420p"
        run(["ffmpeg","-y","-loop","1","-framerate",str(fps),"-i",str(img),"-t",str(vi.get("scene_seconds",600)),"-vf",vf,"-an","-c:v","libx264","-preset","veryfast","-tune","stillimage","-b:v",vb,"-maxrate",vb,"-bufsize","256k","-r",str(fps),"-pix_fmt","yuv420p",str(c)])
    lst=wd/"visual.concat.txt"
    lst.write_text("".join(f"file '{c.resolve().as_posix()}'\n" for c in clips),encoding="utf-8")
    corev=wd/"visual_core.mp4"
    run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(lst),"-c","copy",str(corev)])
    run(["ffmpeg","-y","-stream_loop","-1","-i",str(corev),"-i",str(longa),"-t",str(dur),"-map","0:v:0","-map","1:a:0","-c:v","copy","-c:a","copy","-movflags","+faststart","-shortest",str(out)])
    print(json.dumps({"output":str(out),"duration_seconds":probe_duration(out),"size_mb":round(out.stat().st_size/1048576,2)},indent=2))
if __name__=="__main__": main()
