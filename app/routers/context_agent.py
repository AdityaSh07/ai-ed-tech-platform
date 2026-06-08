from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from OAuth2 import OAuth2
from pathlib import Path
from uuid import uuid4
from core.schemas import ChatRequest
from dotenv import load_dotenv
from fastapi.concurrency import run_in_threadpool
import asyncio
load_dotenv()
# Import heavy ML libraries globally so they load on startup
from app.load_documents.text_splitting import text_splitter
from app.vector_store.vector_store import VECTOR_STORE
from docling.document_converter import DocumentConverter
from langchain_core.documents import Document
# Initialize converter globally to avoid loading it per request
try:
    converter = DocumentConverter()
except Exception as e:
    converter = None
    print(f"Failed to initialize DocumentConverter: {e}")
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "load_documents" / "uploads"
router = APIRouter(
    prefix="/rag-agent",
    tags=["/"],
)
def process_document(file_path_str: str, current_user: int, filename: str):
    if not converter:
        raise RuntimeError("DocumentConverter is not initialized")
    
    result = converter.convert(file_path_str)
    markdown = result.document.export_to_markdown()
    if not markdown.strip():
        raise ValueError("Uploaded document did not contain readable text")
    # Create LangChain document
    doc = Document(
        page_content=markdown,
        metadata={
            "id": current_user,
            "source": filename
        }
    )
    chunks = text_splitter.split_documents([doc])
    if not chunks:
        raise ValueError("No text chunks were created from this document")
    # Upload to Pinecone (also synchronous)
    document_ids = VECTOR_STORE.add_documents(chunks)
    return len(chunks), len(document_ids)
@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    current_user: int = Depends(OAuth2.get_current_user)):

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file was uploaded")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / f"{uuid4()}{Path(file.filename).suffix}"

    try:
        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        try:
            # Run the heavy synchronous CPU-bound operations in a threadpool
            num_chunks, num_vectors = await run_in_threadpool(
                process_document, 
                str(file_path), 
                current_user, 
                file.filename
            )
            return {"message": "Uploaded successfully", "chunks": num_chunks, "vectors": num_vectors}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

    finally:
        if file_path.exists():
            file_path.unlink()


@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: int = Depends(OAuth2.get_current_user)
):
    from app.agents.context_agent.graph import agent
    config = {
        "configurable": {
            "thread_id": f"user_{current_user}"
        }
    }
    ini = {
        "id": current_user,
        "user_query": request.user_query,
        "use_strictly_retriever": request.use_strictly_retriever,
        "docs_available": request.docs_available,
    }
    
    result = await run_in_threadpool(
        agent.invoke,
        ini,
        config=config
    )
    return result
