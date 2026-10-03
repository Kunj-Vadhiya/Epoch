"""Analysis Job Models and States for DeepTrust AI.
"""

from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class JobState(str, Enum):
    QUEUED = "QUEUED"
    DOWNLOADING = "DOWNLOADING"
    PREPROCESSING = "PREPROCESSING"
    ANALYZING = "ANALYZING"
    GENERATING_REPORT = "GENERATING_REPORT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AnalysisJob(BaseModel):
    job_id: str
    source: str = "telegram"
    whatsapp_message_id: Optional[str] = None
    sender_id: Optional[str] = None
    media_id: Optional[str] = None
    input_url: Optional[str] = None
    status: JobState = JobState.QUEUED
    stage: str = "initialized"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    whatsapp_report: Optional[str] = None
    duration_ms: Optional[int] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobState
    stage: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
