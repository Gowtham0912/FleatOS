import httpx
import logging
import base64
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger(__name__)

def _get_gmail_access_token() -> str | None:
    """Exchange the refresh token for a short-lived access token."""
    try:
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                "grant_type": "refresh_token"
            },
            timeout=10.0
        )
        response.raise_for_status()
        return response.json().get("access_token")
    except Exception as e:
        logger.error(f"Failed to refresh Gmail access token: {e}")
        return None

def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """Send an OTP code to the provided email via Gmail REST API."""
    logger.info(f"========== OTP GENERATED ==========")
    logger.info(f"OTP for {to_email}: {otp}")
    logger.info(f"===================================")
    
    if not (settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET and settings.GMAIL_REFRESH_TOKEN):
        logger.warning("Gmail OAuth credentials are not set. Cannot send email.")
        return False
        
    access_token = _get_gmail_access_token()
    if not access_token:
        return False
        
    sender = settings.SMTP_EMAIL
    if not sender:
        logger.warning("SMTP_EMAIL is not set. Using fallback for sender.")
        sender = "fleetos.official@gmail.com"
    
    msg = EmailMessage()
    msg['From'] = sender
    msg['To'] = to_email
    
    if purpose == 'reset':
        msg['Subject'] = 'Fleet Tracker - Password Reset OTP'
        msg.set_content(f"Your password reset OTP code is: {otp}\n\nThis code will expire in 10 minutes.")
    else:
        msg['Subject'] = 'Fleet Tracker - Login OTP'
        msg.set_content(f"Your login OTP code is: {otp}\n\nThis code will expire in 10 minutes.")
        
    # Encode as base64url for Gmail API
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
    
    try:
        response = httpx.post(
            "https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={
                "raw": raw_message
            },
            timeout=10.0
        )
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

