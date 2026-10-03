"""Telegram Inline Keyboards for DeepTrust AI.

Provides interactive buttons for viewing specific evidence, transcripts, OCR,
and full diagnostic details.
"""

from typing import Dict, Any, List


def get_evidence_keyboard(job_id: str) -> Dict[str, Any]:
    """
    Returns an inline keyboard dictionary compatible with Telegram Bot API JSON payload.
    """
    return {
        "inline_keyboard": [
            [
                {"text": "🎬 Evidence", "callback_data": f"evidence:{job_id}"},
                {"text": "📝 Transcript", "callback_data": f"transcript:{job_id}"}
            ],
            [
                {"text": "🔎 OCR Text", "callback_data": f"ocr:{job_id}"},
                {"text": "📊 Full Diagnostics", "callback_data": f"full:{job_id}"}
            ],
            [
                {"text": "🔄 Analyze Again", "callback_data": f"again:{job_id}"}
            ]
        ]
    }
