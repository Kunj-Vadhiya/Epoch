"""Meta WhatsApp Cloud API Webhook Schemas.

Implements strict validation according to official Meta Graph API Webhook specifications.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class WhatsAppProfile(BaseModel):
    name: Optional[str] = None


class WhatsAppContact(BaseModel):
    wa_id: str
    profile: Optional[WhatsAppProfile] = None


class WhatsAppMetadata(BaseModel):
    display_phone_number: Optional[str] = None
    phone_number_id: str


class WhatsAppMediaObject(BaseModel):
    id: str
    mime_type: Optional[str] = None
    sha256: Optional[str] = None
    caption: Optional[str] = None
    filename: Optional[str] = None


class WhatsAppTextMessage(BaseModel):
    body: str


class WhatsAppMessage(BaseModel):
    id: str
    from_: str = Field(..., alias="from")
    timestamp: str
    type: str  # "video", "text", "image", "audio", "document", etc.
    video: Optional[WhatsAppMediaObject] = None
    image: Optional[WhatsAppMediaObject] = None
    audio: Optional[WhatsAppMediaObject] = None
    text: Optional[WhatsAppTextMessage] = None

    class Config:
        populate_by_name = True


class WhatsAppValue(BaseModel):
    messaging_product: str
    metadata: WhatsAppMetadata
    contacts: Optional[List[WhatsAppContact]] = None
    messages: Optional[List[WhatsAppMessage]] = None
    statuses: Optional[List[Dict[str, Any]]] = None


class WhatsAppChange(BaseModel):
    value: WhatsAppValue
    field: str


class WhatsAppEntry(BaseModel):
    id: str
    changes: List[WhatsAppChange]


class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[WhatsAppEntry]
