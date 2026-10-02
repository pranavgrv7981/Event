"""Convert verified backend impact into a provider-generated explanation."""

import logging
import re

from app.integrations.ai import get_ai_provider
from app.integrations.ai.fallback import LocalFallbackProvider
from app.integrations.ai.provider import AIProvider
from app.schemas import (
    AIImpactAnalysis,
    AIImpactAnalysisResponse,
    AIImpactInput,
    VerifiedImpactResponse,
)

logger = logging.getLogger(__name__)


def _to_ai_input(verified: VerifiedImpactResponse) -> AIImpactInput:
    if verified.verification.source != "database" or verified.verification.deterministic is not True:
        raise ValueError("AI analysis requires deterministic database-verified impact")
    change = verified.change
    return AIImpactInput.model_validate(
        {
            "change": {
                "entity_type": change.entity_type,
                "entity_id": change.entity_id,
                "field_name": change.field_name,
                "old_value": change.old_value,
                "new_value": change.new_value,
                "reason": change.reason,
            },
            "affected": verified.affected.model_dump(),
            "conflicts": [item.model_dump() for item in verified.conflicts],
            "impact": verified.impact.model_dump(),
        }
    )


def _validate_grounding(
    analysis: AIImpactAnalysis, impact: AIImpactInput
) -> AIImpactAnalysis:
    if analysis.priority != impact.impact.severity:
        raise ValueError("Provider priority differs from verified backend severity")

    allowed_numbers = {
        str(value)
        for value in impact.impact.counts.model_dump().values()
    } | {str(impact.impact.conflict_count)}
    all_output = " ".join(
        [analysis.summary, *analysis.key_impacts, *analysis.recommended_actions, *analysis.warnings]
    )
    if any(number not in allowed_numbers for number in re.findall(r"\b\d+\b", all_output)):
        raise ValueError("Provider returned a quantity absent from verified impact")

    verified_warnings = [conflict.message for conflict in impact.conflicts]
    if impact.impact.counts.risks:
        verified_warnings.append(
            f"{impact.impact.counts.risks} related recorded risk(s) are in the verified impact."
        )
    return analysis.model_copy(update={"warnings": verified_warnings})


def analyze_verified_impact(
    verified: VerifiedImpactResponse, provider: AIProvider | None = None
) -> AIImpactAnalysisResponse:
    impact = _to_ai_input(verified)
    selected = provider or get_ai_provider()
    logger.info("AI impact analysis started: change=%s provider=%s", verified.change_id, selected.provider_name)

    try:
        analysis = AIImpactAnalysis.model_validate(selected.analyze(impact))
        analysis = _validate_grounding(analysis, impact)
        active_provider = selected.provider_name
    except Exception as exc:
        logger.warning(
            "AI provider failed validation or analysis (%s); activating fallback",
            type(exc).__name__,
        )
        selected = LocalFallbackProvider()
        analysis = selected.analyze(impact)
        active_provider = selected.provider_name

    analysis_type = "ai_generated" if active_provider == "gemini" else "deterministic_fallback"
    logger.info("AI impact analysis completed: change=%s provider=%s", verified.change_id, active_provider)
    return AIImpactAnalysisResponse(
        change_id=verified.change_id,
        analysis_type=analysis_type,
        provider=active_provider,
        verified_impact=verified,
        analysis=analysis,
    )
