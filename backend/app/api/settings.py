from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.auth import require_role
from app.core.firebase import get_firestore_client
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["Settings"])

class DayStructureItem(BaseModel):
    type: str # PERIOD, BREAK, LUNCH
    id: str   # e.g. PERIOD_1, BREAK_1
    label: str # e.g. "Period 1", "Break (15 min)"
    duration: str = ""

class SchoolSettings(BaseModel):
    day_structure: List[DayStructureItem]

@router.get("/{school_id}", response_model=SchoolSettings)
async def get_school_settings(
    school_id: str,
    user: dict = Depends(require_role("PRINCIPAL", "COORDINATOR", "SUPER_ADMIN", "GUEST")),
):
    """Retrieve the master configuration/day structure for a school."""
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)
    doc = school_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="School not found")
        
    data = doc.to_dict()
    # Default structure as requested by user if not set
    default_structure = [
        {"type": "PERIOD", "id": "PERIOD_1", "label": "Period 1"},
        {"type": "BREAK", "id": "BREAK_1", "label": "Break (15 min)"},
        {"type": "PERIOD", "id": "PERIOD_2", "label": "Period 2"},
        {"type": "LUNCH", "id": "LUNCH_1", "label": "Lunch (30 min)"},
        {"type": "PERIOD", "id": "PERIOD_3", "label": "Period 3"},
        {"type": "BREAK", "id": "BREAK_2", "label": "Break (15 min)"},
        {"type": "PERIOD", "id": "PERIOD_4", "label": "Period 4"}
    ]
    
    return {
        "day_structure": data.get("day_structure", default_structure)
    }

@router.put("/{school_id}")
async def update_school_settings(
    school_id: str,
    payload: SchoolSettings,
    user: dict = Depends(require_role("PRINCIPAL", "COORDINATOR")),
):
    """Update the master configuration/day structure for a school."""
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)
    
    # Store the day structure as a list of dicts
    school_ref.update({
        "day_structure": [item.model_dump() for item in payload.day_structure]
    })
    
    return {"status": "success", "message": "Settings updated"}
