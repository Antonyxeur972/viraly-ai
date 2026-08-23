from __future__ import annotations

import base64
import json
import subprocess
import tempfile
from pathlib import Path

from fastapi import HTTPException, UploadFile


def as_data_url(data: bytes, content_type: str) -> str:
    return f"data:{content_type};base64,{base64.b64encode(data).decode('ascii')}"


async def read_upload(upload: UploadFile, max_bytes: int) -> bytes:
    data = await upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, "Fichier trop volumineux.")
    return data


def image_item(data: bytes, content_type: str, detail: str = "high") -> dict[str, str]:
    return {
        "type": "input_image",
        "image_url": as_data_url(data, content_type),
        "detail": detail,
    }


def video_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)
        ],
        capture_output=True,
        check=True,
        text=True,
        timeout=20,
    )
    payload = json.loads(result.stdout)
    return max(float(payload.get("format", {}).get("duration", 0)), 1.0)


def extract_video_assets(data: bytes, suffix: str, max_frames: int = 8) -> tuple[list[bytes], str | None]:
    with tempfile.TemporaryDirectory(prefix="viraly-video-") as directory:
        root = Path(directory)
        video_path = root / f"source{suffix or '.mp4'}"
        frame_pattern = root / "frame-%02d.jpg"
        audio_path = root / "audio.m4a"
        video_path.write_bytes(data)

        try:
            duration = video_duration(video_path)
            interval = max(duration / max_frames, 0.5)
            subprocess.run(
                [
                    "ffmpeg", "-v", "error", "-i", str(video_path),
                    "-vf", f"fps=1/{interval},scale='min(960,iw)':-2", "-frames:v", str(max_frames),
                    "-q:v", "3", str(frame_pattern),
                ],
                capture_output=True,
                check=True,
                timeout=90,
            )
        except (FileNotFoundError, subprocess.SubprocessError, ValueError, json.JSONDecodeError) as error:
            raise HTTPException(422, "Impossible d'extraire des images de cette vidéo.") from error

        try:
            subprocess.run(
                [
                    "ffmpeg", "-v", "error", "-i", str(video_path), "-vn", "-ac", "1",
                    "-ar", "16000", "-c:a", "aac", "-b:a", "64k", str(audio_path),
                ],
                capture_output=True,
                check=True,
                timeout=90,
            )
            audio_copy = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
            audio_copy.write(audio_path.read_bytes())
            audio_copy.close()
            audio_result = audio_copy.name
        except (FileNotFoundError, subprocess.SubprocessError):
            audio_result = None

        frames = [path.read_bytes() for path in sorted(root.glob("frame-*.jpg"))]
        if not frames:
            raise HTTPException(422, "Aucune image exploitable n'a été trouvée dans la vidéo.")
        return frames, audio_result

