import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import HTTPException


class GoogleOAuthNetworkErrorTests(unittest.IsolatedAsyncioTestCase):
    async def test_exchange_google_authorization_code_returns_503_on_network_error(self):
        from src.auth.router import exchange_google_authorization_code

        client = AsyncMock()
        client.post.side_effect = httpx.ConnectError("dns failed")
        client_context = AsyncMock()
        client_context.__aenter__.return_value = client

        with patch("src.auth.router.httpx.AsyncClient", return_value=client_context):
            with self.assertRaises(HTTPException) as raised:
                await exchange_google_authorization_code("auth-code")

        self.assertEqual(raised.exception.status_code, 503)

    async def test_fetch_google_token_info_returns_503_on_network_error(self):
        from src.auth.router import fetch_google_token_info

        client = AsyncMock()
        client.get.side_effect = httpx.ConnectError("timeout")
        client_context = AsyncMock()
        client_context.__aenter__.return_value = client

        with patch("src.auth.router.httpx.AsyncClient", return_value=client_context):
            with self.assertRaises(HTTPException) as raised:
                await fetch_google_token_info("id-token")

        self.assertEqual(raised.exception.status_code, 503)
