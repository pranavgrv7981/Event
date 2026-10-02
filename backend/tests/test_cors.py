"""Development CORS policy and OpenAPI availability."""

import asyncio

import httpx

from app.main import app


def test_cors_allows_local_vite_origins_and_openapi_remains_available() -> None:
    async def requests() -> tuple[list[httpx.Response], httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            allowed = []
            for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
                allowed.append(
                    await client.options(
                        "/events",
                        headers={
                            "Origin": origin,
                            "Access-Control-Request-Method": "GET",
                        },
                    )
                )
            denied = await client.options(
                "/events",
                headers={
                    "Origin": "http://example.com",
                    "Access-Control-Request-Method": "GET",
                },
            )
            openapi = await client.get(
                "/openapi.json", headers={"Origin": "http://localhost:5173"}
            )
            return allowed, denied, openapi

    allowed, denied, openapi = asyncio.run(requests())

    assert [response.status_code for response in allowed] == [200, 200]
    assert [response.headers["access-control-allow-origin"] for response in allowed] == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers
    assert openapi.status_code == 200
    assert "/events" in openapi.json()["paths"]
    assert openapi.headers["access-control-allow-origin"] == "http://localhost:5173"
