import urllib.request
import json

base_url = "http://localhost:8000/api/v1/admin"
school_id = "demo-school"
teacher_id = "teacher_f73d899f" # The one I just created

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
        return None

# 1. Update to empty
print(f"Updating specializations to []...")
update_data = fetch_json(f"{base_url}/{school_id}/staff/{teacher_id}", method="PUT", body={
    "specializations": []
})
print("Update response specializations:", update_data.get("specializations") if update_data else None)

# 2. Get staff again
final_staff = fetch_json(f"{base_url}/{school_id}/staff")
final_teacher = next((t for t in final_staff if t.get("teacher_id") == teacher_id or t.get("id") == teacher_id), None)
print("Final specializations after fetch:", final_teacher.get("specializations") if final_teacher else None)

