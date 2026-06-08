from fastapi import APIRouter, Depends, HTTPException
from OAuth2 import OAuth2
from pydantic import BaseModel
from fastapi.concurrency import run_in_threadpool
from datetime import datetime
from uuid import uuid4

# from app.agents.research_agent.graph import agent

router = APIRouter(
    prefix="/research-agent",
    tags=["research"],
)

class ResearchRequest(BaseModel):
    topic: str

@router.post("/launch")
async def launch_research(
    request: ResearchRequest,
    current_user: int = Depends(OAuth2.get_current_user)
):
    try:
        config = {
            "configurable": {
                "thread_id": f"research_{current_user}_{uuid4().hex[:8]}"
            }
        }
        ini_state = {
            "topic": request.topic,
            "as_of": datetime.now().isoformat()
        }
        
        # result = await run_in_threadpool(
        #     agent.invoke,
        #     ini_state,
        #     config=config
        # )
        
        # return {
        #     "message": "Research completed successfully",
        #     "final_answer": result.get("final", "No output generated.")
        # }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")
