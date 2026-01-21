from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel
from app.core.config import settings

def get_llm_client(api_key: str = None, provider: str = None, model_name: str = None) -> BaseChatModel:
    """
    Factory to return the configured Chat Model (OpenAI, Gemini, etc.)
    """
    provider = (provider or settings.AI_PROVIDER or "openai").lower()
    api_key = api_key or settings.AI_API_KEY
    model_name = model_name or getattr(settings, "AI_MODEL", None)

    if not api_key:
        raise ValueError("AI_API_KEY is missing in configuration. Please set it in your .env file or System Settings.")

    if provider == "google":
        return ChatGoogleGenerativeAI(
            model=model_name or "gemini-pro",
            google_api_key=api_key,
            temperature=0
        )
    else:
        # Default to OpenAI
        return ChatOpenAI(
            model=model_name or "gpt-5-nano",
            api_key=api_key,
            temperature=0
        )
