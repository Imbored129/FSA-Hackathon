from pydantic import BaseModel
from typing import Optional

# Example model — expand as needed
class Patient(BaseModel):
    id: Optional[int] = None
    name: str
    age: int
    condition: str
    notes: Optional[str] = None
