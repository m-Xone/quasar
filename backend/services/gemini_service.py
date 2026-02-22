import os
import asyncio
from typing import AsyncGenerator, Optional, List, Dict
from pathlib import Path
from google import genai
from google.genai import types


class GeminiService:
    """Service for video analysis using Google Gemini API (latest SDK)"""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        Initialize Gemini service with the new google-genai SDK.

        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            model_name: Gemini model to use (defaults to GEMINI_MODEL env var or gemini-2.0-flash-exp)
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")

        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")

        # Initialize the new SDK client
        self.client = genai.Client(api_key=self.api_key)

    def _create_analysis_prompt(self, video_type: str = "general") -> str:
        """
        Create a detailed prompt for video analysis.

        Args:
            video_type: Type of video (general, dashcam, etc.)

        Returns:
            Formatted prompt string
        """
        base_prompt = """Analyze this video and provide a comprehensive, detailed summary that is useful for an information analyst. Structure your response in proper Markdown as follows:

1. **Overview**: A brief 2-3 sentence summary of what this video is about.

2. **Detailed Narrative**: Describe what happens in the video from start to finish. Break this into clear scenes or segments with approximate timestamps. Be specific about:
   - What you see happening
   - Key objects, people, or elements present
   - Actions and events
   - Environment and setting
   - Any text, signs, or readable content

3. **Key Moments**: Identify at least 3, but no more than 15, significant moments of information/analytical value for a geospatial analyst. For each moment, use this EXACT format:

   **[M:SS]** - Description of why this moment is significant

   For example:
   **[0:45]** - Opening scene establishes the main setting
   **[2:30]** - Key action sequence begins

   Choose timestamps where a screenshot would visually represent significant content. A handful of examples are detailed next.

   <examples>
        <example 1>A frame includes a picture of a storefront with views in ingress/egress points and signage.</example 1>
        <example 2>A frame includes a clear view of a transportation station, such as bus, rail, air, or highway interchange, that is potentially useful to someone planning a complex route movement.</example 2>
        <example 3>A frame includes the surroundings of a chokepoint, such as a checkpoint, border crossing, bridge, tunnel, police check, or other strategic location of significance to a traveler.</example 3>
        <example 4>A frame includes indications of security, law enforcement, and/or military personnel, buildings, and/or equipment</example 4>
  </examples>

4. **Notable Elements**: List any particularly interesting or important details:
   - Recurring themes or patterns
   - Technical quality observations
   - Audio or dialogue highlights (if any)
   - Any unique or unusual aspects

Do not include a preamble in your output. 
"""

        if video_type == "dashcam":
            base_prompt += """
Since this appears to be dashcam footage, also include:
- Route description (general direction, turns, notable navigation)
- Road and traffic conditions
- Scenery and environment (urban/suburban/rural, weather, time of day)
- Street signs, landmarks, and intersections
- Points of interest along the route
- Driving behavior observations
"""

        base_prompt += """
Format your response in a clear, concise narrative style with markdown formatting. Use headers, bullet points, and bold text to organize information effectively.

Be thorough but concise. Focus on what's actually visible and happening in the video. Do not include a preamble in your response; cut to the chase.
"""

        return base_prompt

    async def upload_video(self, video_path: str):
        """
        Upload video file to Gemini API using the new SDK.

        Args:
            video_path: Path to video file

        Returns:
            Uploaded file object

        Raises:
            Exception if upload fails
        """
        try:
            print(f"Uploading video to Gemini: {video_path}")

            # Upload the file using the new SDK
            video_file = self.client.files.upload(file=video_path)

            print(f"Video uploaded successfully: {video_file.name}")

            # Check if we need to wait for processing
            # The new SDK may handle this automatically, but we'll add a small wait
            # to ensure the file is ready
            await asyncio.sleep(2)

            # Try to get the file to verify it's ready
            try:
                file_info = self.client.files.get(name=video_file.name)
                print(f"File state: {file_info.state if hasattr(file_info, 'state') else 'ready'}")

                # If there's a state field and it's processing, wait for it
                if hasattr(file_info, 'state') and file_info.state == 'PROCESSING':
                    print("Waiting for video to be processed...")
                    max_wait = 60  # Maximum 60 seconds
                    waited = 0
                    while waited < max_wait:
                        await asyncio.sleep(3)
                        waited += 3
                        file_info = self.client.files.get(name=video_file.name)
                        if not hasattr(file_info, 'state') or file_info.state != 'PROCESSING':
                            break
                    print("Video processing complete")
            except Exception as e:
                # If we can't get file info, assume it's ready
                print(f"Could not verify file status (this is okay): {e}")

            return video_file

        except Exception as e:
            raise Exception(f"Failed to upload video to Gemini: {str(e)}")

    async def analyze_video_stream(
        self,
        video_path: str,
        video_type: str = "general"
    ) -> AsyncGenerator[str, None]:
        """
        Analyze video and stream the response using the new SDK.

        Args:
            video_path: Path to video file
            video_type: Type of video for specialized prompts

        Yields:
            Text chunks as they are generated
        """
        uploaded_file = None
        try:
            # Upload video
            uploaded_file = await self.upload_video(video_path)

            # Create prompt
            prompt = self._create_analysis_prompt(video_type)

            # Generate content with streaming using the new SDK
            print("Starting video analysis with streaming...")

            # Create config
            config = types.GenerateContentConfig(
                temperature=0.7,
                top_p=0.95,
                top_k=40,
                max_output_tokens=8192,
            )

            # Use async streaming with the new SDK
            # First await to get the stream, then iterate over it
            stream = await self.client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=[uploaded_file, prompt],
                config=config
            )

            async for chunk in stream:
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text

            print("Video analysis complete")

        except Exception as e:
            error_msg = f"Error during video analysis: {str(e)}"
            print(error_msg)
            yield f"\n\n**Error**: {error_msg}"

        finally:
            # Clean up uploaded file
            if uploaded_file:
                try:
                    self.client.files.delete(name=uploaded_file.name)
                    print(f"Cleaned up uploaded file: {uploaded_file.name}")
                except Exception as e:
                    print(f"Warning: Failed to delete uploaded file: {e}")

    async def analyze_video(self, video_path: str, video_type: str = "general") -> str:
        """
        Analyze video and return complete response (non-streaming).

        Args:
            video_path: Path to video file
            video_type: Type of video for specialized prompts

        Returns:
            Complete analysis text
        """
        full_response = ""
        async for chunk in self.analyze_video_stream(video_path, video_type):
            full_response += chunk

        return full_response

    def extract_key_moments(self, summary_text: str) -> List[Dict[str, any]]:
        """
        Parse summary text to extract key moments with timestamps.

        Args:
            summary_text: The generated summary text

        Returns:
            List of key moments with timestamps
        """
        # This is a simple implementation that looks for timestamp patterns
        # In a production system, you might want to ask Gemini to format
        # timestamps in a specific way (e.g., [MM:SS] or JSON)

        key_moments = []

        # Look for common timestamp patterns
        import re
        # Pattern: "0:30", "1:45", "00:30", "01:45", etc.
        timestamp_pattern = r'(\d{1,2}:\d{2})'

        lines = summary_text.split('\n')
        for line in lines:
            matches = re.findall(timestamp_pattern, line)
            for match in matches:
                # Convert MM:SS to seconds
                parts = match.split(':')
                if len(parts) == 2:
                    minutes, seconds = int(parts[0]), int(parts[1])
                    total_seconds = minutes * 60 + seconds

                    key_moments.append({
                        'timestamp': total_seconds,
                        'time_string': match,
                        'description': line.strip()
                    })

        return key_moments

    async def get_video_description(self, video_path: str) -> str:
        """
        Get a brief description of the video (for metadata).

        Args:
            video_path: Path to video file

        Returns:
            Brief video description
        """
        uploaded_file = None
        try:
            uploaded_file = await self.upload_video(video_path)

            prompt = "Provide a brief 1-2 sentence description of what this video shows."

            # Use async generate_content with new SDK
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=[uploaded_file, prompt]
            )

            return response.text

        except Exception as e:
            return f"Video analysis (error: {str(e)})"

        finally:
            # Clean up
            if uploaded_file:
                try:
                    self.client.files.delete(name=uploaded_file.name)
                except:
                    pass
