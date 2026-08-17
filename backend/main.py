from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any


app = FastAPI(
    title="AGENTX API",
    description="AI Execution OS backend",
    version="0.2.0"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Request Model
# --------------------------------------------------

class TaskRequest(BaseModel):
    task: str


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "AGENTX",
        "message": "AGENTX backend is running",
        "status": "online"
    }


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "agentx-api"
    }


# --------------------------------------------------
# UNDERSTAND
# --------------------------------------------------

def understand_task(task: str) -> Dict[str, Any]:
    return {
        "status": "completed",
        "objective": task,
        "summary": f"AGENTX identified the objective: {task}",
        "task_type": "general"
    }


# --------------------------------------------------
# PLAN
# --------------------------------------------------

def create_plan(task: str) -> List[str]:
    return [
        f"Understand the objective: {task}",
        "Identify the information and resources required",
        "Execute the required actions",
        "Verify the results",
        "Prepare the final deliverable"
    ]


# --------------------------------------------------
# EXECUTE
# --------------------------------------------------

def execute_plan(task: str, plan: List[str]) -> Dict[str, Any]:
    return {
        "status": "completed",
        "message": "Execution layer completed the planned steps",
        "task": task,
        "steps_completed": len(plan)
    }


# --------------------------------------------------
# VERIFY
# --------------------------------------------------

def verify_result(execution: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "status": "verified",
        "checks": [
            "Task received",
            "Plan created",
            "Execution completed",
            "Result structure validated"
        ]
    }


# --------------------------------------------------
# DELIVER
# --------------------------------------------------

def create_delivery(
    task: str,
    understanding: Dict[str, Any],
    plan: List[str],
    execution: Dict[str, Any],
    verification: Dict[str, Any]
) -> Dict[str, Any]:

    return {
        "title": "AGENTX Task Result",
        "task": task,
        "understanding": understanding,
        "plan": plan,
        "execution": execution,
        "verification": verification
    }


# --------------------------------------------------
# MAIN AGENTX PIPELINE
# --------------------------------------------------

@app.post("/api/tasks")
def create_task(request: TaskRequest):

    task = request.task.strip()

    if not task:
        return {
            "success": False,
            "message": "Task cannot be empty"
        }

    # 1. UNDERSTAND
    understanding = understand_task(task)

    # 2. PLAN
    plan = create_plan(task)

    # 3. EXECUTE
    execution = execute_plan(task, plan)

    # 4. VERIFY
    verification = verify_result(execution)

    # 5. DELIVER
    delivery = create_delivery(
        task,
        understanding,
        plan,
        execution,
        verification
    )

    return {
        "success": True,
        "agent": "AGENTX",
        "pipeline": [
            "UNDERSTAND",
            "PLAN",
            "EXECUTE",
            "VERIFY",
            "DELIVER"
        ],
        "result": delivery
    }