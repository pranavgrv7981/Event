"""Vendor-neutral interface for operational analysis providers."""

from typing import Protocol

from app.schemas import AIImpactAnalysis, AIImpactInput


class AIProvider(Protocol):
    provider_name: str

    def analyze(self, impact: AIImpactInput) -> AIImpactAnalysis | dict[str, object]:
        """Generate an interpretation from the supplied verified impact only."""
