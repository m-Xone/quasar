import os
import tempfile
from pathlib import Path
from typing import Optional, Dict
import yt_dlp
from urllib.parse import urlparse, parse_qs


class YouTubeService:
    """Service for downloading videos from YouTube"""

    def __init__(self):
        """Initialize YouTube service"""
        self.temp_dir = Path(tempfile.gettempdir()) / "video_summarizer" / "youtube"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def validate_youtube_url(self, url: str) -> tuple[bool, Optional[str]]:
        """
        Validate if URL is a valid YouTube URL.

        Args:
            url: URL to validate

        Returns:
            tuple: (is_valid, error_message)
        """
        try:
            parsed = urlparse(url)

            # Check for youtube.com or youtu.be domains
            valid_domains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']

            if parsed.netloc not in valid_domains:
                return False, "URL must be from YouTube (youtube.com or youtu.be)"

            # For youtube.com, check for video ID in query params or path
            if 'youtube.com' in parsed.netloc:
                # Check for /watch?v= format
                if '/watch' in parsed.path:
                    query_params = parse_qs(parsed.query)
                    if 'v' not in query_params:
                        return False, "Invalid YouTube URL format (missing video ID)"
                # Check for /embed/ or /v/ format
                elif not any(x in parsed.path for x in ['/embed/', '/v/', '/shorts/']):
                    return False, "Invalid YouTube URL format"

            # For youtu.be, video ID should be in path
            elif 'youtu.be' in parsed.netloc:
                if len(parsed.path) <= 1:
                    return False, "Invalid YouTube short URL format"

            return True, None

        except Exception as e:
            return False, f"Invalid URL format: {str(e)}"

    def get_video_info(self, url: str) -> Dict:
        """
        Get video information without downloading.

        Args:
            url: YouTube video URL

        Returns:
            Dictionary with video metadata
        """
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                return {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration', 0),
                    'uploader': info.get('uploader', 'Unknown'),
                    'upload_date': info.get('upload_date', 'Unknown'),
                    'view_count': info.get('view_count', 0),
                    'description': info.get('description', ''),
                    'thumbnail': info.get('thumbnail', ''),
                }

        except Exception as e:
            raise Exception(f"Failed to get video info: {str(e)}")

    def download_video(self, url: str, max_file_size_mb: int = 500) -> tuple[str, Dict]:
        """
        Download video from YouTube.

        Args:
            url: YouTube video URL
            max_file_size_mb: Maximum file size in MB (default 500MB)

        Returns:
            tuple: (path_to_downloaded_file, video_metadata)

        Raises:
            Exception if download fails
        """
        # Validate URL first
        is_valid, error_msg = self.validate_youtube_url(url)
        if not is_valid:
            raise ValueError(error_msg)

        # Generate output path
        output_template = str(self.temp_dir / '%(id)s.%(ext)s')

        # Configure yt-dlp options optimized for speed
        ydl_opts = {
            # Prioritize pre-merged formats (fastest - single file, no merging needed)
            # Then progressive formats, then formats requiring merge
            'format': (
                # Pre-merged 720p (FASTEST - single file download)
                'best[height<=720][ext=mp4][protocol^=http]/'
                'best[height<=720][ext=mp4]/'
                'best[height<=720]/'
                # Progressive MP4 with audio (fast - no fragments)
                'bestvideo[height<=720][ext=mp4][protocol^=http]+bestaudio[ext=m4a][protocol^=http]/'
                # Any progressive 720p (no fragments)
                'bestvideo[height<=720][protocol^=http]+bestaudio[protocol^=http]/'
                # Fallback: formats requiring merge (slower)
                'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/'
                'bestvideo[height<=720]+bestaudio/'
                # Last resort
                'bestvideo[protocol^=http]+bestaudio[protocol^=http]/'
                'best'
            ),
            'outtmpl': output_template,
            'quiet': False,
            'no_warnings': False,
            'extract_flat': False,
            'merge_output_format': 'mp4',
            # Don't use external downloader by default (native is faster for HTTP)
            # FFmpeg only used for merging and conversion when needed
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }],
            # Speed optimizations
            'concurrent_fragment_downloads': 4,  # Download fragments in parallel
            'http_chunk_size': 10485760,  # 10MB chunks for faster downloads
            'retries': 3,  # Reduce retries (was 10)
            'fragment_retries': 3,  # Reduce fragment retries (was 10)
            'skip_unavailable_fragments': True,
        }

        try:
            print(f"Downloading video from YouTube: {url}")

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Extract info and download
                info = ydl.extract_info(url, download=True)

                # Get the downloaded file path
                downloaded_file = ydl.prepare_filename(info)

                # Check if file exists
                if not os.path.exists(downloaded_file):
                    raise Exception(f"Downloaded file not found: {downloaded_file}")

                # Get file size
                file_size = os.path.getsize(downloaded_file)

                # Check if file is empty or too small (HLS fragment failure)
                if file_size < 1024:  # Less than 1KB
                    print(f"WARNING: Downloaded file is empty or too small ({file_size} bytes)")
                    print("This usually means HLS fragments failed. Retrying with simpler format...")

                    # Clean up the empty file
                    try:
                        os.remove(downloaded_file)
                    except:
                        pass

                    # Retry with simpler, more reliable format (lower quality)
                    fallback_opts = ydl_opts.copy()
                    # Prioritize pre-merged for speed
                    fallback_opts['format'] = 'best[height<=480][protocol^=http]/best[height<=480]/worst'

                    print("Retrying with lower quality format (480p or lower)...")
                    with yt_dlp.YoutubeDL(fallback_opts) as ydl_fallback:
                        info = ydl_fallback.extract_info(url, download=True)
                        downloaded_file = ydl_fallback.prepare_filename(info)

                        if not os.path.exists(downloaded_file):
                            raise Exception("Fallback download also failed - file not found")

                        file_size = os.path.getsize(downloaded_file)

                        if file_size < 1024:
                            raise Exception(
                                "Unable to download this video. All fragments are unavailable. "
                                "This video may only be available in HLS format with broken fragments. "
                                "Try a different YouTube video."
                            )

                        print(f"Fallback download succeeded: {file_size / (1024*1024):.2f} MB")

                print(f"Video downloaded successfully: {downloaded_file}")
                print(f"File size: {file_size / (1024*1024):.2f} MB")

                # Prepare metadata
                metadata = {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration', 0),
                    'uploader': info.get('uploader', 'Unknown'),
                    'file_size': file_size,
                    'filename': os.path.basename(downloaded_file),
                    'source': 'youtube',
                    'url': url
                }

                return downloaded_file, metadata

        except yt_dlp.utils.DownloadError as e:
            error_msg = str(e)
            if "The downloaded file is empty" in error_msg or "fragment" in error_msg.lower():
                raise Exception(
                    "YouTube download failed: All video fragments are unavailable. "
                    "This video cannot be downloaded. Try a different YouTube video."
                )
            raise Exception(f"YouTube download failed: {error_msg}")
        except Exception as e:
            raise Exception(f"Failed to download video: {str(e)}")

    def cleanup(self, file_path: str) -> None:
        """
        Clean up downloaded file.

        Args:
            file_path: Path to file to delete
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Cleaned up YouTube video: {file_path}")
        except Exception as e:
            print(f"Error cleaning up file: {e}")

    def cleanup_all(self) -> None:
        """Clean up all downloaded files in temp directory"""
        try:
            if self.temp_dir.exists():
                for file in self.temp_dir.glob('*'):
                    if file.is_file():
                        file.unlink()
                print(f"Cleaned up all YouTube downloads in {self.temp_dir}")
        except Exception as e:
            print(f"Error during cleanup: {e}")
