import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """Send an OTP code to the provided email via Resend API."""
    resend_api_key = settings.RESEND_API_KEY
    if not resend_api_key:
        logger.warning("RESEND_API_KEY is not set. Cannot send email.")
        return False
        
    # Use onboarding@resend.dev for testing if a custom domain isn't verified yet
    sender = "onboarding@resend.dev"
    
    if purpose == 'reset':
        subject = 'Fleet Tracker - Password Reset OTP'
        html = f"<p>Your password reset OTP code is: <strong>{otp}</strong></p><p>This code will expire in 10 minutes.</p>"
    else:
        subject = 'Fleet Tracker - Login OTP'
        html = f"<p>Your login OTP code is: <strong>{otp}</strong></p><p>This code will expire in 10 minutes.</p>"
        
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": sender,
                "to": [to_email],
                "subject": subject,
                "html": html
            }
        )
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

