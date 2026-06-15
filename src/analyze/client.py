from unstract.llmwhisperer import LLMWhispererClientV2

from src.config import settings

_llmwhisperer_client: LLMWhispererClientV2 | None = None


def init_llmwhisperer_client() -> None:
    global _llmwhisperer_client

    if _llmwhisperer_client is None:
        _llmwhisperer_client = LLMWhispererClientV2(
            api_key=settings.LLMWHISPERER_API_KEY.get_secret_value(),
        )


def get_llmwhisperer_client() -> LLMWhispererClientV2:
    if _llmwhisperer_client is None:
        init_llmwhisperer_client()

    return _llmwhisperer_client
