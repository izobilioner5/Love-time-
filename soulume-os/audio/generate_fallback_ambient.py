#!/usr/bin/env python3
"""
Zero-cost emergency ambient generator for SOULUME.
Purpose: keep the conveyor moving when external/free music generation is unavailable.
This is a fallback, not the preferred artistic source.
"""
import argparse, math, wave, random, subprocess
from pathlib import Path
import numpy as np

CHORDS = [
    [0, 3, 7, 10],   # min7
    [0, 4, 7, 11],   # maj7
    [0, 5, 7, 10],   # sus/min color
    [0, 3, 7, 12],
]

def midi_hz(n): return 440.0 * (2 ** ((n - 69)/12))

def pad(freq, t, phase):
    # soft harmonically sparse pad
    x = (np.sin(2*np.pi*freq*t+phase)
       + 0.32*np.sin(2*np.pi*freq*2*t+phase*.7)
       + 0.12*np.sin(2*np.pi*freq*.5*t+phase*1.2))
    return np.tanh(x*0.65)

def generate_wav(path, minutes, root_midi, seed, sr=44100):
    random.seed(seed); np.random.seed(seed)
    total=int(minutes*60*sr)
    block=sr*10
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        pos=0
        chord_len=45*sr
        while pos<total:
            n=min(block,total-pos)
            t=(np.arange(n)+pos)/sr
            chord_i=(pos//chord_len)%len(CHORDS)
            chord=CHORDS[int(chord_i)]
            y=np.zeros(n,dtype=np.float64)
            for j,st in enumerate(chord):
                f=midi_hz(root_midi+st)
                phase=(seed*0.71+j*1.93)%6.28
                slow=0.55+0.45*np.sin(2*np.pi*(0.003+j*0.0007)*t+phase)
                y += 0.12*pad(f,t,phase)*slow
            # quiet sub + filtered-style brown-ish noise approximation
            y += 0.035*np.sin(2*np.pi*midi_hz(root_midi-12)*t)
            noise=np.random.normal(0,1,n)
            noise=np.cumsum(noise); noise/=max(1,np.max(np.abs(noise)))
            y += noise*0.012
            # very slow fade envelope at whole-track edges
            sec=(np.arange(n)+pos)/sr
            env=np.minimum(1,sec/8)
            remain=(total-(np.arange(n)+pos))/sr
            env*=np.minimum(1,remain/8)
            y=np.clip(y*env,-0.9,0.9)
            stereo=np.stack([y, np.roll(y, int(sr*0.013))],axis=1)
            pcm=(stereo*32767).astype('<i2').tobytes()
            w.writeframes(pcm)
            pos+=n

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("output_dir")
    ap.add_argument("--tracks",type=int,default=8)
    ap.add_argument("--minutes",type=float,default=4)
    ap.add_argument("--seed",type=int,default=500)
    ap.add_argument("--prefix",default="SOULUME_FALLBACK")
    a=ap.parse_args()
    out=Path(a.output_dir); out.mkdir(parents=True,exist_ok=True)
    roots=[45,48,50,43,52,47,41,50]
    for i in range(a.tracks):
        wav=out/f"{a.prefix}_{i+1:02d}.wav"
        mp3=out/f"{a.prefix}_{i+1:02d}.mp3"
        generate_wav(wav,a.minutes,roots[i%len(roots)],a.seed+i)
        subprocess.run(["ffmpeg","-y","-v","error","-i",str(wav),
                        "-af","lowpass=f=5500,highpass=f=35,loudnorm=I=-22:TP=-3:LRA=5",
                        "-c:a","libmp3lame","-b:a","160k",str(mp3)],check=True)
        wav.unlink()
        print(mp3)
if __name__=="__main__": main()
