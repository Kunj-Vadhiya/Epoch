"""Schemas package."""

from .report import DeepTrustReport, SuspiciousInterval
from .jobs import AnalysisJob, JobState, JobStatusResponse
from .analysis import UrlAnalysisRequest, UrlAnalysisResponse

__all__ = [
    "DeepTrustReport",
    "SuspiciousInterval",
    "AnalysisJob",
    "JobState",
    "JobStatusResponse",
    "UrlAnalysisRequest",
    "UrlAnalysisResponse"
]
