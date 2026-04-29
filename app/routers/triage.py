"""
Symptom-to-specialty triage.
Mounted at /api/triage  (POST)

Current implementation: deterministic keyword classifier.

TODO (swap to OpenAI):
    from openai import OpenAI
    client = OpenAI()  # reads OPENAI_API_KEY from env

    SYSTEM_PROMPT = '''
    You are a medical triage assistant. Given a symptom description, return JSON:
    {
      "suggestions": [
        {"specialty": "Cardiology", "confidence": 0.92, "rationale": "..."}
      ],
      "redFlags": ["Chest pain radiating to arm — call 127 immediately"]
    }
    Return 1–3 suggestions ordered by confidence. Never diagnose, always recommend
    consulting a licensed physician. Reference Ligji 124/2025 in disclaimer.
    '''

    async def openai_classify(text: str, locale: str) -> TriageResponse:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"locale={locale}\n\n{text}"},
            ],
        )
        return TriageResponse.model_validate_json(resp.choices[0].message.content)
"""

import time
import threading
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(tags=["triage"])

# ── In-memory rate limit (10 req / IP / hour) ─────────────────────────────
# TODO: replace with Redis INCR + EXPIRE for multi-process / multi-pod deploys.
_TRIAGE_LIMIT = 10
_TRIAGE_WINDOW = 3600  # seconds

_lock = threading.Lock()
_counters: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    with _lock:
        hits = _counters[ip]
        _counters[ip] = [t for t in hits if now - t < _TRIAGE_WINDOW]
        if len(_counters[ip]) >= _TRIAGE_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="Triage rate limit: 10 requests per hour per IP.",
            )
        _counters[ip].append(now)


# ── Schemas ───────────────────────────────────────────────────────────────

class TriageRequest(BaseModel):
    text: str = Field(min_length=10, max_length=2000)
    locale: str = Field(default="en", pattern="^(sq|en|it)$")


class TriageSuggestion(BaseModel):
    specialty: str
    confidence: float  # 0.0 – 1.0
    rationale: str


class TriageResponse(BaseModel):
    suggestions: list[TriageSuggestion]
    red_flags: list[str]


# ── Keyword classifier ────────────────────────────────────────────────────

_RULES: list[tuple[list[str], str, str]] = [
    # (keywords, specialty, rationale_en)
    (
        ["chest pain", "heart", "palpitation", "shortness of breath", "dyspnea",
         "angina", "arrhythmia", "irregular heartbeat", "dhimbje gjoksi",
         "palpitacion", "dolor pecho"],
        "Cardiology",
        "Symptoms suggest a cardiac origin. A cardiologist can perform ECG, echocardiography, and stress testing.",
    ),
    (
        ["headache", "migraine", "seizure", "numbness", "tingling", "dizziness",
         "vertigo", "tremor", "weakness", "stroke", "dhimbje koke", "marrje mendsh",
         "cefalea", "emicrania"],
        "Neurology",
        "Neurological symptoms warrant evaluation by a neurologist for differential diagnosis including migraine, TIA, or demyelinating disease.",
    ),
    (
        ["skin", "rash", "itch", "acne", "eczema", "psoriasis", "mole", "lesion",
         "dermatitis", "lëkurë", "kruarje", "skërmim"],
        "Dermatology",
        "Skin-related complaints are best assessed by a dermatologist who can perform dermoscopy and biopsy if indicated.",
    ),
    (
        ["stomach", "abdomen", "nausea", "vomiting", "diarrhea", "constipation",
         "bloating", "heartburn", "acid reflux", "rectal bleeding", "barkun",
         "të vjella", "stomaco", "diarrea"],
        "Gastroenterology",
        "Gastrointestinal symptoms require specialist evaluation. A gastroenterologist may recommend endoscopy or colonoscopy.",
    ),
    (
        ["cough", "shortness of breath", "wheezing", "asthma", "bronchitis",
         "pneumonia", "copd", "kollë", "frymëmarrje", "tosse", "dispnea"],
        "Pulmonology",
        "Respiratory symptoms suggest a pulmonary cause. A pulmonologist can perform spirometry and chest imaging review.",
    ),
    (
        ["joint pain", "arthritis", "swollen joint", "lupus", "back pain", "spine",
         "dhimbje nyje", "artrit", "dolore articolare", "artrite"],
        "Rheumatology",
        "Joint and connective-tissue symptoms are best managed by a rheumatologist who can order autoimmune panels.",
    ),
    (
        ["depression", "anxiety", "panic", "mood", "sleep", "insomnia", "trauma",
         "ptsd", "adhd", "mental", "depresion", "ankth", "depressione", "ansia"],
        "Psychiatry",
        "Mental health symptoms benefit from structured psychiatric evaluation including pharmacotherapy and psychotherapy assessment.",
    ),
    (
        ["diabetes", "thyroid", "weight gain", "fatigue", "hormones", "cortisol",
         "diabetes", "tiroide", "diabeti", "tireoide", "stancanza"],
        "Endocrinology",
        "Metabolic and endocrine symptoms require laboratory workup and specialist review by an endocrinologist.",
    ),
    (
        ["ear", "hearing", "nose", "throat", "tonsil", "sinusitis", "snoring",
         "vesh", "hundë", "fyt", "orecchio", "naso", "gola"],
        "ENT",
        "Ear, nose, and throat complaints are best assessed by an ENT specialist who can perform nasendoscopy and audiometry.",
    ),
    (
        ["eye", "vision", "blurred", "cataract", "glaucoma", "retina",
         "sy", "vizion", "occhio", "visione"],
        "Ophthalmology",
        "Visual or ocular symptoms require slit-lamp examination and IOP measurement by an ophthalmologist.",
    ),
    (
        ["child", "infant", "baby", "fever in child", "vaccination", "growth",
         "fëmijë", "temperaturë", "bambino", "febbre"],
        "Pediatrics",
        "Paediatric symptoms require age-specific assessment by a specialist in paediatric medicine.",
    ),
    (
        ["pregnancy", "gynecology", "period", "menstrual", "ovary", "uterus",
         "shtatzëni", "menstruacion", "gravidanza", "mestruazioni"],
        "Gynecology",
        "Gynaecological symptoms require examination by a gynaecologist who can perform pelvic ultrasound and relevant testing.",
    ),
    (
        ["urine", "kidney", "urinary", "prostate", "bladder", "urology",
         "urinë", "veshkë", "urina", "prostata"],
        "Urology",
        "Urological symptoms warrant cystoscopy or imaging evaluation by a urologist.",
    ),
    (
        ["bone", "fracture", "knee", "hip", "shoulder", "sports injury",
         "kockë", "frakturë", "ginocchio", "anca"],
        "Orthopedics",
        "Musculoskeletal and orthopaedic symptoms require clinical examination and imaging by an orthopaedic specialist.",
    ),
    (
        ["cancer", "tumour", "tumor", "mass", "lymph node", "chemotherapy",
         "kancer", "tumor", "cancro", "tumore"],
        "Oncology",
        "Oncological concerns require urgent specialist referral for staging workup and multidisciplinary review.",
    ),
]

_RED_FLAG_RULES: list[tuple[list[str], str]] = [
    (["chest pain", "dhimbje gjoksi", "dolore toracico"],
     "Chest pain radiating to the arm or jaw — call emergency services (127) immediately."),
    (["stroke", "facial droop", "arm weakness", "speech slurred", "goditje"],
     "Sudden facial drooping, arm weakness, or slurred speech — FAST criteria for stroke. Call 127."),
    (["suicidal", "kill myself", "self-harm", "vetëvrasje", "suicidio"],
     "If you are having thoughts of harming yourself, please call the mental health crisis line immediately."),
    (["difficulty breathing", "cannot breathe", "blue lips", "cyanosis"],
     "Severe difficulty breathing or bluish lips — call emergency services immediately."),
    (["unconscious", "fainted", "unresponsive", "humbje vetëdije"],
     "Loss of consciousness — place in recovery position and call 127."),
    (["severe bleeding", "gjakderdhje", "emorragia grave"],
     "Severe uncontrolled bleeding — apply direct pressure and call emergency services."),
    (["allergic reaction", "throat swelling", "anaphylaxis", "anafilaksi"],
     "Signs of anaphylaxis — use epinephrine auto-injector if available and call 127."),
]


def _classify(text: str) -> TriageResponse:
    text_lower = text.lower()
    scored: list[tuple[float, str, str]] = []

    for keywords, specialty, rationale in _RULES:
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits:
            confidence = min(0.3 + (hits / len(keywords)) * 0.7, 0.95)
            scored.append((confidence, specialty, rationale))

    scored.sort(key=lambda x: x[0], reverse=True)
    suggestions = [
        TriageSuggestion(specialty=s, confidence=round(c, 2), rationale=r)
        for c, s, r in scored[:3]
    ]

    if not suggestions:
        suggestions = [
            TriageSuggestion(
                specialty="General Medicine",
                confidence=0.5,
                rationale="Symptoms do not match a specific specialty pattern. A general practitioner can perform initial assessment and refer appropriately.",
            )
        ]

    red_flags: list[str] = []
    for triggers, message in _RED_FLAG_RULES:
        if any(t in text_lower for t in triggers):
            red_flags.append(message)

    return TriageResponse(suggestions=suggestions, red_flags=red_flags)


# ── Endpoint ──────────────────────────────────────────────────────────────

@router.post("/triage", response_model=TriageResponse)
def triage(payload: TriageRequest, request: Request) -> TriageResponse:
    forwarded = request.headers.get("x-forwarded-for")
    ip = (
        forwarded.split(",")[0].strip()
        if forwarded
        else (request.client.host if request.client else "unknown")
    )
    _check_rate_limit(ip)
    return _classify(payload.text)
