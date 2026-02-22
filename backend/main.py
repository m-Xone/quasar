import os
import asyncio
import json
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
import aiofiles
from dotenv import load_dotenv

from models import YouTubeRequest, VideoMetadata, PDFRequest, HealthResponse
from services.gemini_service import GeminiService
from services.youtube_service import YouTubeService
from services.pdf_service_simple import PDFServiceSimple
from services.screenshot_service import ScreenshotService
from utils.video_processing import (
    validate_video_file,
    get_video_duration,
    create_temp_video_path,
    cleanup_video_file,
    MAX_FILE_SIZE
)

# Load environment variables
load_dotenv()

# Initialize services
gemini_service: Optional[GeminiService] = None
youtube_service: Optional[YouTubeService] = None
pdf_service: Optional[PDFServiceSimple] = None
screenshot_service: Optional[ScreenshotService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup services"""
    global gemini_service, youtube_service, pdf_service, screenshot_service

    # Startup
    try:
        gemini_service = GeminiService()
        youtube_service = YouTubeService()
        pdf_service = PDFServiceSimple()
        screenshot_service = ScreenshotService()
        print("Services initialized successfully")
    except Exception as e:
        print(f"Error initializing services: {e}")
        raise

    yield

    # Shutdown
    print("Shutting down services...")
    if youtube_service:
        youtube_service.cleanup_all()
    if screenshot_service:
        screenshot_service.cleanup_all()


# Create FastAPI app
app = FastAPI(
    title="Video Summarizer API",
    description="API for analyzing and summarizing videos using Google Gemini AI",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", version="1.0.0")


@app.post("/api/analyze/upload")
async def analyze_uploaded_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    video_type: str = "general"
):
    """
    Analyze an uploaded video file and stream the summary.

    Args:
        file: Video file to analyze
        video_type: Type of video (general, dashcam, etc.)

    Returns:
        Streaming response with analysis text
    """
    if not gemini_service or not screenshot_service:
        raise HTTPException(status_code=500, detail="Services not initialized")

    # Validate file
    file_size = 0
    temp_path = None

    try:
        # Create temporary file path
        temp_path = create_temp_video_path(file.filename)

        # Save uploaded file
        async with aiofiles.open(temp_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # Read in 1MB chunks
                file_size += len(content)
                if file_size > MAX_FILE_SIZE:
                    cleanup_video_file(temp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024**3):.1f}GB"
                    )
                await out_file.write(content)

        # Validate video file
        is_valid, error_msg = validate_video_file(file.filename, file_size)
        if not is_valid:
            cleanup_video_file(temp_path)
            raise HTTPException(status_code=400, detail=error_msg)

        print(f"Processing uploaded video: {file.filename} ({file_size / (1024**2):.2f} MB)")

        # Stream analysis
        async def generate():
            full_summary = ""
            try:
                # Stream the analysis
                async for chunk in gemini_service.analyze_video_stream(temp_path, video_type):
                    full_summary += chunk
                    # JSON encode to handle newlines and special characters properly
                    yield f"data: {json.dumps(chunk)}\n\n"

                # After streaming completes, extract screenshots
                yield f"data: {json.dumps({'type': 'status', 'message': 'Extracting key moment screenshots...'})}\n\n"

                # Process screenshots
                enhanced_summary, num_screenshots = await screenshot_service.process_video_with_screenshots(
                    temp_path,
                    full_summary,
                    max_screenshots=5
                )

                if num_screenshots > 0:
                    # Send enhanced summary with screenshots
                    yield f"data: {json.dumps({'type': 'enhance', 'content': enhanced_summary})}\n\n"
                    print(f"Enhanced summary with {num_screenshots} screenshots")
                else:
                    print("No screenshots extracted")

                # Send completion signal
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps(f'Error: {str(e)}')}\n\n"
            finally:
                # Cleanup in background
                cleanup_video_file(temp_path)

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        if temp_path:
            cleanup_video_file(temp_path)
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")


@app.post("/api/analyze/youtube")
async def analyze_youtube_video(
    request: YouTubeRequest,
    background_tasks: BackgroundTasks,
    video_type: str = "general"
):
    """
    Download and analyze a YouTube video.

    Args:
        request: YouTube URL request
        video_type: Type of video (general, dashcam, etc.)

    Returns:
        Streaming response with analysis text
    """
    if not gemini_service or not youtube_service or not screenshot_service:
        raise HTTPException(status_code=500, detail="Services not initialized")

    video_path = None

    try:
        # Download video
        print(f"Downloading YouTube video: {request.url}")
        video_path, metadata = youtube_service.download_video(str(request.url))

        print(f"Video downloaded: {video_path}")

        # Stream analysis
        async def generate():
            full_summary = ""
            try:
                # First send metadata (already JSON, so keep as is)
                metadata_json = json.dumps({"type": "metadata", "title": metadata.get('title', 'Unknown')})
                yield f"data: {metadata_json}\n\n"

                # Then stream analysis - JSON encode chunks and accumulate
                async for chunk in gemini_service.analyze_video_stream(video_path, video_type):
                    full_summary += chunk
                    yield f"data: {json.dumps(chunk)}\n\n"

                # After streaming completes, extract screenshots
                yield f"data: {json.dumps({'type': 'status', 'message': 'Extracting key moment screenshots...'})}\n\n"

                # Process screenshots
                enhanced_summary, num_screenshots = await screenshot_service.process_video_with_screenshots(
                    video_path,
                    full_summary,
                    max_screenshots=5
                )

                if num_screenshots > 0:
                    # Send enhanced summary with screenshots
                    yield f"data: {json.dumps({'type': 'enhance', 'content': enhanced_summary})}\n\n"
                    print(f"Enhanced summary with {num_screenshots} screenshots")
                else:
                    print("No screenshots extracted")

                # Send completion signal
                yield f"data: {json.dumps({'type': 'complete'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps(f'Error: {str(e)}')}\n\n"
            finally:
                # Cleanup in background
                if video_path:
                    youtube_service.cleanup(video_path)

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if video_path:
            youtube_service.cleanup(video_path)
        raise HTTPException(status_code=500, detail=f"Error processing YouTube video: {str(e)}")


@app.post("/api/generate-pdf")
async def generate_pdf_report(request: PDFRequest):
    """
    Generate a PDF report from video summary.

    Args:
        request: PDF generation request with summary and metadata

    Returns:
        PDF file as response
    """
    if not pdf_service:
        raise HTTPException(status_code=500, detail="PDF service not initialized")

    try:
        # Prepare metadata for PDF
        metadata_dict = {
            'filename': request.metadata.filename,
            'duration': request.metadata.duration,
            'size': request.metadata.size,
            'source': request.metadata.source
        }

        # Generate PDF
        pdf_bytes = pdf_service.generate_pdf(
            summary=request.summary,
            metadata=metadata_dict,
            screenshots=request.screenshots
        )

        # Generate safe filename
        safe_filename = request.metadata.filename.replace(' ', '_')
        safe_filename = ''.join(c for c in safe_filename if c.isalnum() or c in ('_', '-', '.'))
        pdf_filename = f"summary_{safe_filename}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={pdf_filename}"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Video Summarizer API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "analyze_upload": "/api/analyze/upload",
            "analyze_youtube": "/api/analyze/youtube",
            "generate_pdf": "/api/generate-pdf"
        }
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
