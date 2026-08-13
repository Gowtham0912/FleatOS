import smtplib
from email.message import EmailMessage
import logging
from app.config import settings

logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """Send an OTP code to the provided email via SMTP."""
    # Hardcoded credentials as requested
    smtp_email = "sgg34877@gmail.com"
    smtp_app_password = "nhfe qkma tfru lywz"
    
    msg = EmailMessage()
    msg['From'] = smtp_email
    msg['To'] = to_email
    
    if purpose == 'reset':
        msg['Subject'] = 'Fleet Tracker - Password Reset OTP'
        msg.set_content(f"Your password reset OTP code is: {otp}\n\nThis code will expire in 10 minutes.")
    else:
        msg['Subject'] = 'Fleet Tracker - Login OTP'
        msg.set_content(f"Your login OTP code is: {otp}\n\nThis code will expire in 10 minutes.")
        
    try:
        # Assuming Gmail SMTP for this setup based on user request
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(smtp_email, smtp_app_password)
            smtp.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False

