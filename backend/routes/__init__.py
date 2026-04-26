from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok"}

# Example: patient data route placeholder
@router.get("/patients")
def get_patients():
    return {"patients": [], "message": "Add your patient data logic here"}
