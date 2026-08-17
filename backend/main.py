from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any


# ============================================================
# AGENTX APPLICATION
# ============================================================

app = FastAPI(
    title="AGENTX API",
    description="AI Execution OS backend",
    version="0.3.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class TaskRequest(BaseModel):
    task: str


# ============================================================
# AGENTX PIPELINE
# ============================================================

PIPELINE = [
    "UNDERSTAND",
    "PLAN",
    "EXECUTE",
    "VERIFY",
    "DELIVER"
]


def understand_task(task: str) -> Dict[str, Any]:
    """
    Understand the user's objective.
    """

    cleaned_task = task.strip()

    return {
        "status": "completed",
        "objective": cleaned_task,
        "task_type": "general",
        "summary": f"AGENTX identified the objective: {cleaned_task}"
    }


def plan_task(task: str) -> List[str]:
    """
    Create a basic execution plan.
    """

    return [
        f"Understand the objective: {task}",
        "Identify the information and resources required",
        "Execute the required actions",
        "Verify the results",
        "Prepare the final deliverable"
    ]


def execute_task(task: str) -> Dict[str, Any]:
    """
    Execute the task.

    NOTE:
    This is currently the execution-engine foundation.
    Real external tools such as web search, file processing,
    code execution, etc. will be connected here later.
    """

    return {
        "status": "completed",
        "message": "Execution layer completed the current task simulation.",
        "task": task
    }


def verify_result(execution_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verify the execution result.
    """

    if execution_result.get("status") == "completed":
        return {
            "status": "verified",
            "passed": True,
            "message": "Execution result passed the current verification check."
        }

    return {
        "status": "failed",
        "passed": False,
        "message": "Execution result failed verification."
    }


def deliver_result(
    task: str,
    understanding: Dict[str, Any],
    plan: List[str],
    execution: Dict[str, Any],
    verification: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Prepare the final AGENTX response.
    """

    return {
        "title": "AGENTX Task Result",
        "task": task,
        "status": "completed",
        "summary": f"AGENTX processed the task: {task}",
        "understanding": understanding,
        "plan": plan,
        "execution": execution,
        "verification": verification
    }


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "name": "AGENTX",
        "message": "AGENTX backend is running",
        "status": "online",
        "version": "0.3.0"
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "agentx-api"
    }


# ============================================================
# TASK EXECUTION ENDPOINT
# ============================================================

@app.post("/api/tasks")
def create_task(request: TaskRequest):

    task = request.task.strip()

    if not task:
        return {
            "success": False,
            "message": "Task cannot be empty."
        }

    # --------------------------------------------------------
    # 1. UNDERSTAND
    # --------------------------------------------------------

    understanding = understand_task(task)

    # --------------------------------------------------------
    # 2. PLAN
    # --------------------------------------------------------

    plan = plan_task(task)

    # --------------------------------------------------------
    # 3. EXECUTE
    # --------------------------------------------------------

    execution = execute_task(task)

    # --------------------------------------------------------
    # 4. VERIFY
    # --------------------------------------------------------

    verification = verify_result(execution)

    # --------------------------------------------------------
    # 5. DELIVER
    # --------------------------------------------------------

    result = deliver_result(
        task,
        understanding,
        plan,
        execution,
        verification
    )

    return {
        "success": True,
        "agent": "AGENTX",
        "pipeline": PIPELINE,
        "result": result
    }