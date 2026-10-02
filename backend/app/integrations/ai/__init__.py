"""Centralized AI provider selection."""

import logging

from app import config
from app.integrations.ai.fallback import LocalFallbackProvider
from app.integrations.ai.provider import AIProvider

logger = logging.getLogger(__name__)


def get_ai_provider() -> AIProvider:
    if config.AI_PROVIDER == "fallback":
        logger.info("AI provider selected: fallback")
        return LocalFallbackProvider()
    if config.AI_PROVIDER != "gemini":
        logger.warning("Unsupported AI provider configured; activating fallback")
        return LocalFallbackProvider()
    if not config.GEMINI_API_KEY:
        logger.warning("Gemini API key is not configured; activating fallback")
        return LocalFallbackProvider()
    try:
        from app.integrations.ai.gemini import GeminiProvider

        provider = GeminiProvider(
            api_key=config.GEMINI_API_KEY,
            model=config.GEMINI_MODEL,
            timeout_seconds=config.GEMINI_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        logger.warning(
            "Gemini provider initialization failed (%s); activating fallback",
            type(exc).__name__,
        )
        return LocalFallbackProvider()
    logger.info("AI provider selected: gemini")
    return provider
