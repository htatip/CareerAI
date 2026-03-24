from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends
import pdfplumber
import io
from groq import Groq
import re, json, os
from pydantic import BaseModel
from typing import List, Optional
from fastapi.routing import APIRouter
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ── Configuration ─────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
AI_SERVICE_SECRET = os.environ.get("AI_SERVICE_SECRET")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file.")

if not AI_SERVICE_SECRET:
    raise RuntimeError("AI_SERVICE_SECRET is not set. Add it to your .env file.")

client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama-3.1-8b-instant"

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


# ── Shared dependency: service-to-service authentication ──────────────────────
def require_service_secret(x_service_secret: Optional[str] = Header(None)):
    """
    FastAPI dependency applied globally. Every endpoint requires a valid
    X-Service-Secret header matching the shared secret between Java and Python.
    """
    if x_service_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid service secret")

app = FastAPI()
# Apply authentication to all routes by default
Secure = FastAPI(dependencies=[Depends(require_service_secret)])


# ── Shared helper: strip markdown fences and parse JSON from LLM output ───────
def parse_ai_json(content: str) -> dict | list:
    """
    Strip ```json / ``` markdown fences from LLM output and parse to JSON.
    Raises json.JSONDecodeError if the result is not valid JSON.
    """
    cleaned = re.sub(r"```json|```", "", content).strip()
    return json.loads(cleaned)


def parse_ai_json_safe_array(content: str) -> list:
    """
    Like parse_ai_json but falls back to regex extraction of the first JSON
    array when the LLM adds explanation text after the JSON block.
    """
    try:
        return parse_ai_json(content)
    except json.JSONDecodeError:
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


def parse_ai_json_safe_object(content: str) -> dict:
    """
    Like parse_ai_json but falls back to regex extraction of the first JSON
    object when the LLM adds explanation text after the JSON block.
    """
    try:
        return parse_ai_json(content)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


# ── PDF utilities ──────────────────────────────────────────────────────────────
def validate_pdf_file(content: bytes, content_type: str):
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")
    if content_type not in {"application/pdf"}:
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="File does not appear to be a valid PDF.")


def extract_text(file_bytes: bytes) -> str:
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages[:3]:
            page_text = page.extract_text()
            if page_text:
                text += page_text
    return text[:4000]


def extract_skills_llm(text: str) -> dict:
    prompt = f"""Extract technical skills from this resume. Return ONLY this exact JSON format with no other text:
{{"skills": ["skill1", "skill2", "skill3"]}}

Resume:
{text}"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )
    content = response.choices[0].message.content
    content = re.sub(r"```json|```", "", content).strip()
    try:
        parsed = json.loads(content)
        if "skills" in parsed:
            return parsed
        elif isinstance(parsed, list):
            return {"skills": parsed}
        else:
            for key, val in parsed.items():
                if isinstance(val, list):
                    return {"skills": val}
            return {"skills": []}
    except Exception:
        return {"skills": []}


# ── Request models ─────────────────────────────────────────────────────────────
class MatchRequest(BaseModel):
    resume_skills: list[str]
    job_description: str


class ResumeAnalysisRequest(BaseModel):
    resume_text: str


class JobRankingRequest(BaseModel):
    resume_skills: list
    jobs: list


class ResumeImproveRequest(BaseModel):
    resume_text: str


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"service": "running"}

@Secure.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    content = await file.read()
    validate_pdf_file(content, file.content_type or "")
    text = extract_text(content)
    result = extract_skills_llm(text)
    return {"text": text, "skills": result["skills"]}


@Secure.post("/match-job")
async def match_job(resume_skills: List[str], job_skills: List[str]):
    resume_set = set(s.lower() for s in resume_skills)
    job_set = set(s.lower() for s in job_skills)
    matched = resume_set.intersection(job_set)
    missing = job_set - resume_set
    score = (len(matched) / len(job_set)) * 100 if job_set else 0
    return {
        "match_score": round(score, 2),
        "matched_skills": list(matched),
        "missing_skills": list(missing)
    }


@Secure.post("/ai-resume-job-analysis")
async def ai_resume_job_analysis(data: MatchRequest):
    prompt = f"""You are an AI career advisor. Analyze resume skills vs job description.
Return ONLY JSON with: Match Score (0-100), Matched Skills, Missing Skills, Resume improvement suggestions.
Resume Skills: {data.resume_skills}
Job Description: {data.job_description[:2000]}"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are an expert resume analyzer. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800
    )
    return parse_ai_json(response.choices[0].message.content)


@Secure.post("/ai-resume-analysis")
async def ai_resume_analysis(data: ResumeAnalysisRequest):
    prompt = f"""Analyze this resume. Return ONLY JSON with:
ATS_Score (0-100), Strengths (list), Weaknesses (list), Suggestions (list).
Resume: {data.resume_text[:3000]}"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a professional resume analyzer. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800
    )
    return parse_ai_json(response.choices[0].message.content)


@Secure.post("/rank-jobs")
def rank_jobs(data: JobRankingRequest):
    if not data.jobs:
        return {"message": "No jobs provided"}
    prompt = f"""You are a job matching expert. Score each job based on how well the resume skills match.

IMPORTANT SCORING RULES:
- match_score must be a percentage from 0 to 100
- 80-100 = excellent match (most required skills present)
- 60-79 = good match (many skills match)
- 40-59 = moderate match (some skills match)
- 20-39 = weak match (few skills match)
- 0-19 = poor match (almost no skills match)

Return ONLY a JSON array with no other text:
[{{"job_title":"","match_score":75,"reason":"brief reason"}}]

Resume Skills: {data.resume_skills}
Jobs to rank: {data.jobs[:10]}"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You rank jobs. Return only valid JSON array."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800
    )
    try:
        return parse_ai_json_safe_array(response.choices[0].message.content)
    except Exception:
        return {"error": "AI response not valid JSON", "raw_response": response.choices[0].message.content}


@Secure.post("/improve-resume")
def improve_resume(data: ResumeImproveRequest):
    prompt = f"""Analyze this resume and suggest improvements. Return ONLY JSON with:
weak_sections (list), improvement_suggestions (list), example_rewrites (object).
Resume: {data.resume_text[:3000]}"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You improve resumes. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800
    )
    try:
        return parse_ai_json_safe_object(response.choices[0].message.content)
    except Exception:
        raw = response.choices[0].message.content
        return {"weak_sections": [], "improvement_suggestions": [raw], "example_rewrites": {}}



