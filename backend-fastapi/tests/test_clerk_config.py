import base64

import pytest

from dependencies import _jwks_url_from_publishable_key


def _pk(kind: str, host: str) -> str:
    # Clerk omits base64 padding in real keys
    return f"pk_{kind}_" + base64.b64encode(f"{host}$".encode()).decode().rstrip("=")


def test_test_key_decodes_to_dev_instance_host():
    pk = _pk("test", "clever-cat-12.clerk.accounts.dev")
    assert _jwks_url_from_publishable_key(pk) == "https://clever-cat-12.clerk.accounts.dev/.well-known/jwks.json"


def test_live_key_decodes_to_custom_domain():
    pk = _pk("live", "clerk.veloce.shop")
    assert _jwks_url_from_publishable_key(pk) == "https://clerk.veloce.shop/.well-known/jwks.json"


@pytest.mark.parametrize("pk", ["", "pk_test_...", "sk_test_abc", "not-a-key"])
def test_placeholder_or_invalid_keys_yield_no_url(pk):
    assert _jwks_url_from_publishable_key(pk) is None
