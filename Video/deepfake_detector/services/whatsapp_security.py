"""WhatsApp Webhook Security and Verification.

Implements Meta webhook subscription verification and SHA-256 HMAC payload signature validation.
"""

from typing import Optional, Union
import hmac
import hashlib
from config import settings
from src.utils import setup_logger

logger = setup_logger(__name__)


def verify_webhook_token(
    mode: Optional[str],
    verify_token: Optional[str],
    challenge: Optional[str]
) -> Optional[str]:
    """
    Verifies Meta's GET webhook subscription handshake.
    Returns the challenge string if valid, None otherwise.
    """
    configured_token = settings.WHATSAPP_VERIFY_TOKEN

    if not configured_token:
        logger.warning("WHATSAPP_VERIFY_TOKEN is not configured on the server.")
        return None

    if mode == "subscribe" and verify_token == configured_token:
        logger.info("WhatsApp webhook verified successfully.")
        return challenge

    logger.warning("WhatsApp webhook verification failed: Invalid verify token or mode.")
    return None


def validate_hub_signature(
    raw_body: bytes,
    signature_header: Optional[str],
    app_secret: Optional[str] = None
) -> bool:
    """
    Validates Meta X-Hub-Signature-256 header using SHA-256 HMAC.
    Format: 'sha256=<hash>'
    If app_secret is empty or not configured, validation is skipped (returns True).
    """
    secret = app_secret or settings.META_APP_SECRET
    if not secret:
        # If secret is not configured, skip HMAC check (e.g. initial dev/testing)
        return True

    if not signature_header:
        logger.warning("Missing X-Hub-Signature-256 header.")
        return False

    if not signature_header.startswith("sha256="):
        logger.warning("Malformed X-Hub-Signature-256 header: missing 'sha256=' prefix.")
        return False

    expected_signature = signature_header[len("sha256="):]
    computed_hash = hmac.new(
        key=secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    is_valid = hmac.compare_digest(computed_hash, expected_signature)
    if not is_valid:
        logger.warning("X-Hub-Signature-256 HMAC mismatch. Request rejected.")

    return is_valid
