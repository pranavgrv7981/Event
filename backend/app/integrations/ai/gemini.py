"""Gemini implementation of the vendor-neutral AI provider interface."""

import json

from google import genai
from google.genai import types

from app.schemas import AIImpactAnalysis, AIImpactInput

SYSTEM_PROMPT = """You are an operational analysis assistant.

Use ONLY the verified information provided in the input.

Do not invent:
- people
- sessions
- venues
- equipment
- tasks
- risks
- conflicts
- dates
- owners
- quantities

If information is missing, say that it is unavailable.

Do not infer unsupported facts.

The backend dependency and impact results are authoritative.

Return only the requested structured analysis. Priority must exactly match the
verified impact severity. Warnings may mention only conflicts and risks present
in the verified input. Do not claim a conflict unless it appears in the input.
"""


class GeminiProvider:
    provider_name = "gemini"

    def __init__(self, *, api_key: str, model: str, timeout_seconds: float) -> None:
        if not api_key:
            raise ValueError("Gemini API key is required")
        self.model = model
        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=int(timeout_seconds * 1000)),
        )

    def analyze(self, impact: AIImpactInput) -> AIImpactAnalysis:
        prompt = json.dumps(impact.model_dump(mode="json"), sort_keys=True)
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=AIImpactAnalysis.model_json_schema(),
                temperature=0.2,
            ),
        )
        if not response.text:
            raise ValueError("Gemini returned an empty response")
        return AIImpactAnalysis.model_validate_json(response.text)
