import os
import tempfile
from pathlib import Path
from typing import Optional
import ffmpeg


ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'}
MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2GB


def validate_video_file(filename: str, file_size: int) -> tuple[bool, Optional[str]]:
    """
    Validate video file by extension and size.

    Returns:
        tuple: (is_valid, error_message)
    """
    file_ext = Path(filename).suffix.lower()

    if file_ext not in ALLOWED_VIDEO_EXTENSIONS:
        return False, f"Invalid file type. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"

    if file_size > MAX_FILE_SIZE:
        return False, f"File size exceeds maximum allowed size of 2GB"

    return True, None


def get_video_duration(video_path: str) -> Optional[float]:
    """
    Get video duration in seconds using ffmpeg.

    Args:
        video_path: Path to video file

    Returns:
        Duration in seconds, or None if unable to determine
    """
    try:
        probe = ffmpeg.probe(video_path)
        duration = float(probe['format']['duration'])
        return duration
    except Exception as e:
        print(f"Error getting video duration: {e}")
        return None


def create_temp_video_path(filename: str) -> str:
    """
    Create a temporary path for storing uploaded video.

    Args:
        filename: Original filename

    Returns:
        Path to temporary file
    """
    temp_dir = tempfile.gettempdir()
    video_dir = Path(temp_dir) / "video_summarizer"
    video_dir.mkdir(exist_ok=True)

    # Use original filename with timestamp to avoid conflicts
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{Path(filename).name}"

    return str(video_dir / safe_filename)


def cleanup_video_file(video_path: str) -> None:
    """
    Clean up temporary video file.

    Args:
        video_path: Path to video file to delete
    """
    try:
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"Cleaned up video file: {video_path}")
    except Exception as e:
        print(f"Error cleaning up video file: {e}")


def extract_frame_at_timestamp(video_path: str, timestamp: float, output_path: str) -> bool:
    """
    Extract a single frame from video at specified timestamp.

    Args:
        video_path: Path to video file
        timestamp: Time in seconds
        output_path: Path to save extracted frame

    Returns:
        True if successful, False otherwise
    """
    try:
        (
            ffmpeg
            .input(video_path, ss=timestamp)
            .output(output_path, vframes=1, format='image2', vcodec='png')
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True, quiet=True)
        )
        return True
    except ffmpeg.Error as e:
        print(f"Error extracting frame: {e.stderr.decode()}")
        return False
