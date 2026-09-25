from pathlib import Path

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI()

# ---------------------------------------------------------------------------
# Robust paths — resolved relative to this file, NOT the current working
# directory. This means `uvicorn main:app ...` works no matter which
# directory it is launched from.
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "Mental_Health_Model.pkl"
INDEX_HTML_PATH = BASE_DIR / "index.html"
STYLE_CSS_PATH = BASE_DIR / "style.css"
SCRIPT_JS_PATH = BASE_DIR / "script.js"

# ---------------------------------------------------------------------------
# CORS: no longer needed. Frontend and backend are now served from the SAME
# FastAPI origin (port 8000), so the browser never makes a cross-origin
# request and no CORS middleware is required.
# ---------------------------------------------------------------------------

# Load trained ML model (absolute path — robust regardless of cwd)
try:
    model = joblib.load(MODEL_PATH)
except Exception as exc:  # noqa: BLE001
    raise RuntimeError(
        f"Failed to load model from {MODEL_PATH}. "
        f"Make sure Mental_Health_Model.pkl is in the same directory as main.py."
    ) from exc


# Pydantic Model
class StudentData(BaseModel):

    age: int = Field(..., ge=10, le=100)

    gender: Literal['Male', 'Female']

    country: str

    academic_level: Literal[
        'Undergraduate',
        'Graduate',
        'High School'
    ]

    most_used_platform: Literal[
        'Facebook',
        'LinkedIn',
        'Instagram',
        'Snapchat',
        'Twitter',
        'YouTube',
        'TikTok',
        'LINE',
        'KakaoTalk',
        'VKontakte',
        'WhatsApp',
        'WeChat'
    ]

    purpose_of_use: Literal[
        'Networking',
        'Education',
        'Entertainment',
        'News'
    ]

    avg_daily_usage_hours: float = Field(..., ge=0, le=24)

    daily_unlocks: int = Field(..., ge=0)

    study_hours: float = Field(..., ge=0, le=24)

    physical_activity_hours: float = Field(..., ge=0, le=24)

    sleep_hours_per_night: float = Field(..., ge=0, le=24)

    stress_level: Literal[
        'Low',
        'Medium',
        'High',
        'Very High'
    ]


# Response model
class PredictionResponse(BaseModel):
    predicted_mental_health_score: float


# Countries that have their own category in the ML dataset
top_countries = [
    'Other',
    'India',
    'USA',
    'Canada',
    'Australia',
    'UK',
    'Germany',
    'Mexico',
    'Turkey',
    'France'
]


# ---------------------------------------------------------------------------
# Frontend routes — FastAPI now serves the MindScore AI UI directly, so the
# app is fully usable from the single port-8000 origin.
# ---------------------------------------------------------------------------
@app.get('/')
def serve_index():
    return FileResponse(INDEX_HTML_PATH, media_type="text/html")


@app.get('/style.css')
def serve_css():
    return FileResponse(STYLE_CSS_PATH, media_type="text/css")


@app.get('/script.js')
def serve_js():
    return FileResponse(SCRIPT_JS_PATH, media_type="application/javascript")


# ---------------------------------------------------------------------------
# Prediction route
# ---------------------------------------------------------------------------
@app.post('/predict', response_model=PredictionResponse)
def predict(data: StudentData):

    # Group countries exactly as done during training
    country_group = (
        data.country
        if data.country in top_countries
        else "Other"
    )

    # Create DataFrame for the ML model — column names preserved exactly as
    # the trained model expects them.
    input_row = pd.DataFrame([{
        'Age': data.age,
        'Gender': data.gender,
        'Academic_Level': data.academic_level,
        'Most_Used_Platform': data.most_used_platform,
        'Purpose_Of_Use': data.purpose_of_use,
        'Avg_Daily_Usage_Hours': data.avg_daily_usage_hours,
        'Daily_Unlocks': data.daily_unlocks,
        'Study_Hours': data.study_hours,
        'Physical_Activity_Hours': data.physical_activity_hours,
        'Sleep_Hours_Per_Night': data.sleep_hours_per_night,
        'Stress_Level': data.stress_level,
        'Grouped_country': country_group
    }])

    try:
        prediction = model.predict(input_row)[0]
    except Exception as exc:  # noqa: BLE001
        # Clean, predictable error instead of a raw stack trace leaking to
        # the client. FastAPI's own validation errors (422) are handled
        # automatically and don't hit this branch.
        raise HTTPException(
            status_code=500,
            detail=f"Model failed to generate a prediction: {exc}"
        ) from exc

    return PredictionResponse(
        predicted_mental_health_score=round(float(prediction))
    )