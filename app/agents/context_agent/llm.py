from core.config import llm_settings
from langchain_groq import ChatGroq
from dotenv import load_dotenv
import os
load_dotenv()

gen_llm = ChatGroq(
    model="llama-3.3-70b-versatile"
)

reasoning_llm = ChatGroq(
    model="openai/gpt-oss-120b"
)