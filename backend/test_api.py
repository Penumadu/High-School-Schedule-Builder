import urllib.request
import json

base_url = "http://localhost:8000/api/v1/admin"
school_id = "demo-school"
teacher_id = "default_0"

def fetch_json(url, method="GET", body=None):
    req = urllib.request.Request(url, method=method)
    req.add_header('Authorization', 'Bearer mock-token')
    if body is not None:
        req.add_header('Content-Type', 'application/json')
        data = json.dumps(body).encode('utf-8')
    else:
        data = None
    try:
        with urllib.request.urlopen(req, data=data) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode())
        return None

# 1. Get staff
staff = fetch_json(f"{base_url}/{school_id}/staff")
if staff:
    print(f"Found {len(staff)} staff members.")
    teacher = next((t for t in staff if t.get("teacher_id") == teacher_id or t.get("id") == teacher_id), None)
    
    if not teacher:
        print("Teacher not found, creating test teacher")
        teacher = fetch_json(f"{base_url}/{school_id}/staff", method="POST", body={
            "first_name": "Test", "last_name": "Teacher", "email": "test@test.com", "subject": "Math", "subject_code": "MAT", "specializations": ["Math"]
        })
        print("Created teacher:", teacher)
    else:
        print("Current specializations:", teacher.get("specializations"))

    # 2. Update specializations
    tid = teacher.get("teacher_id") or teacher.get("id")
    print(f"\nUpdating specializations for {tid}...")
    update_data = fetch_json(f"{base_url}/{school_id}/staff/{tid}", method="PUT", body={
        "specializations": ["Math", "Physics", "Chemistry"]
    })
    print("Update response specializations:", update_data.get("specializations") if update_data else None)

    # 3. Get staff again
    final_staff = fetch_json(f"{base_url}/{school_id}/staff")
    final_teacher = next((t for t in final_staff if t.get("teacher_id") == tid or t.get("id") == tid), None)
    print("\nFinal specializations after fetch:", final_teacher.get("specializations") if final_teacher else None)

