"""Direct Analysis Request and Normalized Result Schemas."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, HttpUrl, Field


class UrlAnalysisRequest(BaseModel):
    url: str = Field(..., description="Direct HTTP or HTTPS video URL to analyze")


class UrlAnalysisResponse(BaseModel):
    job_id: str
    status: str
    message: str = "Video analysis job enqueued successfully."
