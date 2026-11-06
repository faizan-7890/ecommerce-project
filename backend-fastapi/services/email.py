"""
Email service — plain SMTP delivery for transactional mail.
Without SMTP_HOST the message is printed instead of sent, so local development
and tests need no mail server. Delivery failures are reported, never raised:
an email problem must not fail the request that triggered it.
"""
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

# Placeholder addresses created by dependencies.get_current_user when Clerk returns no email
_UNDELIVERABLE_SUFFIX = "@user.clerk"


def send_email(to: str, subject: str, text: str, html: Optional[str] = None) -> bool:
    """Send one email. Returns True only if the SMTP server accepted it."""
    if not to or to.endswith(_UNDELIVERABLE_SUFFIX):
        return False

    host = os.getenv("SMTP_HOST", "")
    if not host:
        print(f"[EMAIL] SMTP_HOST not set; would send to {to}: {subject}")
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")

    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM") or user
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        # 465 is implicit TLS; other ports upgrade with STARTTLS unless disabled (e.g. Mailpit on 1025)
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            if os.getenv("SMTP_STARTTLS", "true").lower() != "false":
                server.starttls()
        with server:
            if user:
                server.login(user, password)
            server.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError) as e:
        print(f"[WARN] Email to {to} failed: {e}")
        return False
