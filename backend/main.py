from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import requests
from bs4 import BeautifulSoup
import re


# ============================================================
# AGENTX APPLICATION
# ============================================================

app = FastAPI(
    title="AGENTX API",
    description="AI Execution OS backend",
    version="0.9.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
# LOCAL TASK PERSISTENCE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
TASKS_FILE = BASE_DIR / "tasks.json"

DEFAULT_TASKS = [
    "CureBlend market analysis",
    "Hackathon project roadmap",
    "AI career roadmap",
]


def load_tasks() -> List[Dict[str, Any]]:
    """Load persisted tasks from the local JSON store."""
    try:
        if not TASKS_FILE.exists():
            tasks = [
                {
                    "id": str(uuid4()),
                    "task": task,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "result": None,
                }
                for task in DEFAULT_TASKS
            ]
            save_tasks(tasks)
            return tasks

        with TASKS_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)

        return data if isinstance(data, list) else []

    except (OSError, json.JSONDecodeError) as error:
        print(f"[AGENTX] Task store read failed: {error}")
        return []


def save_tasks(tasks: List[Dict[str, Any]]) -> None:
    """Persist tasks to the local JSON store."""
    try:
        with TASKS_FILE.open("w", encoding="utf-8") as file:
            json.dump(tasks, file, ensure_ascii=False, indent=2)
    except OSError as error:
        print(f"[AGENTX] Task store write failed: {error}")


def add_task_record(task: str, result: Dict[str, Any]) -> Dict[str, Any]:
    """Create and persist a complete task-history record."""
    tasks = load_tasks()

    record = {
        "id": str(uuid4()),
        "task": task,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": result,
    }

    tasks.insert(0, record)
    save_tasks(tasks)
    return record


# ============================================================
# CONTEXT / TASK MEMORY
# ============================================================

FOLLOW_UP_PHRASES = [
    "it",
    "this",
    "that",
    "these",
    "those",
    "the above",
    "previous",
    "earlier",
    "same",
    "continue",
    "go deeper",
    "expand on",
    "elaborate",
    "based on that",
    "using that",
    "from that",
]


def _task_result_type(record: Dict[str, Any]) -> str | None:
    """Recover the previous task type from a persisted task record."""
    try:
        result = record.get("result") or {}
        delivered = result.get("result") or result
        understanding = delivered.get("understanding") or {}
        task_type = understanding.get("task_type")
        return task_type if isinstance(task_type, str) else None
    except AttributeError:
        return None


def _task_result_summary(record: Dict[str, Any]) -> Dict[str, Any]:
    """Extract small, safe pieces of the previous result for context."""
    result = record.get("result") or {}
    delivered = result.get("result") or result
    execution = delivered.get("execution") or {}

    summary = {
        "tool": execution.get("tool"),
        "status": execution.get("status"),
    }

    if execution.get("tool") == "web_research":
        summary["source_count"] = execution.get("source_count", 0)
        summary["finding_count"] = len(execution.get("findings", []))
    elif execution.get("tool") == "calculator":
        summary["answer"] = execution.get("answer")
    elif execution.get("tool") == "build_planner":
        summary["component_count"] = len(execution.get("components", []))
    elif execution.get("tool") == "analysis_engine":
        summary["focus_areas"] = execution.get("focus_areas", [])

    return summary


def resolve_task_context(task: str) -> Dict[str, Any]:
    """Resolve simple follow-up references against recent AGENTX history.

    This is intentionally deterministic. AGENTX never invents a previous
    task; it only uses an existing persisted task record.
    """
    cleaned = task.strip()
    lower = cleaned.lower()

    tasks = load_tasks()
    candidates = [
        item
        for item in tasks
        if isinstance(item, dict) and item.get("task")
    ]
    candidates.sort(
        key=lambda item: item.get("created_at", ""),
        reverse=True,
    )

    if not candidates:
        return {
            "used": False,
            "resolved_task": cleaned,
            "previous_task": None,
            "previous_task_id": None,
            "reason": None,
            "inferred_task_type": None,
            "previous_result": None,
        }

    previous = candidates[0]
    previous_task = str(previous.get("task", "")).strip()

    # Explicit follow-up language is the strongest signal.
    explicit_reference = any(
        re.search(rf"\b{re.escape(phrase)}\b", lower)
        for phrase in FOLLOW_UP_PHRASES
    )

    # Short/vague requests are also treated as continuations.
    vague_follow_up = lower in {
        "continue",
        "continue this",
        "continue that",
        "go ahead",
        "do the same",
        "do that",
        "expand",
        "elaborate",
    }

    if not explicit_reference and not vague_follow_up:
        return {
            "used": False,
            "resolved_task": cleaned,
            "previous_task": None,
            "previous_task_id": None,
            "reason": None,
            "inferred_task_type": None,
            "previous_result": None,
        }

    previous_type = _task_result_type(previous)
    previous_summary = _task_result_summary(previous)

    resolved_task = (
        f"{cleaned} [Context: previous AGENTX task was "
        f"'{previous_task}']"
    )

    return {
        "used": True,
        "resolved_task": resolved_task,
        "previous_task": previous_task,
        "previous_task_id": previous.get("id"),
        "reason": "follow_up_reference",
        "inferred_task_type": previous_type,
        "previous_result": previous_summary,
    }


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


# ============================================================
# HTTP CONFIGURATION
# ============================================================

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/147.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,"
        "application/xml;q=0.9,image/avif,image/webp,"
        "*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

REQUEST_TIMEOUT = 10


# ============================================================
# UNDERSTAND
# ============================================================

def understand_task(
    task: str,
    context: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Understand the user's objective, classify it, and attach context."""

    cleaned_task = task.strip()
    task_lower = cleaned_task.lower()
    context = context or resolve_task_context(cleaned_task)

    # --------------------------------------------------------
    # Analysis detection
    # --------------------------------------------------------
    # Explicit analytical intent must be checked before build/research
    # keywords. For example:
    # "Analyze a software project" contains both "analyze" and
    # "software", but the requested operation is analysis, not building.

    if any(
        word in task_lower
        for word in [
            "analyze",
            "analyse",
            "analysis",
            "data analysis",
            "report",
            "insights",
            "evaluate",
            "assess",
            "audit",
            "review",
        ]
    ):
        task_type = "analysis"

    # --------------------------------------------------------
    # Research detection
    # --------------------------------------------------------

    elif any(
        word in task_lower
        for word in [
            "research",
            "latest",
            "news",
            "competitors",
            "industry",
            "market research",
            "compare",
            "trends",
            "forecast",
            "statistics",
        ]
    ):
        task_type = "research"

    # --------------------------------------------------------
    # Build detection
    # --------------------------------------------------------

    elif any(
        word in task_lower
        for word in [
            "build",
            "create",
            "develop",
            "website",
            "application",
            "app",
            "software",
            "implement",
            "code",
        ]
    ):
        task_type = "build"

    # --------------------------------------------------------
    # Calculation detection
    # --------------------------------------------------------

    elif (
        any(
            phrase in task_lower
            for phrase in [
                "calculate",
                "calculator",
                "compute",
                "arithmetic",
                "solve",
            ]
        )
        or bool(
            re.fullmatch(
                r"[0-9\s\+\-\*\/\%\(\)\.\^]+",
                cleaned_task,
            )
        )
    ):
        task_type = "calculation"

    elif context.get("used") and context.get("inferred_task_type"):
        # If the follow-up contains no new task verb, inherit the previous
        # task type rather than falling back to a generic task.
        task_type = context["inferred_task_type"]

    else:
        task_type = "general"

    intent_map = {
        "research": "Find and synthesize external information",
        "build": "Plan and structure a software solution",
        "calculation": "Compute a numerical result safely",
        "analysis": "Analyze information and produce actionable insights",
        "general": "Understand and structure the requested task",
    }

    context_message = None
    if context.get("used"):
        context_message = (
            f"Linked to previous task: {context.get('previous_task')}"
        )

    return {
        "status": "completed",
        "objective": cleaned_task,
        "resolved_objective": context.get("resolved_task", cleaned_task),
        "task_type": task_type,
        "intent": intent_map.get(task_type, intent_map["general"]),
        "context_used": bool(context.get("used")),
        "context": context,
        "summary": (
            f"AGENTX identified the objective: {cleaned_task}"
            + (f" using previous task context." if context.get("used") else "")
        ),
        "context_message": context_message,
    }


# ============================================================
# PLAN
# ============================================================

def plan_task(
    task: str,
    task_type: str
) -> List[str]:
    """
    Generate an execution plan based on task type.
    """

    # --------------------------------------------------------
    # Research plan
    # --------------------------------------------------------

    if task_type == "research":

        return [
            f"Understand the research objective: {task}",
            "Identify relevant search queries",
            "Search the web for relevant sources",
            "Extract useful information from discovered pages",
            "Synthesize concise research findings",
            "Verify the collected sources",
            "Prepare the research findings",
        ]

    # --------------------------------------------------------
    # Calculation plan
    # --------------------------------------------------------

    if task_type == "calculation":

        return [
            f"Understand the calculation request: {task}",
            "Extract and validate the arithmetic expression",
            "Execute the calculation safely",
            "Verify the calculated result",
            "Prepare the final answer",
        ]

    # --------------------------------------------------------
    # Build plan
    # --------------------------------------------------------

    if task_type == "build":

        return [
            f"Understand the development objective: {task}",
            "Identify the required components",
            "Determine the implementation approach",
            "Execute the required development steps",
            "Verify the implementation",
            "Prepare the final deliverable",
        ]

    # --------------------------------------------------------
    # Analysis plan
    # --------------------------------------------------------

    if task_type == "analysis":

        return [
            f"Understand the analysis objective: {task}",
            "Identify the required information",
            "Collect relevant data",
            "Analyze the collected information",
            "Verify the findings",
            "Prepare the final analysis",
        ]

    # --------------------------------------------------------
    # General plan
    # --------------------------------------------------------

    return [
        f"Understand the objective: {task}",
        "Identify the information and resources required",
        "Execute the required actions",
        "Verify the results",
        "Prepare the final deliverable",
    ]


# ============================================================
# SEARCH ENGINE
# ============================================================

def search_web(
    query: str,
    max_results: int = 5
) -> List[Dict[str, str]]:
    """
    Search the web using DuckDuckGo HTML.

    Uses browser-like headers and multiple parsing
    strategies because DuckDuckGo may change its HTML
    structure or apply bot protection.
    """

    search_url = "https://html.duckduckgo.com/html/"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/147.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,"
            "application/xml;q=0.9,image/avif,image/webp,"
            "*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://html.duckduckgo.com/",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    try:

        # ----------------------------------------------------
        # Perform search request
        # ----------------------------------------------------

        response = requests.post(
            search_url,
            data={
                "q": query,
                "kl": "in-en",
            },
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )

        print(
            f"[AGENTX] Search HTTP status: "
            f"{response.status_code}"
        )

        print(
            f"[AGENTX] Search response size: "
            f"{len(response.text)} characters"
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        results = []

        # ----------------------------------------------------
        # Strategy 1 — Standard DuckDuckGo result blocks
        # ----------------------------------------------------

        result_blocks = soup.select(".result")

        print(
            f"[AGENTX] Standard result blocks found: "
            f"{len(result_blocks)}"
        )

        for result in result_blocks:

            if len(results) >= max_results:
                break

            link = result.select_one(
                "a.result__a"
            )

            if not link:
                continue

            title = link.get_text(
                " ",
                strip=True
            )

            url = link.get(
                "href",
                ""
            )

            snippet_element = result.select_one(
                ".result__snippet"
            )

            snippet = (
                snippet_element.get_text(
                    " ",
                    strip=True
                )
                if snippet_element
                else ""
            )

            if title and url:

                results.append(
                    {
                        "title": title,
                        "url": url,
                        "snippet": snippet,
                    }
                )

        # ----------------------------------------------------
        # Strategy 2 — Direct result links
        # ----------------------------------------------------

        if not results:

            print(
                "[AGENTX] Trying fallback link parser..."
            )

            links = soup.select(
                "a.result__a"
            )

            for link in links:

                if len(results) >= max_results:
                    break

                title = link.get_text(
                    " ",
                    strip=True
                )

                url = link.get(
                    "href",
                    ""
                )

                if title and url:

                    results.append(
                        {
                            "title": title,
                            "url": url,
                            "snippet": "",
                        }
                    )

        # ----------------------------------------------------
        # Strategy 3 — Generic external links
        # ----------------------------------------------------

        if not results:

            print(
                "[AGENTX] Trying generic external-link parser..."
            )

            for link in soup.find_all(
                "a",
                href=True
            ):

                if len(results) >= max_results:
                    break

                title = link.get_text(
                    " ",
                    strip=True
                )

                url = link.get(
                    "href",
                    ""
                )

                if (
                    title
                    and len(title) > 5
                    and url.startswith("http")
                    and "duckduckgo.com" not in url
                ):

                    results.append(
                        {
                            "title": title,
                            "url": url,
                            "snippet": "",
                        }
                    )

        print(
            f"[AGENTX] Final search results: "
            f"{len(results)}"
        )

        return results

    except requests.RequestException as error:

        print(
            f"[AGENTX] Search request failed: "
            f"{error}"
        )

        return []

    except Exception as error:

        print(
            f"[AGENTX] Search parsing failed: "
            f"{error}"
        )

        return []


# ============================================================
# WEB PAGE EXTRACTION
# ============================================================

def extract_page_content(
    url: str,
    max_chars: int = 8000
) -> Dict[str, str]:
    """
    Download and extract readable text from a webpage.
    """

    try:

        response = requests.get(
            url,
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        # ----------------------------------------------------
        # Remove irrelevant webpage elements
        # ----------------------------------------------------

        for element in soup(
            [
                "script",
                "style",
                "nav",
                "footer",
                "header",
                "aside",
                "noscript",
                "form",
                "iframe",
                "svg",
            ]
        ):
            element.decompose()

        # ----------------------------------------------------
        # Extract readable text
        # ----------------------------------------------------

        text = soup.get_text(
            " ",
            strip=True
        )

        # ----------------------------------------------------
        # Normalize whitespace
        # ----------------------------------------------------

        text = re.sub(
            r"\s+",
            " ",
            text
        ).strip()

        # ----------------------------------------------------
        # Limit raw extraction
        # ----------------------------------------------------

        if len(text) > max_chars:
            text = text[:max_chars]

        return {
            "url": url,
            "text": text
        }

    except Exception as error:

        print(
            f"[AGENTX] Page extraction error: "
            f"{url} -> {error}"
        )

        return {
            "url": url,
            "text": ""
        }


# ============================================================
# RESEARCH FINDING SUMMARIZER
# ============================================================

def create_research_finding(
    title: str,
    text: str,
    max_sentences: int = 5
) -> str:
    """
    Convert raw webpage text into a concise research finding.

    This is an extractive summarizer. It selects sentences
    containing useful research information instead of sending
    the entire webpage to the frontend.
    """

    if not text:
        return ""

    # --------------------------------------------------------
    # Clean whitespace
    # --------------------------------------------------------

    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    # --------------------------------------------------------
    # Remove common webpage/report noise
    # --------------------------------------------------------

    noise_patterns = [
        r"table of contents",
        r"request sample",
        r"download sample",
        r"download pdf",
        r"buy now",
        r"view pricing",
        r"loading wait",
        r"reports press releases blogs insights home",
        r"all rights reserved",
        r"cookie policy",
        r"privacy policy",
        r"terms and conditions",
        r"subscribe",
        r"sign up",
        r"log in",
        r"contact us",
    ]

    for pattern in noise_patterns:

        text = re.sub(
            pattern,
            "",
            text,
            flags=re.IGNORECASE
        )

    # --------------------------------------------------------
    # Split into sentences
    # --------------------------------------------------------

    sentences = re.split(
        r"(?<=[.!?])\s+",
        text
    )

    # --------------------------------------------------------
    # Remove unusable sentences
    # --------------------------------------------------------

    cleaned_sentences = []

    for sentence in sentences:

        sentence = sentence.strip()

        if len(sentence) < 50:
            continue

        # Avoid extremely long navigation/menu strings
        if len(sentence) > 1200:
            continue

        cleaned_sentences.append(sentence)

    sentences = cleaned_sentences

    if not sentences:

        return text[:1400]

    # --------------------------------------------------------
    # Research keywords
    # --------------------------------------------------------

    keywords = [
        "market",
        "growth",
        "cagr",
        "healthcare",
        "artificial intelligence",
        "ai",
        "machine learning",
        "diagnostic",
        "diagnostics",
        "hospital",
        "health",
        "technology",
        "digital health",
        "remote monitoring",
        "clinical",
        "government",
        "adoption",
        "forecast",
        "opportunity",
        "revenue",
        "application",
        "software",
        "services",
        "medical",
        "patient",
        "india",
    ]

    # --------------------------------------------------------
    # Score sentences
    # --------------------------------------------------------

    scored_sentences = []

    for index, sentence in enumerate(sentences):

        sentence_lower = sentence.lower()

        score = 0

        # Keyword relevance
        for keyword in keywords:

            if keyword in sentence_lower:
                score += 2

        # Earlier sentences often contain executive summaries
        if index < 10:
            score += 1

        # Numbers often indicate useful market facts
        if re.search(
            r"\b\d+(\.\d+)?\s*"
            r"(?:%|million|billion|crore|lakh|thousand|"
            r"mn|bn)\b",
            sentence_lower
        ):
            score += 3

        # Important market terminology
        if "projected" in sentence_lower:
            score += 2

        if "forecast" in sentence_lower:
            score += 2

        if "valued at" in sentence_lower:
            score += 2

        if "cagr" in sentence_lower:
            score += 3

        if "market size" in sentence_lower:
            score += 3

        if "growth rate" in sentence_lower:
            score += 2

        # Penalize obvious report-navigation sentences
        if any(
            phrase in sentence_lower
            for phrase in [
                "report code",
                "request sample",
                "buy now",
                "view pricing",
                "table of contents",
                "download pdf",
            ]
        ):
            score -= 5

        scored_sentences.append(
            (
                score,
                index,
                sentence
            )
        )

    # --------------------------------------------------------
    # Select highest-value sentences
    # --------------------------------------------------------

    scored_sentences.sort(
        key=lambda item: (
            item[0],
            -item[1]
        ),
        reverse=True
    )

    selected = scored_sentences[:max_sentences]

    # --------------------------------------------------------
    # Restore original order
    # --------------------------------------------------------

    selected.sort(
        key=lambda item: item[1]
    )

    findings = [
        item[2]
        for item in selected
    ]

    # --------------------------------------------------------
    # Build final finding
    # --------------------------------------------------------

    result = " ".join(findings)

    # --------------------------------------------------------
    # Final length protection
    # --------------------------------------------------------

    if len(result) > 1600:

        result = (
            result[:1600]
            .rsplit(" ", 1)[0]
            + "..."
        )

    return result


# ============================================================
# RESEARCH ENGINE
# ============================================================

def perform_research(
    task: str
) -> Dict[str, Any]:
    """
    Perform actual web research.

    Steps:
    1. Search the web.
    2. Collect search results.
    3. Open useful sources.
    4. Extract readable page content.
    5. Generate concise findings.
    6. Return structured research.
    """

    print(
        f"[AGENTX] Starting research: {task}"
    )

    # --------------------------------------------------------
    # 1. SEARCH
    # --------------------------------------------------------

    search_results = search_web(
        task,
        max_results=5
    )

    if not search_results:

        return {
            "status": "failed",
            "message": (
                "AGENTX could not find web sources "
                "for this task."
            ),
            "sources": [],
            "findings": []
        }

    sources = []
    findings = []

    # --------------------------------------------------------
    # 2. PROCESS TOP 3 SOURCES
    # --------------------------------------------------------

    for result in search_results[:3]:

        page = extract_page_content(
            result["url"]
        )

        # ----------------------------------------------------
        # Store source metadata
        # ----------------------------------------------------

        source = {
            "title": result["title"],
            "url": result["url"],
            "snippet": result["snippet"]
        }

        sources.append(source)

        # ----------------------------------------------------
        # Generate concise finding
        # ----------------------------------------------------

        if page["text"]:

            finding_text = create_research_finding(
                result["title"],
                page["text"],
                max_sentences=5
            )

            if finding_text:

                findings.append(
                    {
                        "source": result["title"],
                        "url": result["url"],
                        "content": finding_text
                    }
                )

    # --------------------------------------------------------
    # 3. HANDLE EXTRACTION FAILURE
    # --------------------------------------------------------

    if not findings:

        return {
            "status": "failed",
            "message": (
                "AGENTX found web sources but could not "
                "extract useful research findings."
            ),
            "query": task,
            "sources": sources,
            "findings": [],
            "source_count": len(sources)
        }

    print(
        f"[AGENTX] Research findings generated: "
        f"{len(findings)}"
    )

    # --------------------------------------------------------
    # 4. RETURN STRUCTURED RESEARCH
    # --------------------------------------------------------

    return {
        "status": "completed",
        "message": (
            f"AGENTX researched the web for: {task}"
        ),
        "query": task,
        "sources": sources,
        "findings": findings,
        "source_count": len(sources)
    }


# ============================================================
# TOOL LAYER
# ============================================================

def calculate_expression(expression: str) -> Dict[str, Any]:
    """
    Safely evaluate basic arithmetic without using eval().
    Supports numbers, +, -, *, /, %, ** and parentheses.
    """

    import ast
    import operator

    allowed_binary = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
    }

    allowed_unary = {
        ast.UAdd: operator.pos,
        ast.USub: operator.neg,
    }

    def evaluate(node):
        if isinstance(node, ast.Expression):
            return evaluate(node.body)

        if isinstance(node, ast.Constant) and isinstance(
            node.value, (int, float)
        ):
            return node.value

        if isinstance(node, ast.BinOp) and type(node.op) in allowed_binary:
            left = evaluate(node.left)
            right = evaluate(node.right)

            # Prevent accidental resource exhaustion.
            if isinstance(node.op, ast.Pow) and abs(right) > 100:
                raise ValueError("Exponent is too large.")

            return allowed_binary[type(node.op)](left, right)

        if isinstance(node, ast.UnaryOp) and type(node.op) in allowed_unary:
            return allowed_unary[type(node.op)](evaluate(node.operand))

        raise ValueError("Only basic arithmetic expressions are supported.")

    try:
        parsed = ast.parse(expression.strip(), mode="eval")
        value = evaluate(parsed)

        return {
            "status": "completed",
            "expression": expression.strip(),
            "answer": value,
        }

    except Exception as error:
        return {
            "status": "failed",
            "expression": expression.strip(),
            "message": f"Could not calculate the expression: {error}",
        }


def extract_calculation_expression(task: str) -> str:
    """
    Extract a basic arithmetic expression from common user wording.
    """

    cleaned = task.strip()

    patterns = [
        r"(?:calculate|compute|solve|what is|what's)\s*[:\-]?\s*(.+)$",
        r"^\s*([0-9\s\+\-\*\/\%\(\)\.\^]+)\s*$",
    ]

    for pattern in patterns:
        match = re.search(pattern, cleaned, flags=re.IGNORECASE)

        if match:
            expression = match.group(1).strip()
            expression = expression.replace("^", "**")
            return expression

    return cleaned


def select_tool(task_type: str) -> str:
    """
    Select the execution tool for the classified task.
    """

    tool_map = {
        "research": "web_research",
        "calculation": "calculator",
        "build": "build_planner",
        "analysis": "analysis_engine",
        "general": "general_reasoner",
    }

    return tool_map.get(task_type, "general_reasoner")


# ============================================================
# BUILD PLANNER
# ============================================================

def create_build_plan(task: str) -> Dict[str, Any]:
    """
    Create a concrete software-development plan from the user's task.

    This deterministic layer gives AGENTX a useful build result without
    pretending that files were modified or code was deployed.
    """

    task_lower = task.lower()

    components = []
    stack = []

    if any(word in task_lower for word in ["website", "frontend", "ui", "dashboard"]):
        components.extend([
            "Responsive frontend interface",
            "Reusable UI components",
            "Client-side validation and interaction",
        ])
        stack.extend(["Next.js/React", "TypeScript", "CSS"])

    if any(word in task_lower for word in ["api", "backend", "server", "service"]):
        components.extend([
            "Backend API layer",
            "Request validation",
            "Error handling",
        ])
        stack.extend(["FastAPI or Node.js", "REST API"])

    if any(word in task_lower for word in ["database", "db", "mysql", "postgres", "storage"]):
        components.extend([
            "Persistent data model",
            "Database access layer",
            "Data validation",
        ])
        stack.extend(["PostgreSQL/MySQL", "ORM or SQL layer"])

    if any(word in task_lower for word in ["ai", "ml", "machine learning", "model", "prediction"]):
        components.extend([
            "AI/ML inference layer",
            "Input preprocessing",
            "Model-result validation",
        ])
        stack.extend(["Python", "scikit-learn/TensorFlow/PyTorch"])

    if any(word in task_lower for word in ["authentication", "login", "signup", "user"]):
        components.append("Authentication and authorization")
        stack.append("JWT/session-based authentication")

    if not components:
        components = [
            "User-facing input/interface",
            "Core application logic",
            "Validation and error handling",
            "Structured output",
        ]

    if not stack:
        stack = [
            "Choose the frontend/backend stack according to requirements",
            "Use REST/JSON interfaces where services are separated",
        ]

    components = list(dict.fromkeys(components))
    stack = list(dict.fromkeys(stack))

    phases = [
        "Define requirements and success criteria",
        "Design the solution architecture",
        "Implement the core functionality",
        "Test the implementation",
        "Prepare deployment and documentation",
    ]

    return {
        "status": "completed",
        "tool": "build_planner",
        "task": task,
        "objective": f"Plan implementation for: {task}",
        "components": components,
        "suggested_stack": stack,
        "phases": phases,
        "deliverables": [
            "Architecture outline",
            "Implementation checklist",
            "Testing checklist",
            "Deployment checklist",
        ],
        "message": (
            "AGENTX generated a structured development plan. "
            "Actual file modification and deployment require "
            "an explicitly connected execution tool."
        ),
    }


# ============================================================
# ANALYSIS ENGINE
# ============================================================

def analyze_task(
    task: str,
    context: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """Produce a structured analysis framework without inventing data."""

    task_lower = task.lower()
    context = context or {}

    focus = []

    if any(word in task_lower for word in ["business", "market", "company", "startup"]):
        focus.extend([
            "Market opportunity",
            "Customer/user segments",
            "Competitive position",
            "Business risks",
        ])

    if any(word in task_lower for word in ["data", "dataset", "statistics", "metrics"]):
        focus.extend([
            "Data quality",
            "Distribution and trends",
            "Outliers/anomalies",
            "Key metrics",
        ])

    if any(word in task_lower for word in ["project", "system", "software", "technical"]):
        focus.extend([
            "Architecture",
            "Functional requirements",
            "Reliability and scalability",
            "Security and maintainability",
        ])

    if not focus:
        focus = [
            "Problem definition",
            "Relevant evidence",
            "Patterns and relationships",
            "Risks",
        ]

    focus = list(dict.fromkeys(focus))

    context_evidence = None
    if context.get("used"):
        context_evidence = {
            "previous_task": context.get("previous_task"),
            "previous_task_id": context.get("previous_task_id"),
            "previous_result": context.get("previous_result"),
        }

    evidence_status = (
        "Using the previous AGENTX task as contextual evidence; "
        "no new external dataset was supplied."
        if context.get("used")
        else "No external dataset was supplied to this request."
    )

    return {
        "status": "completed",
        "tool": "analysis_engine",
        "task": task,
        "objective": f"Analyze: {task}",
        "context_used": bool(context.get("used")),
        "context_evidence": context_evidence,
        "dimensions": [
            "Objective and scope",
            "Inputs/evidence required",
            "Key patterns or drivers",
            "Risks and limitations",
            "Actionable recommendations",
        ],
        "focus_areas": focus,
        "evidence_status": evidence_status,
        "limitations": [
            "No numerical conclusions are fabricated without supporting data.",
            "Actual dataset analysis can be performed when a file/data tool is connected.",
        ],
        "recommended_next_steps": [
            "Provide the relevant dataset, document, or structured evidence",
            "Validate the data and define the target metrics",
            "Run the selected analysis methods",
            "Verify the resulting insights before delivery",
        ],
        "message": (
            "AGENTX created a structured analysis report without "
            "inventing unsupported findings."
        ),
    }


# ============================================================
# GENERAL TASK REASONER
# ============================================================

def reason_general_task(task: str) -> Dict[str, Any]:
    """Structure a general request into actionable next steps."""

    return {
        "status": "completed",
        "tool": "general_reasoner",
        "task": task,
        "objective": task,
        "actions": [
            "Clarify the requested outcome",
            "Identify the information or resources required",
            "Execute the appropriate task-specific operation",
            "Verify the result",
            "Deliver the final outcome",
        ],
        "message": (
            "AGENTX structured the request and prepared an "
            "action-oriented execution path."
        ),
    }


# ============================================================
# GENERAL EXECUTION
# ============================================================

def execute_task(
    task: str,
    task_type: str,
    context: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Route the task to the appropriate AGENTX tool.
    """

    selected_tool = select_tool(task_type)
    context = context or {}
    execution_task = context.get("resolved_task", task)

    print(
        f"[AGENTX] Selected tool: {selected_tool}"
    )

    # --------------------------------------------------------
    # Web research
    # --------------------------------------------------------

    if task_type == "research":

        result = perform_research(execution_task)
        result["tool"] = selected_tool

        return result

    # --------------------------------------------------------
    # Calculator
    # --------------------------------------------------------

    if task_type == "calculation":

        expression = extract_calculation_expression(execution_task)

        result = calculate_expression(expression)
        result["tool"] = selected_tool

        return result

    # --------------------------------------------------------
    # Build planner
    # --------------------------------------------------------

    if task_type == "build":
        return create_build_plan(execution_task)

    # --------------------------------------------------------
    # Analysis engine
    # --------------------------------------------------------

    if task_type == "analysis":
        return analyze_task(execution_task, context)

    # --------------------------------------------------------
    # General reasoner
    # --------------------------------------------------------

    return reason_general_task(execution_task)


# ============================================================
# VERIFICATION
# ============================================================

def verify_result(
    execution_result: Dict[str, Any]
) -> Dict[str, Any]:
    """Verify the execution result using task-specific checks."""

    if execution_result.get("status") != "completed":
        return {
            "status": "failed",
            "passed": False,
            "message": "Execution result failed verification.",
        }

    # Research verification
    if "sources" in execution_result:
        source_count = execution_result.get("source_count", 0)
        findings = execution_result.get("findings", [])
        finding_count = len(findings)

        if source_count > 0 and finding_count > 0:
            unique_urls = {
                item.get("url")
                for item in execution_result.get("sources", [])
                if item.get("url")
            }

            return {
                "status": "verified",
                "passed": True,
                "message": (
                    f"Verification passed. AGENTX collected "
                    f"{source_count} web source(s), generated "
                    f"{finding_count} finding(s), and retained "
                    f"{len(unique_urls)} unique source URL(s)."
                ),
            }

        return {
            "status": "failed",
            "passed": False,
            "message": (
                "Verification failed because useful research "
                "findings were not generated."
            ),
        }

    # Calculator verification
    if execution_result.get("tool") == "calculator":
        answer = execution_result.get("answer")

        if isinstance(answer, (int, float)):
            return {
                "status": "verified",
                "passed": True,
                "message": (
                    "Verification passed. The calculator produced "
                    "a valid numeric result."
                ),
            }

        return {
            "status": "failed",
            "passed": False,
            "message": (
                "Calculation verification failed: no valid numeric "
                "answer was produced."
            ),
        }

    # Build verification
    if execution_result.get("tool") == "build_planner":
        components = execution_result.get("components", [])
        phases = execution_result.get("phases", [])
        passed = bool(components and phases)

        return {
            "status": "verified" if passed else "failed",
            "passed": passed,
            "message": (
                "Verification passed. The development plan contains "
                "components and implementation phases."
                if passed
                else "Verification failed because the build plan is incomplete."
            ),
        }

    # Analysis verification
    if execution_result.get("tool") == "analysis_engine":
        focus_areas = execution_result.get("focus_areas", [])
        next_steps = execution_result.get("recommended_next_steps", [])
        passed = bool(focus_areas and next_steps)

        return {
            "status": "verified" if passed else "failed",
            "passed": passed,
            "message": (
                "Verification passed. The analysis contains focus areas "
                "and evidence-driven next steps."
                if passed
                else "Verification failed because the analysis structure is incomplete."
            ),
        }

    # General verification
    return {
        "status": "verified",
        "passed": True,
        "message": (
            "Execution result passed the current verification check."
        ),
    }


# ============================================================
# DELIVER
# ============================================================

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

        "status": (
            "completed"
            if verification.get("passed")
            else "failed"
        ),

        "summary": (
            f"AGENTX processed the task: {task}"
        ),

        "understanding": understanding,

        "plan": plan,

        "execution": execution,

        "execution_status": execution.get(
            "status",
            "unknown"
        ),

        "tool": execution.get(
            "tool",
            select_tool(
                understanding.get("task_type", "general")
            )
        ),

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
        "version": "0.9.0"
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "agentx-api",
        "version": "0.9.0"
    }


# ============================================================
# TASK HISTORY ENDPOINTS
# ============================================================

@app.get("/api/tasks")
def get_tasks():
    """Return persisted tasks, newest first."""
    tasks = load_tasks()
    tasks.sort(key=lambda item: item.get("created_at", ""), reverse=True)

    return {
        "success": True,
        "tasks": tasks,
    }


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    """Return one persisted task by id."""
    tasks = load_tasks()

    for task in tasks:
        if task.get("id") == task_id:
            return {
                "success": True,
                "task": task,
            }

    return {
        "success": False,
        "message": "Task not found.",
    }


# ============================================================
# TASK EXECUTION ENDPOINT
# ============================================================

@app.post("/api/tasks")
def create_task(
    request: TaskRequest
):

    # --------------------------------------------------------
    # Clean task
    # --------------------------------------------------------

    task = request.task.strip()

    if not task:

        return {
            "success": False,
            "message": "Task cannot be empty."
        }

    print(
        f"\n[AGENTX] New task received: {task}"
    )

    # --------------------------------------------------------
    # CONTEXT
    # --------------------------------------------------------

    context = resolve_task_context(task)

    if context.get("used"):
        print(
            "[AGENTX] Context linked to previous task: "
            f"{context.get('previous_task')}"
        )

    # --------------------------------------------------------
    # 1. UNDERSTAND
    # --------------------------------------------------------

    understanding = understand_task(task, context)

    task_type = understanding["task_type"]

    print(
        f"[AGENTX] Task type: {task_type}"
    )

    # --------------------------------------------------------
    # 2. PLAN
    # --------------------------------------------------------

    plan = plan_task(
        task,
        task_type
    )

    print(
        "[AGENTX] Plan generated."
    )

    # --------------------------------------------------------
    # 3. EXECUTE
    # --------------------------------------------------------

    execution = execute_task(
        task,
        task_type,
        context,
    )

    print(
        "[AGENTX] Execution completed."
    )

    # --------------------------------------------------------
    # 4. VERIFY
    # --------------------------------------------------------

    verification = verify_result(
        execution
    )

    print(
        "[AGENTX] Verification completed."
    )

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

    print(
        "[AGENTX] Result delivered."
    )

    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    task_record = add_task_record(
        task,
        {
            "success": bool(verification.get("passed")),
            "agent": "AGENTX",
            "pipeline": PIPELINE,
            "context": {
                "used": bool(context.get("used")),
                "previous_task": context.get("previous_task"),
                "previous_task_id": context.get("previous_task_id"),
                "reason": context.get("reason"),
            },
            "result": result,
        },
    )

    return {
        "success": bool(verification.get("passed")),
        "agent": "AGENTX",
        "pipeline": PIPELINE,
        "result": result,
        "task_record": task_record,
    }