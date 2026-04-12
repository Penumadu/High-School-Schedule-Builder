
import json

def transform_subjects():
    input_path = '/Users/sahasrapenumadu/Documents/Srini Learning/Srini Projects/School Schedule Builder/frontend/src/data/default_subjects.json'
    
    with open(input_path, 'r') as f:
        raw_subjects = json.load(f)
    
    processed = []
    for item in raw_subjects:
        processed.append({
            "subject_id": item.get("Course Code", ""),
            "code": item.get("Course Code", ""),
            "name": item.get("Subject", ""),
            "grade_level": item.get("Grade", ""),
            "credits": item.get("Credits", "1 Credit"),
            "level": item.get("Level", ""),
            "department": item.get("Department", ""),
            "prerequisites": item.get("Pre-requisites", ""),
            "required_periods_per_week": 5, # Default
            "is_mandatory": False, # Default
            "facility_type": "REGULAR" # Default
        })
    
    with open(input_path, 'w') as f:
        json.dump(processed, f, indent=2)

    print(f"Transformed {len(processed)} subjects successfully.")

if __name__ == "__main__":
    transform_subjects()
