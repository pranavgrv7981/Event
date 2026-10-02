"""AI impact tests use seeded SQLite data and mocked providers only."""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app import config
from app.database import get_db
from app.integrations.ai.fallback import LocalFallbackProvider
from app.main import app
from app.models import Change
from app.schemas import AIImpactAnalysis, AIImpactInput
from app.services.ai_impact_service import analyze_verified_impact
from app.services.impact_service import process_change

BACKEND_DIR = Path(__file__).resolve().parents[1]
EVENT_ID = "event_kbc_techfest_2026"
VENUE_A_ID = "venue_auditorium_a"


@pytest.fixture(scope="module")
def seed_database_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    seed_dir = tmp_path_factory.mktemp("phase5-seed")
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///./event.db"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "seed.py")],
        cwd=seed_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    return seed_dir / "event.db"


@pytest.fixture
def seeded_db(seed_database_path: Path, tmp_path: Path) -> Iterator[Session]:
    database_path = tmp_path / "event.db"
    shutil.copyfile(seed_database_path, database_path)
    engine = create_engine(URL.create("sqlite", database=str(database_path)))
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    yield db
    db.close()
    engine.dispose()


class MockProvider:
    provider_name = "gemini"

    def __init__(self, response: object) -> None:
        self.response = response
        self.received: AIImpactInput | None = None

    def analyze(self, impact: AIImpactInput) -> object:
        self.received = impact
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


def venue_change(db: Session):
    return process_change(
        db,
        event_id=EVENT_ID,
        entity_type="venue",
        entity_id=VENUE_A_ID,
        field_name="name",
        new_value="Auditorium B",
        reason="Auditorium A equipment issue",
    )


def analysis_for(priority: str = "medium") -> dict[str, object]:
    return {
        "summary": "The venue update affects several scheduled operations.",
        "priority": priority,
        "key_impacts": ["Affected sessions and operational assignments need review."],
        "recommended_actions": ["Review the affected operational assignments."],
        "warnings": [],
    }


def test_fallback_uses_only_supplied_counts_and_conflicts(seeded_db: Session) -> None:
    verified = venue_change(seeded_db)
    result = analyze_verified_impact(verified, LocalFallbackProvider())

    assert result.provider == "fallback"
    assert result.analysis_type == "deterministic_fallback"
    assert result.analysis.priority == verified.impact.severity
    assert any("3 sessions" in item for item in result.analysis.key_impacts)
    assert result.analysis.warnings == [
        "1 related recorded risk(s) are in the verified impact."
    ]
    assert not any("collision" in item.lower() for item in result.analysis.warnings)


def test_ai_input_contract_forbids_unexpected_fields(seeded_db: Session) -> None:
    verified = venue_change(seeded_db)
    provider = MockProvider(analysis_for())
    analyze_verified_impact(verified, provider)

    assert provider.received is not None
    assert provider.received.change.old_value == "Auditorium A"
    assert provider.received.change.new_value == "Auditorium B"
    assert len(provider.received.affected.sessions) == 3
    payload = provider.received.model_dump()
    payload["invented_dependency"] = "not allowed"
    with pytest.raises(ValidationError):
        AIImpactInput.model_validate(payload)


def test_output_contract_is_strict() -> None:
    with pytest.raises(ValidationError):
        AIImpactAnalysis.model_validate({"summary": "x", "priority": "urgent"})
    with pytest.raises(ValidationError):
        AIImpactAnalysis.model_validate({**analysis_for(), "extra": "not allowed"})


def test_missing_gemini_key_selects_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(config, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(config, "GEMINI_API_KEY", "")

    from app.integrations.ai import get_ai_provider

    assert isinstance(get_ai_provider(), LocalFallbackProvider)


def test_gemini_provider_uses_mocked_sdk_and_parses_structured_output(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.integrations.ai import gemini

    class FakeClient:
        def __init__(self) -> None:
            self.models = self
            self.request: dict[str, object] | None = None

        def generate_content(self, **kwargs: object) -> object:
            self.request = kwargs
            return type("Response", (), {"text": AIImpactAnalysis(**analysis_for()).model_dump_json()})()

    fake_client = FakeClient()
    monkeypatch.setattr(gemini.genai, "Client", lambda **_: fake_client)
    provider = gemini.GeminiProvider(api_key="test-key", model="mock-model", timeout_seconds=1)
    from app.schemas import AIImpactInput

    impact = AIImpactInput.model_validate(
        {
            "change": {
                "entity_type": "venue", "entity_id": "venue-1", "field_name": "name",
                "old_value": "Room A", "new_value": "Room B", "reason": "maintenance",
            },
            "affected": {key: [] for key in (
                "events", "venues", "sessions", "speakers", "volunteers", "equipment", "tasks", "risks"
            )},
            "conflicts": [],
            "impact": {
                "counts": {
                    "sessions": 0, "speakers": 0, "volunteers": 0,
                    "equipment": 0, "tasks": 0, "risks": 0,
                },
                "conflict_count": 0, "severity": "medium", "reasons": ["no_conflict_detected"],
            },
        }
    )

    result = provider.analyze(impact)

    assert result.summary == analysis_for()["summary"]
    assert fake_client.request is not None
    config_arg = fake_client.request["config"]
    assert config_arg.response_mime_type == "application/json"
    assert "Do not invent:" in config_arg.system_instruction


def test_provider_initialization_failure_selects_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.integrations.ai.gemini as gemini_module
    from app.integrations.ai import get_ai_provider

    monkeypatch.setattr(config, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(config, "GEMINI_API_KEY", "not-logged")
    monkeypatch.setattr(gemini_module, "GeminiProvider", lambda **_: (_ for _ in ()).throw(RuntimeError()))

    assert isinstance(get_ai_provider(), LocalFallbackProvider)


@pytest.mark.parametrize(
    "provider_response",
    [RuntimeError("rate limited"), {"summary": "malformed"}],
    ids=["provider-failure", "malformed-response"],
)
def test_provider_failure_and_malformed_response_fall_back(
    seeded_db: Session, provider_response: object
) -> None:
    verified = venue_change(seeded_db)
    result = analyze_verified_impact(verified, MockProvider(provider_response))

    assert result.provider == "fallback"
    assert result.analysis_type == "deterministic_fallback"
    assert result.analysis.priority == verified.impact.severity


def test_successful_mocked_ai_response_is_returned(seeded_db: Session) -> None:
    verified = venue_change(seeded_db)
    provider = MockProvider(analysis_for())
    result = analyze_verified_impact(verified, provider)

    assert result.provider == "gemini"
    assert result.analysis_type == "ai_generated"
    assert result.analysis.summary == analysis_for()["summary"]
    assert provider.received is not None


def test_provider_cannot_invent_warning_or_conflict(seeded_db: Session) -> None:
    verified = venue_change(seeded_db)
    response = analysis_for()
    response["warnings"] = ["A collision with an unreported venue was found."]

    result = analyze_verified_impact(verified, MockProvider(response))

    assert result.provider == "gemini"
    assert result.analysis.warnings == [
        "1 related recorded risk(s) are in the verified impact."
    ]
    assert "unreported venue" not in " ".join(result.analysis.warnings)


def test_unsupported_priority_or_quantities_fall_back(seeded_db: Session) -> None:
    verified = venue_change(seeded_db)
    wrong_priority = analyze_verified_impact(verified, MockProvider(analysis_for("low")))
    invented_quantity = analysis_for()
    invented_quantity["summary"] = "This change affects 999 sessions."
    wrong_quantity = analyze_verified_impact(verified, MockProvider(invented_quantity))

    assert wrong_priority.provider == "fallback"
    assert wrong_quantity.provider == "fallback"


def test_verified_venue_impact_is_passed_without_ai_dependency_traversal(
    seeded_db: Session,
) -> None:
    verified = venue_change(seeded_db)
    provider = MockProvider(analysis_for())

    with patch(
        "app.services.dependency_engine.get_affected_entities",
        side_effect=AssertionError("AI layer must not calculate dependencies"),
    ):
        response = analyze_verified_impact(verified, provider)

    assert provider.received is not None
    assert provider.received.affected.model_dump() == verified.affected.model_dump()
    assert provider.received.impact.counts.sessions == 3
    assert provider.received.impact.counts.tasks == 6
    assert response.verified_impact.impact.model_dump() == verified.impact.model_dump()
    assert response.analysis.summary == analysis_for()["summary"]


def test_analyze_api_reconstructs_impact_and_uses_missing_key_fallback(
    seeded_db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    verified = venue_change(seeded_db)
    monkeypatch.setattr(config, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(config, "GEMINI_API_KEY", "")

    def override_get_db() -> Iterator[Session]:
        yield seeded_db

    app.dependency_overrides[get_db] = override_get_db

    async def request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(f"/changes/{verified.change_id}/analyze")

    try:
        with patch("app.main.initialize_database", lambda: None):
            response = asyncio.run(request())
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "verified_backend_impact"
    assert body["analysis_type"] == "deterministic_fallback"
    assert body["provider"] == "fallback"
    assert body["verified_impact"]["change_id"] == verified.change_id
    assert body["verified_impact"]["impact"]["counts"]["sessions"] == 3
    assert body["analysis"]["priority"] == verified.impact.severity
    assert seeded_db.get(Change, verified.change_id) is not None
