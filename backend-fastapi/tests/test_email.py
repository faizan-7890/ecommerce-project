import smtplib

import pytest

from services import email as email_service


class FakeSMTP:
    """Stands in for smtplib.SMTP / SMTP_SSL and records what the code did with it."""
    instances: list["FakeSMTP"] = []
    fail_with: Exception | None = None

    def __init__(self, host, port, timeout=None):
        self.host, self.port = host, port
        self.started_tls = False
        self.logged_in_as = None
        self.sent = []
        FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self):
        self.started_tls = True

    def login(self, user, password):
        self.logged_in_as = (user, password)

    def send_message(self, msg):
        if FakeSMTP.fail_with:
            raise FakeSMTP.fail_with
        self.sent.append(msg)


@pytest.fixture
def fake_smtp(monkeypatch):
    FakeSMTP.instances = []
    FakeSMTP.fail_with = None
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTP)
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "shop@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-password")
    return FakeSMTP


def test_without_smtp_host_nothing_is_sent(monkeypatch):
    monkeypatch.setattr(smtplib, "SMTP", lambda *a, **k: pytest.fail("must not connect"))
    assert email_service.send_email("a@example.com", "Hi", "Body") is False


def test_sends_over_starttls_with_login_and_html_alternative(fake_smtp):
    assert email_service.send_email("a@example.com", "Hi", "Plain body", "<p>Rich body</p>") is True

    server = fake_smtp.instances[0]
    assert (server.host, server.port) == ("smtp.example.com", 587)
    assert server.started_tls
    assert server.logged_in_as == ("shop@example.com", "app-password")
    msg = server.sent[0]
    assert msg["To"] == "a@example.com"
    assert msg["From"] == "shop@example.com"  # SMTP_FROM falls back to the login user
    assert msg.get_body(("plain",)).get_content().strip() == "Plain body"
    assert "Rich body" in msg.get_body(("html",)).get_content()


def test_port_465_uses_implicit_tls_without_starttls(fake_smtp, monkeypatch):
    monkeypatch.setenv("SMTP_PORT", "465")
    email_service.send_email("a@example.com", "Hi", "Body")
    assert not fake_smtp.instances[0].started_tls


def test_starttls_can_be_disabled_for_local_catchers(fake_smtp, monkeypatch):
    monkeypatch.setenv("SMTP_PORT", "1025")
    monkeypatch.setenv("SMTP_STARTTLS", "false")
    email_service.send_email("a@example.com", "Hi", "Body")
    assert not fake_smtp.instances[0].started_tls


def test_delivery_failure_is_reported_not_raised(fake_smtp):
    fake_smtp.fail_with = smtplib.SMTPRecipientsRefused({"a@example.com": (550, b"no such user")})
    assert email_service.send_email("a@example.com", "Hi", "Body") is False


def test_placeholder_clerk_addresses_are_skipped(fake_smtp):
    assert email_service.send_email("user_2abc@user.clerk", "Hi", "Body") is False
    assert fake_smtp.instances == []
