import urllib.request
import json

base_url = "http://localhost:8000"
school_id = "test_school"
teacher_id = "T1"

def req(url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())
    except Exception as e:
        return 0, str(e)

print("Fetching staff...")
status, staff = req(f"{base_url}/admin/{school_id}/staff")
print("GET status:", status)

teacher = next((t for t in staff if t.get("teacher_id") == teacher_id), None)
if teacher:
    print(f"Current specializations: {teacher.get('specializations')}")
else:
    print("Teacher not found, creating...")
    payload = {
        "first_name": "Test",
        "last_name": "Teacher",
        "email": "test@example.com",
        "subject": "Science",
        "subject_code": "SCI1",
        "specializations": ["Biology"],
        "max_periods_per_week": 25,
        "off_times": []
    }
    status, res = req(f"{base_url}/admin/{school_id}/staff", method="POST", data=payload)
    teacher_id = res["teacher_id"]
    print("Created teacher:", teacher_id)

update_payload = {"specializations": ["Physics", "Chemistry"]}
print("Sending PUT:", update_payload)
status, res = req(f"{base_url}/admin/{school_id}/staff/{teacher_id}", method="PUT", data=update_payload)
print("PUT status:", status)
print("PUT response:", res)

status, staff = req(f"{base_url}/admin/{school_id}/staff")
teacher = next((t for t in staff if t.get("teacher_id") == teacher_id), None)
print(f"After update specializations: {teacher.get('specializations') if teacher else 'None'}")

