from pydantic import BaseModel, HttpUrl
from typing import Optional, List


class YouTubeRequest(BaseModel):
    """Request model for YouTube video analysis"""
    url: HttpUrl


class SummaryChunk(BaseModel):
    """Streaming summary chunk"""
    text: str
    timestamp: Optional[float] = None


class VideoMetadata(BaseModel):
    """Video metadata"""
    filename: str
    duration: Optional[float] = None
    size: Optional[int] = None
    source: str  # "upload" or "youtube"


class PDFRequest(BaseModel):
    """Request model for PDF generation"""
    summary: str
    metadata: VideoMetadata
    screenshots: Optional[List[str]] = []  # Base64 encoded images


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
