"""Mirror of src/story.ts timing, shared by the Python scripts. Keep both in sync."""
import math

FPS, T, COVER, INTRO, OUTRO, VO_AT = 30, 18, 45, 90, 180, 42


def vo_end(scene):
    c = scene.get("captions") or []
    return c[-1]["end"] if c else 0


def scene_frames(scene):
    return max(9 * FPS, VO_AT + math.ceil(vo_end(scene) * FPS) + 24)


def timeline(sb):
    lens = [scene_frames(s) for s in sb["scenes"]]
    at = (COVER - T if sb.get("cover") else 0) + INTRO - T
    starts = []
    for n in lens:
        starts.append(at)
        at += n - T
    return {"lens": lens, "starts": starts, "outro_start": at, "total": at + OUTRO}
