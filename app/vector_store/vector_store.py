from langchain_pinecone import PineconeVectorStore
from core.config import vector_db_settings, llm_settings
from langchain_huggingface import HuggingFaceEmbeddings

INDEX_NAME = vector_db_settings.INDEX_NAME
PINECONE_API_KEY = vector_db_settings.PINECONE_API_KEY

embed_model = HuggingFaceEmbeddings(model_name=llm_settings.EMBEDDING_MODEL_NAME)

VECTOR_STORE = PineconeVectorStore(
    index_name=INDEX_NAME,
    embedding=embed_model,
    pinecone_api_key=PINECONE_API_KEY,
)


