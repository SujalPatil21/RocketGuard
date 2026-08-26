import os
import datetime
import smtplib
import socket
import ssl
import logging
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailNotificationService:
    """
    SMTP Email Notification Service.
    Implements BaseNotificationService using standard smtplib.
    Renders clean, separated HTML email templates using Jinja2.
    """

    def __init__(self):
        # Locate templates folder in project base directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        templates_dir = os.path.join(base_dir, "templates")
        
        # Configure Jinja2 environment to load from templates path
        self.jinja_env = Environment(loader=FileSystemLoader(templates_dir))

    def _send_email(self, recipient_email: str, subject: str, html_content: str, raw_otp_for_dev: str = None) -> bool:
        """
        Sends an email using secure SMTP (TLS).
        """
        # Validate that SMTP credentials are not missing
        if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
            raise ValueError("SMTP configuration is missing. SMTP_EMAIL and SMTP_PASSWORD must be set.")

        logger.info("Email Sending Started")

        logger.info(f"SMTP Host = {settings.SMTP_HOST}")
        logger.info(f"SMTP Port = {settings.SMTP_PORT}")
        logger.info(f"Sender = {settings.SMTP_EMAIL}")
        logger.info(f"Recipient = {recipient_email}")
        logger.info(f"Subject = {subject}")

        gmail_accepted = False
        smtp_response = ""

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_EMAIL
            msg["To"] = recipient_email

            part = MIMEText(html_content, "html")
            msg.attach(part)
            logger.info("MIME Message Generated")
            logger.info(f"MIME Headers: From={msg['From']}, To={msg['To']}, Subject={msg['Subject']}, Content-Type={part.get_content_type()}")

            # Establish secure connection to SMTP server with a 10-second timeout
            # ponytail: context manager automatically closes SMTP connection properly on exit
            logger.info("Connecting to Gmail SMTP")
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                logger.info(f"Connected to {settings.SMTP_HOST}")
                # Set debug level to print SMTP logs to stderr
                server.set_debuglevel(1)
                
                # Start TLS
                logger.info("Starting TLS")
                starttls_code, starttls_msg = server.starttls()
                starttls_msg_str = starttls_msg.decode('utf-8', errors='ignore') if isinstance(starttls_msg, bytes) else starttls_msg
                logger.info(f"SMTP Response (STARTTLS): code={starttls_code}, message={starttls_msg_str}")
                if starttls_code == 220:
                    logger.info("STARTTLS Successful")
                
                # Login
                login_code, login_msg = server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
                login_msg_str = login_msg.decode('utf-8', errors='ignore') if isinstance(login_msg, bytes) else login_msg
                logger.info(f"SMTP Response (LOGIN): code={login_code}, message={login_msg_str}")
                if login_code == 235:
                    logger.info("SMTP Authentication Successful")
                
                # Send email
                logger.info("Calling sendmail()")
                send_errs = server.sendmail(settings.SMTP_EMAIL, recipient_email, msg.as_string())
                logger.info("sendmail() Executed")
                logger.info(f"SMTP Response = {send_errs}")
                
                if send_errs and recipient_email in send_errs:
                    gmail_accepted = False
                    smtp_response = f"Rejected recipient: {send_errs[recipient_email]}"
                    logger.error(f"[EMAIL] Gmail rejected the email for recipient: {send_errs}")
                    raise smtplib.SMTPException(f"Gmail rejected recipient: {send_errs[recipient_email]}")
                else:
                    gmail_accepted = True
                    smtp_response = f"Accepted by SMTP Server (LOGIN: {login_code}, STARTTLS: {starttls_code})"
                    logger.info("Message Accepted by Gmail")
                    logger.info("Email Sent Successfully")

            return True

        except smtplib.SMTPAuthenticationError as e:
            gmail_accepted = False
            err_msg = e.smtp_error.decode('utf-8', errors='ignore') if isinstance(e.smtp_error, bytes) else e.smtp_error
            smtp_response = f"Authentication failed: {e.smtp_code} - {err_msg}"
            logger.error(f"Any SMTP Exception: {smtp_response}")
            traceback.print_exc()
            return False
        except (smtplib.SMTPConnectError, ConnectionRefusedError) as e:
            gmail_accepted = False
            smtp_response = f"Connection failed: {str(e)}"
            logger.error(f"Any SMTP Exception: {smtp_response}")
            traceback.print_exc()
            return False
        except (socket.timeout, TimeoutError) as e:
            gmail_accepted = False
            smtp_response = f"Connection timeout: {str(e)}"
            logger.error(f"Any SMTP Exception: {smtp_response}")
            traceback.print_exc()
            return False
        except ssl.SSLError as e:
            gmail_accepted = False
            smtp_response = f"SSL/TLS handshake failed: {str(e)}"
            logger.error(f"Any SMTP Exception: {smtp_response}")
            traceback.print_exc()
            return False
        except smtplib.SMTPException as e:
            gmail_accepted = False
            smtp_response = f"SMTP protocol error: {str(e)}"
            logger.error(f"Any SMTP Exception: {smtp_response}")
            traceback.print_exc()
            return False
        except Exception as e:
            gmail_accepted = False
            smtp_response = f"Unexpected SMTP error: {str(e)}"
            logger.error(f"Any SMTP Exception: {smtp_response}")
            traceback.print_exc()
            return False
        finally:
            logger.info(f"SMTP Response: {smtp_response}")
            logger.info(f"Whether Gmail accepted the message: {gmail_accepted}")


    def send_registration_otp(self, email: str, username: str, otp: str, expires_in_seconds: int) -> bool:
        try:
            logger.info("Loading registration.html")
            template = self.jinja_env.get_template("registration.html")
            logger.info("Rendering HTML Template")
            html_content = template.render(
                project_name=settings.PROJECT_NAME,
                username=username,
                otp=otp,
                expiry_minutes=expires_in_seconds // 60,
                year=datetime.datetime.now().year
            )
            subject = f"[{settings.PROJECT_NAME}] Verify Your Email Address"
            return self._send_email(email, subject, html_content, raw_otp_for_dev=otp)
        except Exception as e:
            logger.error(f"[EMAIL] Jinja template rendering error for registration: {str(e)}")
            return False

    def send_login_otp(self, email: str, username: str, otp: str, expires_in_seconds: int) -> bool:
        try:
            logger.info("Loading login.html")
            template = self.jinja_env.get_template("login.html")
            logger.info("Rendering HTML Template")
            html_content = template.render(
                project_name=settings.PROJECT_NAME,
                username=username,
                otp=otp,
                expiry_minutes=expires_in_seconds // 60,
                year=datetime.datetime.now().year
            )
            subject = f"[{settings.PROJECT_NAME}] Secure Login Verification Code"
            return self._send_email(email, subject, html_content, raw_otp_for_dev=otp)
        except Exception as e:
            logger.error(f"[EMAIL] Jinja template rendering error for login: {str(e)}")
            return False

    def send_forgot_password_otp(self, email: str, username: str, otp: str, expires_in_seconds: int) -> bool:
        try:
            logger.info("Loading forgot_password.html")
            template = self.jinja_env.get_template("forgot_password.html")
            logger.info("Rendering HTML Template")
            html_content = template.render(
                project_name=settings.PROJECT_NAME,
                username=username,
                otp=otp,
                expiry_minutes=expires_in_seconds // 60,
                year=datetime.datetime.now().year
            )
            subject = f"[{settings.PROJECT_NAME}] Password Reset Code"
            return self._send_email(email, subject, html_content, raw_otp_for_dev=otp)
        except Exception as e:
            logger.error(f"[EMAIL] Jinja template rendering error for forgot password: {str(e)}")
            return False
