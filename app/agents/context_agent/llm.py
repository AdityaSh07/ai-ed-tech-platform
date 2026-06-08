from core.config import llm_settings
from langchain_groq import ChatGroq
from dotenv import load_dotenv
load_dotenv()

gen_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=llm_settings.LLM_GENERATION_TEMPERATURE,
)

reasoning_llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=llm_settings.LLM_REASONING_TEMPERATURE,
)