"""Deterministic analysis derived exclusively from verified impact facts."""

from app.schemas import AIImpactAnalysis, AIImpactInput


class LocalFallbackProvider:
    provider_name = "fallback"

    def analyze(self, impact: AIImpactInput) -> AIImpactAnalysis:
        change = impact.change
        counts = impact.impact.counts
        summary = f"A {change.entity_type} {change.field_name} change was recorded."
        if change.old_value is not None and change.new_value is not None:
            summary = (
                f"A {change.entity_type} {change.field_name} change from "
                f"{change.old_value} to {change.new_value} was recorded."
            )

        labels = (
            ("sessions", "session", "sessions"),
            ("speakers", "speaker", "speakers"),
            ("volunteers", "volunteer", "volunteers"),
            ("equipment", "equipment record", "equipment records"),
            ("tasks", "task", "tasks"),
            ("risks", "recorded risk", "recorded risks"),
        )
        key_impacts = [
            f"{count} {singular if count == 1 else plural} are affected."
            for key, singular, plural in labels
            if (count := getattr(counts, key)) > 0
        ]
        actions = []
        for key, action in (
            ("sessions", "Review the affected session schedules."),
            ("speakers", "Coordinate updates with the affected speakers."),
            ("volunteers", "Review assignments for the affected volunteers."),
            ("equipment", "Review equipment assignments for affected sessions."),
            ("tasks", "Review the related operational tasks."),
            ("risks", "Review the related recorded risks."),
        ):
            if getattr(counts, key) > 0:
                actions.append(action)
        if impact.conflicts:
            actions.append("Resolve the conflicts reported by the verified impact analysis.")
        if not actions:
            actions.append("Review the change with the event operations team.")

        warnings = [conflict.message for conflict in impact.conflicts]
        if counts.risks:
            warnings.append(f"{counts.risks} related recorded risk(s) are in the verified impact.")
        return AIImpactAnalysis(
            summary=summary,
            priority=impact.impact.severity,
            key_impacts=key_impacts,
            recommended_actions=actions,
            warnings=warnings,
        )
