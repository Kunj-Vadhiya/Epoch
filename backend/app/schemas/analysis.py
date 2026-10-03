"""Direct URL and Analysis Schemas for DeepTrust AI.
"""

from typing import Optional
from pydantic import BaseModel, Field


class UrlAnalysisRequest(BaseModel):
    url: str = Field(..., description="Direct HTTP or HTTPS video URL to analyze")


class UrlAnalysisResponse(BaseModel):
    job_id: str
    status: str
    message: str = "Video analysis job enqueued successfully."
