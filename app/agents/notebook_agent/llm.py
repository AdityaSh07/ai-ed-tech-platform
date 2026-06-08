from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

load_dotenv()

# We can use the same model setup as context_agent
gen_llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)
