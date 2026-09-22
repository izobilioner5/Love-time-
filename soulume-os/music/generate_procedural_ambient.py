#!/usr/bin/env python3
"""
SOULUME zero-extra-spend procedural ambient fallback.

Generates deterministic, royalty-clean ambient beds locally from a small JSON
profile. This is a fallback when free generative-music quotas are unavailable.
It is intentionally low-event and designed to be layered/assembled by the
SOULUME renderer, not to imitate any artist.
"""
import argparse, json, math
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

NOTE = 440.0
SEMITONES = {"C":-9,"C#":-8,"Db":-8,"D":-7,"D#":-6,"Eb":-6,"E":-5,"F":-4,
             "F#":-3,"Gb":-3,"G":-2,"G#":-1,"Ab":-1,"A":0,"A#":1,"Bb":1,"B":2}

def hz(note, octave):
    return NOTE * (2 ** ((SEMITONES[note] + 12*(octave-4))/12))

def env(n, sr, attack=3.0, release=4.0):
    e=np.ones(n,dtype=np.float32)
    a=min(n,int(attack*sr)); r=min(n,int(release*sr))
    if a: e[:a]=np.linspace(0,1,a,dtype=np.float32)
    if r: e[-r:]*=np.linspace(1,0,r,dtype=np.float32)
    return e

def soft_pad(freqs, seconds, sr, rng, brightness=0.35, movement=0.08):
    n=int(seconds*sr); t=np.arange(n,dtype=np.float32)/sr
    l=np.zeros(n,dtype=np.float32); r=np.zeros(n,dtype=np.float32)
    for f in freqs:
        det=rng.uniform(-0.004,0.004)
        phase=rng.uniform(0,2*np.pi)
        base=np.sin(2*np.pi*f*t+phase)
        upper=np.sin(2*np.pi*(f*2.0)*(1+det)*t+phase*.7)*brightness*.18
        sub=np.sin(2*np.pi*(f/2.0)*(1-det)*t+phase*.3)*.22
        slow=0.78 + 0.22*np.sin(2*np.pi*rng.uniform(.008,.025)*t+rng.uniform(0,6.28))
        sig=(base*.55+upper+sub)*slow
        pan=rng.uniform(-0.45,0.45)
        l+=sig*math.sqrt((1-pan)/2)
        r+=sig*math.sqrt((1+pan)/2)
    flutter=1 + movement*np.sin(2*np.pi*.07*t+rng.uniform(0,6.28))
    return np.stack([l*flutter,r*flutter],axis=1)*env(n,sr)

def filtered_noise(seconds, sr, rng, level=.025, cutoff=900):
    n=int(seconds*sr)
    x=rng.normal(0,1,(n,2)).astype(np.float32)
    sos=butter(3, cutoff/(sr/2), btype="low", output="sos")
    x=sosfilt(sos,x,axis=0).astype(np.float32)
    x/=max(1e-6,float(np.max(np.abs(x))))
    return x*level

def sparse_bells(seconds,sr,rng,root_hz,density=.15,level=.035):
    n=int(seconds*sr); y=np.zeros((n,2),dtype=np.float32)
    count=max(0,int(seconds/30*density))
    for _ in range(count):
        start=rng.integers(0,max(1,n-int(5*sr)))
        dur=int(rng.uniform(2.5,5)*sr); tt=np.arange(dur)/sr
        f=root_hz*(2**(rng.choice([0,7,12,19])/12))
        sig=(np.sin(2*np.pi*f*tt)+.25*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt/rng.uniform(1.2,2.8))
        pan=rng.uniform(-.7,.7)
        y[start:start+dur,0]+=sig*math.sqrt((1-pan)/2)*level
        y[start:start+dur,1]+=sig*math.sqrt((1+pan)/2)*level
    return y

def chord_freqs(root, quality, octave=3):
    intervals={"maj":[0,4,7,11],"min":[0,3,7,10],"sus2":[0,2,7,9],"add9":[0,4,7,14]}[quality]
    rootf=hz(root,octave)
    return [rootf*(2**(i/12)) for i in intervals]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("profile")
    ap.add_argument("output")
    ap.add_argument("--seconds",type=int)
    ap.add_argument("--seed",type=int)
    args=ap.parse_args()
    p=json.loads(Path(args.profile).read_text(encoding="utf-8"))
    sr=int(p.get("sample_rate",44100)); seconds=int(args.seconds or p.get("seconds",180))
    seed=int(args.seed if args.seed is not None else p.get("seed",1)); rng=np.random.default_rng(seed)
    progression=p.get("progression",[
        ["D","min"],["Bb","maj"],["F","maj"],["C","sus2"]
    ])
    chord_seconds=float(p.get("chord_seconds",18))
    brightness=float(p.get("brightness",.28)); movement=float(p.get("movement",.05))
    noise_level=float(p.get("ambience_level",.02)); cutoff=float(p.get("ambience_cutoff_hz",750))
    bell_density=float(p.get("detail_density",.12)); bell_level=float(p.get("detail_level",.025))
    total=np.zeros((seconds*sr,2),dtype=np.float32)
    pos=0; ci=0
    while pos<len(total):
        segsec=min(chord_seconds,(len(total)-pos)/sr)
        root,quality=progression[ci%len(progression)]
        freqs=chord_freqs(root,quality,int(p.get("octave",3)))
        seg=soft_pad(freqs,segsec,sr,rng,brightness,movement)
        end=pos+len(seg)
        # short crossfade against previous material
        cf=min(int(float(p.get("crossfade_seconds",4))*sr), len(seg), pos)
        if cf>0:
            fade=np.linspace(0,1,cf,dtype=np.float32)[:,None]
            total[pos:pos+cf]=total[pos:pos+cf]*(1-fade)+seg[:cf]*fade
            total[pos+cf:end]+=seg[cf:]
        else:
            total[pos:end]+=seg
        pos=end; ci+=1
    total+=filtered_noise(seconds,sr,rng,noise_level,cutoff)
    root0=chord_freqs(progression[0][0],progression[0][1],int(p.get("octave",3)))[0]
    total+=sparse_bells(seconds,sr,rng,root0,bell_density,bell_level)
    # Gentle final low-pass and peak normalization.
    lp=float(p.get("master_lowpass_hz",6500))
    sos=butter(3,min(.99,lp/(sr/2)),btype="low",output="sos")
    total=sosfilt(sos,total,axis=0).astype(np.float32)
    peak=float(np.max(np.abs(total)))
    target=float(p.get("peak_target",.55))
    if peak>0: total*=target/peak
    out=Path(args.output); out.parent.mkdir(parents=True,exist_ok=True)
    sf.write(out,total,sr,subtype="PCM_16")
    print(json.dumps({"output":str(out),"seconds":seconds,"sample_rate":sr,"seed":seed,"peak":float(np.max(np.abs(total)))},indent=2))

if __name__=="__main__":
    main()
