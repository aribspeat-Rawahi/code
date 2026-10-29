"""Synthesize the background music and sound effects from scratch (numpy only, no samples),
so every sound in the video is original and royalty-free.

Music: three looping stems that follow the story's mood
  public/music/tender.mp3  A minor, 72 bpm  - old palms, worry      (intro, scenes 1-2)
  public/music/hope.mp3    C major, 88 bpm  - ARIBS steps in         (scenes 3-6)
  public/music/uplift.mp3  C major, 100 bpm - water, harvest, Oman   (scenes 7-9, outro)
SFX: public/sfx/*.mp3 (whoosh, swoosh, pop, thud, chime, horn, engine, hum, drop, birds)

Usage: python scripts/audio.py   (needs numpy, soundfile and ffmpeg on PATH)
"""

import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
RNG = np.random.default_rng(7)  # fixed seed: same sounds on every run


def hz(note: str) -> float:
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[name] + 12 * (octave + 1) - 69) / 12)


def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):  # one-pole filter
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def band_noise(dur: float, lo: float, hi: float) -> np.ndarray:
    """White noise limited to [lo, hi] Hz via FFT."""
    n = int(dur * SR)
    spec = np.fft.rfft(RNG.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    out = np.fft.irfft(spec, n)
    return out / (np.abs(out).max() + 1e-9)


# ---------------------------------------------------------------- instruments
def piano(freq: float, dur: float, vel: float = 1.0, bright: float = 1.0) -> np.ndarray:
    t = t_axis(dur)
    out = np.zeros_like(t)
    for k in range(1, 7):
        out += np.sin(2 * np.pi * freq * k * t * (1 + 0.0004 * k)) * (bright / k ** 1.6) * np.exp(-t * (1.1 + 0.9 * k))
    attack = np.minimum(1, t / 0.006)
    release = np.minimum(1, (dur - t) / 0.08)
    return out * attack * release * vel


def pad(freqs: list[float], dur: float, vel: float = 1.0, bright: float = 0.6) -> np.ndarray:
    t = t_axis(dur)
    out = np.zeros_like(t)
    for f in freqs:
        for detune in (-0.004, 0.0, 0.004):
            for k in range(1, 6):
                out += np.sin(2 * np.pi * f * (1 + detune) * k * t + k) * (bright ** (k - 1)) / k
    env = np.minimum(1, t / 0.9) * np.minimum(1, (dur - t) / 0.9)
    tremolo = 1 + 0.06 * np.sin(2 * np.pi * 0.25 * t)
    return out * env * tremolo * vel / (len(freqs) * 3)


def bass(freq: float, dur: float, vel: float = 1.0) -> np.ndarray:
    t = t_axis(dur)
    out = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)
    return out * np.exp(-t * 2.2) * np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05) * vel


def kick(vel: float = 1.0) -> np.ndarray:
    t = t_axis(0.35)
    f = 50 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * vel


def shaker(vel: float = 1.0) -> np.ndarray:
    t = t_axis(0.09)
    return band_noise(0.09, 5000, 12000) * np.exp(-t * 55) * vel


def reverb(x: np.ndarray, seconds: float = 2.2, mix: float = 0.28) -> np.ndarray:
    """Circular convolution, so a loop's reverb tail wraps into its own start (seamless loop)."""
    n = len(x)
    t = np.arange(int(seconds * SR)) / SR
    ir = RNG.standard_normal(len(t)) * np.exp(-t * 3.2)
    ir = np.concatenate([ir, np.zeros(max(0, n - len(ir)))])[:n]
    wet = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir), n)
    wet /= np.abs(wet).max() + 1e-9
    return x * (1 - mix) + wet * mix * np.abs(x).max()


# ---------------------------------------------------------------- music
CHORDS = {
    "Am": ["A2", "A3", "C4", "E4"],
    "F": ["F2", "F3", "A3", "C4"],
    "C": ["C3", "G3", "C4", "E4"],
    "G": ["G2", "G3", "B3", "D4"],
    "Em": ["E2", "E3", "G3", "B3"],
    "Dm": ["D2", "D3", "F3", "A3"],
}


def song(bpm: float, chords: list[str], melody: list[list[tuple[float, str, float]]], style: str) -> np.ndarray:
    beat = 60 / bpm
    bar = 4 * beat
    total = bar * len(chords)
    mix = np.zeros(int(total * SR))

    def add(sig: np.ndarray, at: float) -> None:
        i = int(at * SR) % len(mix)
        end = i + len(sig)
        if end <= len(mix):
            mix[i:end] += sig
        else:  # wrap around: the stem loops
            cut = len(mix) - i
            mix[i:] += sig[:cut]
            mix[: end - len(mix)] += sig[cut:]

    for b, name in enumerate(chords):
        notes = [hz(n) for n in CHORDS[name]]
        t0 = b * bar
        add(pad(notes[1:], bar + 0.9, 0.55 if style == "tender" else 0.45, 0.5 if style == "tender" else 0.65), t0)
        if style == "tender":
            # Slow broken chord, quarter notes, soft
            for i, n in enumerate([notes[1], notes[2], notes[3], notes[2]]):
                add(piano(n, beat * 2.5, 0.32 + 0.05 * (i == 0), 0.8), t0 + i * beat)
            add(bass(notes[0], bar, 0.35), t0)
        else:
            # Eighth-note arpeggio
            arp = [notes[1], notes[2], notes[3], notes[2] * 2, notes[3], notes[2], notes[3], notes[1] * 2]
            for i, n in enumerate(arp):
                add(piano(n, beat, 0.22 if style == "hope" else 0.25, 1.1), t0 + i * beat / 2)
            for i in range(4 if style == "uplift" else 2):
                add(bass(notes[0], beat * (1 if style == "uplift" else 2), 0.5), t0 + i * beat * (1 if style == "uplift" else 2))
            for i in range(8):
                add(shaker(0.10 if i % 2 else 0.05), t0 + i * beat / 2)
            if style == "uplift":
                for i in (0, 2):
                    add(kick(0.55), t0 + i * beat)
        for at_beat, note, length in melody[b % len(melody)]:
            add(piano(hz(note), length * beat + 0.4, 0.42, 1.3), t0 + at_beat * beat)

    mix = reverb(mix)
    return mix / (np.abs(mix).max() + 1e-9) * 0.9


def music() -> dict[str, np.ndarray]:
    tender = song(
        72,
        ["Am", "F", "C", "G", "Am", "F", "Dm", "Em"],
        [
            [(0, "E5", 1.5), (2, "C5", 2)],
            [(0, "A4", 3)],
            [(1, "G4", 1), (2, "E5", 2)],
            [(0, "D5", 3.5)],
            [(0, "E5", 1), (1, "D5", 1), (2, "C5", 2)],
            [(0, "A4", 3.5)],
            [(1, "F4", 1), (2, "A4", 2)],
            [(0, "B4", 3.5)],
        ],
        "tender",
    )
    hope = song(
        88,
        ["C", "G", "Am", "F", "C", "G", "F", "G"],
        [
            [(0, "E5", 1), (1, "G5", 1), (2, "E5", 2)],
            [(0, "D5", 2), (2, "B4", 2)],
            [(0, "C5", 1), (1, "E5", 1), (2, "A5", 2)],
            [(0, "A5", 1.5), (2, "G5", 2)],
            [(0, "E5", 1), (1, "G5", 1), (2, "C6", 2)],
            [(0, "B5", 2), (2, "G5", 2)],
            [(0, "A5", 1), (1, "C6", 1), (2, "A5", 2)],
            [(0, "G5", 3.5)],
        ],
        "hope",
    )
    uplift = song(
        100,
        ["F", "G", "Em", "Am", "F", "G", "C", "C"],
        [
            [(0, "A5", 1), (1, "C6", 1), (2, "F5", 2)],
            [(0, "B5", 1), (1, "D6", 1), (2, "G5", 2)],
            [(0, "G5", 1), (1, "B5", 1), (2, "E6", 2)],
            [(0, "E6", 1), (1, "C6", 1), (2, "A5", 2)],
            [(0, "A5", 1), (1, "C6", 1), (2, "F6", 2)],
            [(0, "D6", 1), (1, "B5", 1), (2, "G5", 2)],
            [(0, "E6", 1.5), (2, "G6", 2)],
            [(0, "C6", 3.5)],
        ],
        "uplift",
    )
    return {"tender": tender, "hope": hope, "uplift": uplift}


# ---------------------------------------------------------------- sound effects
def sfx() -> dict[str, np.ndarray]:
    out: dict[str, np.ndarray] = {}

    # Whoosh: band noise whose brightness sweeps up and back down
    d = 0.6
    t = t_axis(d)
    n = band_noise(d, 300, 9000)
    cutoff_env = np.sin(np.pi * t / d) ** 2
    lo = lowpass(n, 600) * (1 - cutoff_env) + lowpass(n, 4000) * cutoff_env
    out["whoosh"] = lo * np.sin(np.pi * t / d) ** 1.5

    # Swoosh (slide): longer, falling sweep
    d = 0.7
    t = t_axis(d)
    n = band_noise(d, 200, 8000)
    sweep = np.linspace(1, 0, len(t)) ** 2
    out["swoosh"] = (lowpass(n, 5000) * sweep + lowpass(n, 700) * (1 - sweep)) * np.sin(np.pi * t / d) ** 1.2

    # Pop: quick falling sine (bubbles, chips)
    t = t_axis(0.12)
    f = 260 + 700 * np.exp(-t * 45)
    out["pop"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)

    # Thud: palm trunk landing
    t = t_axis(0.45)
    f = 45 + 80 * np.exp(-t * 25)
    out["thud"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10) + 0.25 * lowpass(band_noise(0.45, 40, 900), 500) * np.exp(-t * 18)

    # Chime: bell partials, little arpeggio (logo, banner)
    d = 2.2
    chime = np.zeros(int(d * SR))
    for i, note in enumerate(["C6", "E6", "G6", "C7"]):
        t = t_axis(d - i * 0.09)
        bell = sum(np.sin(2 * np.pi * hz(note) * r * t) * a * np.exp(-t * (2.2 + 1.5 * r)) for r, a in [(1, 1), (2.76, 0.4), (5.4, 0.2)])
        start = int(i * 0.09 * SR)
        chime[start : start + len(bell)] += bell * np.minimum(1, t / 0.003)
    out["chime"] = chime

    # Horn: friendly two-tone beep-beep
    horn = np.zeros(int(0.62 * SR))
    for start in (0.0, 0.3):
        t = t_axis(0.22)
        tone = sum(np.sign(np.sin(2 * np.pi * f0 * t)) for f0 in (392, 494)) * 0.5
        tone = lowpass(tone, 1800) * np.minimum(1, t / 0.01) * np.minimum(1, (0.22 - t) / 0.03)
        i = int(start * SR)
        horn[i : i + len(tone)] += tone
    out["horn"] = horn

    # Engine: low rumble with a slow throb, fades out (van arriving)
    d = 1.8
    t = t_axis(d)
    rumble = lowpass(band_noise(d, 30, 400), 220) + 0.5 * np.sin(2 * np.pi * 55 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
    out["engine"] = rumble * np.minimum(1, t / 0.2) * np.minimum(1, (d - t) / 0.8)

    # Factory hum with soft mechanical ticks
    d = 3.0
    t = t_axis(d)
    hum = np.sin(2 * np.pi * 110 * t) * 0.4 + np.sin(2 * np.pi * 165 * t) * 0.2 + lowpass(band_noise(d, 60, 600), 300) * 0.4
    for k in range(int(d / 0.5)):
        i = int((0.25 + k * 0.5) * SR)
        tick = band_noise(0.04, 1500, 5000) * np.exp(-t_axis(0.04) * 90) * 0.5
        hum[i : i + len(tick)] += tick[: len(hum) - i]
    out["hum"] = hum * np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.8)

    # Water drop: rising bloop
    t = t_axis(0.16)
    f = 380 + 1200 * (t / 0.16) ** 2
    out["drop"] = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * np.minimum(1, t / 0.004)

    # Birds: a few quick FM chirps
    d = 1.6
    birds = np.zeros(int(d * SR))
    for start, f0 in [(0.0, 3200), (0.18, 3800), (0.5, 3400), (0.66, 4100), (1.05, 3600)]:
        t = t_axis(0.11)
        f = f0 + 900 * np.sin(np.pi * t / 0.11)
        chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.11) ** 2
        i = int(start * SR)
        birds[i : i + len(chirp)] += chirp
    out["birds"] = birds

    return {k: v / (np.abs(v).max() + 1e-9) * 0.9 for k, v in out.items()}


def write_mp3(audio: np.ndarray, target: Path, loudness: float) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
        sf.write(wav.name, audio.astype(np.float32), SR)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name, "-af", f"loudnorm=I={loudness}:TP=-1.5:LRA=11",
             "-ar", "44100", "-ac", "1", "-b:a", "160k", str(target)],
            check=True,
        )
    print(f"{target.relative_to(ROOT)}  {len(audio) / SR:.2f}s")


def main() -> None:
    for name, stem in music().items():
        # Two passes of the loop per file, so a normal-length section never needs to loop at runtime
        write_mp3(np.tile(stem, 2), ROOT / "public" / "music" / f"{name}.mp3", -18)
    for name, sound in sfx().items():
        write_mp3(sound, ROOT / "public" / "sfx" / f"{name}.mp3", -16)


if __name__ == "__main__":
    main()
