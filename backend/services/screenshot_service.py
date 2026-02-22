import re
import subprocess
import base64
import asyncio
import tempfile
from pathlib import Path
from typing import List, Dict, Tuple


class ScreenshotService:
    """Service for extracting screenshots from videos at key moments"""

    def __init__(self):
        """Initialize screenshot service"""
        self.temp_dir = Path(tempfile.gettempdir()) / "video_summarizer" / "screenshots"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def extract_timestamps(self, summary_text: str) -> List[Dict]:
        """
        Extract timestamps from markdown summary.

        Looks for patterns like:
        - **[0:45]**
        - **Timestamp: 1:30**
        - [2:15]
        - 0:45 -

        Args:
            summary_text: The markdown summary text

        Returns:
            List of dicts with timestamp info
        """
        timestamps = []

        # Pattern 1: **[MM:SS]** - Most explicit format
        pattern1 = r'\*\*\[(\d+):(\d+)\]\*\*\s*-?\s*([^\n]*)'

        # Pattern 2: **Timestamp: MM:SS** or **MM:SS**
        pattern2 = r'\*\*(?:Timestamp:\s*)?(\d+):(\d+)\*\*\s*-?\s*([^\n]*)'

        # Pattern 3: [MM:SS] without bold
        pattern3 = r'\[(\d+):(\d+)\]\s*-?\s*([^\n]*)'

        # Pattern 4: Just MM:SS at start of line
        pattern4 = r'^(\d+):(\d+)\s*-?\s*([^\n]*)'

        for pattern in [pattern1, pattern2, pattern3, pattern4]:
            flags = re.MULTILINE if pattern == pattern4 else 0
            for match in re.finditer(pattern, summary_text, flags):
                minutes = match.group(1)
                seconds = match.group(2)
                description = match.group(3) if len(match.groups()) > 2 else ""

                timestamp_seconds = int(minutes) * 60 + int(seconds)
                time_string = f"{minutes}:{seconds}"

                # Avoid duplicates
                if not any(ts['time_seconds'] == timestamp_seconds for ts in timestamps):
                    timestamps.append({
                        'time_seconds': timestamp_seconds,
                        'time_string': time_string,
                        'description': description.strip(),
                        'position': match.start(),
                        'match_text': match.group(0)
                    })

        # Sort by timestamp
        timestamps.sort(key=lambda x: x['time_seconds'])

        return timestamps

    async def extract_screenshot(
        self,
        video_path: str,
        timestamp_seconds: int,
        width: int = 800
    ) -> str:
        """
        Extract a high-quality screenshot at specific timestamp using FFmpeg.

        Args:
            video_path: Path to video file
            timestamp_seconds: Timestamp in seconds
            width: Width in pixels (height auto-calculated to maintain aspect ratio)

        Returns:
            Base64-encoded JPEG image

        Raises:
            Exception if FFmpeg fails
        """
        output_file = self.temp_dir / f"screenshot_{timestamp_seconds}_{id(self)}.jpg"

        # FFmpeg command - optimized for smaller file size while maintaining quality
        cmd = [
            'ffmpeg',
            '-ss', str(timestamp_seconds),     # Seek to timestamp
            '-i', video_path,                   # Input video
            '-vframes', '1',                    # Extract 1 frame
            '-vf', f'scale={width}:-1',        # Scale width, maintain aspect ratio
            '-q:v', '5',                        # Balanced quality (5 = good quality, smaller size)
            '-y',                               # Overwrite if exists
            str(output_file)
        ]

        try:
            # Run FFmpeg in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: subprocess.run(
                    cmd,
                    check=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
            )

            # Check if file was created
            if not output_file.exists():
                raise Exception(f"Screenshot file not created at {output_file}")

            # Convert to base64 for inline embedding
            with open(output_file, 'rb') as f:
                image_data = f.read()

            # Log file size for debugging
            print(f"  Screenshot file size: {len(image_data) / 1024:.1f} KB")

            base64_image = base64.b64encode(image_data).decode('utf-8')
            print(f"  Base64 length: {len(base64_image)} chars")

            # Verify base64 is valid
            if len(base64_image) < 100:
                raise Exception(f"Base64 data too short ({len(base64_image)} chars), image might be corrupted")

            # Cleanup file
            output_file.unlink()

            return base64_image

        except subprocess.CalledProcessError as e:
            error_msg = f"FFmpeg error: {e.stderr}"
            print(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            if output_file.exists():
                output_file.unlink()
            raise

    def enhance_markdown_with_screenshots(
        self,
        summary_text: str,
        screenshots: Dict[str, str]  # {time_string: base64_data}
    ) -> str:
        """
        Insert screenshot images into markdown after each timestamp.

        Args:
            summary_text: Original markdown summary
            screenshots: Dict mapping time strings to base64 image data

        Returns:
            Enhanced markdown with embedded images
        """
        if not screenshots:
            return summary_text

        # Split summary into lines
        lines = summary_text.split('\n')
        new_lines = []

        # Track which timestamps we've already processed
        processed_timestamps = set()

        # Process each line once
        for i, line in enumerate(lines):
            new_lines.append(line)

            # Check if this line contains any unprocessed timestamps
            for time_str, base64_data in screenshots.items():
                if time_str in processed_timestamps:
                    continue

                # Match the format: **[M:SS]**
                pattern = f'**[{time_str}]**'

                # Check if this exact pattern matches this line
                if pattern in line:
                    # Check if this is part of a list item
                    stripped = line.lstrip()
                    is_list_item = stripped.startswith(('-', '*', '•')) or (len(stripped) > 0 and stripped[0].isdigit() and '.' in stripped[:4])

                    # Get the indentation of the current line
                    indent = len(line) - len(stripped)
                    indent_str = ' ' * (indent + 2)  # Add 2 extra spaces for list continuation

                    print(f"  Inserting screenshot for {time_str} after line {i} (list_item={is_list_item})")

                    if is_list_item:
                        # Insert as indented continuation of the list item (preserves list structure)
                        new_lines.append('')
                        new_lines.append(f'{indent_str}![Screenshot at {time_str}](data:image/jpeg;base64,{base64_data})')
                        new_lines.append(f'{indent_str}*Screenshot captured at {time_str}*')
                        new_lines.append('')
                    else:
                        # Standalone line - insert normally
                        if i + 1 < len(lines) and lines[i + 1].strip():
                            new_lines.append('')
                        new_lines.append(f'![Screenshot at {time_str}](data:image/jpeg;base64,{base64_data})')
                        new_lines.append(f'*Screenshot captured at {time_str}*')
                        if i + 1 < len(lines) and lines[i + 1].strip():
                            new_lines.append('')

                    processed_timestamps.add(time_str)
                    break  # Found this timestamp, move to next line

        enhanced = '\n'.join(new_lines)

        print(f"  Processed {len(processed_timestamps)} timestamps")
        return enhanced

    async def process_video_with_screenshots(
        self,
        video_path: str,
        summary_text: str,
        max_screenshots: int = 5
    ) -> Tuple[str, int]:
        """
        Extract screenshots and enhance markdown.

        Args:
            video_path: Path to video file
            summary_text: Original markdown summary
            max_screenshots: Maximum number of screenshots to extract

        Returns:
            Tuple of (enhanced_markdown, num_screenshots_extracted)
        """
        # 1. Parse timestamps
        timestamps = self.extract_timestamps(summary_text)

        if not timestamps:
            print("No timestamps found in summary")
            return summary_text, 0

        print(f"Found {len(timestamps)} timestamps in summary")

        # Limit to max_screenshots (keep the most evenly distributed)
        if len(timestamps) > max_screenshots:
            step = len(timestamps) / max_screenshots
            timestamps = [timestamps[int(i * step)] for i in range(max_screenshots)]

        print(f"Extracting {len(timestamps)} screenshots from video at: {[ts['time_string'] for ts in timestamps]}")

        # 2. Extract screenshots in parallel
        screenshot_tasks = []
        for ts in timestamps:
            task = self.extract_screenshot(video_path, ts['time_seconds'])
            screenshot_tasks.append((ts['time_string'], task))

        # Wait for all extractions with individual error handling
        screenshots = {}
        results = await asyncio.gather(
            *[task for _, task in screenshot_tasks],
            return_exceptions=True
        )

        for (time_str, _), result in zip(screenshot_tasks, results):
            if isinstance(result, Exception):
                print(f"Failed to extract screenshot at {time_str}: {result}")
                # Continue without this screenshot
            else:
                screenshots[time_str] = result
                print(f"✓ Extracted screenshot at {time_str}")

        # 3. Enhance markdown with screenshots
        if screenshots:
            enhanced = self.enhance_markdown_with_screenshots(summary_text, screenshots)
            print(f"Enhanced markdown with {len(screenshots)} screenshots")

            # Log sizes for debugging
            original_size = len(summary_text)
            enhanced_size = len(enhanced)
            print(f"Original summary size: {original_size} chars, Enhanced size: {enhanced_size} chars")

            # Verify markdown structure isn't broken
            if '![Screenshot' in enhanced:
                print(f"✓ Screenshots successfully inserted into markdown")
            else:
                print(f"⚠ Warning: Screenshot markdown tags not found in enhanced summary")

            return enhanced, len(screenshots)
        else:
            print("No screenshots were successfully extracted")
            return summary_text, 0

    def cleanup_all(self):
        """Clean up all screenshot files in temp directory"""
        try:
            if self.temp_dir.exists():
                for file in self.temp_dir.glob('*.jpg'):
                    if file.is_file():
                        file.unlink()
                print(f"Cleaned up screenshots in {self.temp_dir}")
        except Exception as e:
            print(f"Error during screenshot cleanup: {e}")
