
from app.core.firebase import get_firestore_client

def list_schools():
    db = get_firestore_client()
    schools = db.collection("schools").stream()
    for school in schools:
        print(f"ID: {school.id}, Name: {school.to_dict().get('name')}")

if __name__ == "__main__":
    list_schools()
