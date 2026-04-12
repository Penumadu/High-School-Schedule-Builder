
import json
import re
from collections import defaultdict

# The original raw data (truncated for brevity in the script, but I'll use the logic for the whole file if I can)
# I'll read the existing raw_data from the previous script if possible, or just copy it.
# Actually, I'll read process_teachers_v3.py to get the raw_data.

def aggregate_teachers():
    with open('/Users/sahasrapenumadu/Documents/Srini Learning/Srini Projects/School Schedule Builder/scratch/process_teachers_v3.py', 'r') as f:
        content = f.read()
    
    # Extract raw_data using regex (lazy way but effective for this context)
    match = re.search(r'raw_data = \[(.*?)\]', content, re.DOTALL)
    if not match:
        print("Could not find raw_data in v3 script")
        return
    
    raw_data_str = f"[{match.group(1)}]"
    raw_data = json.loads(re.sub(r'(\w+):', r'"\1":', raw_data_str).replace("'", '"'))

    # Aggregator dictionary
    # Key: Simplified Name (First Last)
    teachers = defaultdict(lambda: {
        "first_name": "",
        "last_name": "",
        "subjects": set(),
        "subject_codes": set(),
        "specializations": set(),
        "email": ""
    })

    def clean_name(name):
        name = re.sub(r'^(Ms\.|Mr\.|Mx\.|Dr\.)\s*', '', name)
        # Remove parenthetical info like (for Ms. Nicole Dimas)
        name = re.sub(r'\(.*?\)', '', name).strip()
        if ' and ' in name:
            return [n.strip() for n in name.split(' and ')]
        return [name.strip()]

    for item in raw_data:
        names = clean_name(item['teacher'])
        raw_subj = item['subject']
        raw_code = item['subject_code']
        
        # Split subjects if they contain slash
        subjs = [s.strip() for s in re.split(r'[/,&]|\s\/\s', raw_subj) if s.strip()]
        
        for name in names:
            name_parts = name.split(' ')
            first = name_parts[0]
            last = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            key = f"{first} {last}".strip()
            t = teachers[key]
            t["first_name"] = first
            t["last_name"] = last
            
            # Add to sets
            t["subjects"].update(subjs)
            t["subject_codes"].add(raw_code)
            
            # Simple email generation if not set
            if not t["email"]:
                safe_first = re.sub(r'\W+', '', first.lower())
                safe_last = re.sub(r'\W+', '', last.lower().replace(' ', ''))
                t["email"] = f"{safe_first}.{safe_last}@school.edu"

    # Convert to final JSON list
    final_data = []
    for i, (key, t) in enumerate(sorted(teachers.items())):
        # Join subjects and codes into strings for easy UI handling (comma-separated)
        # or just use sorted lists.
        # I'll use comma-separated strings for 'subject' and 'subject_code' to match existing keys
        final_data.append({
            "first_name": t["first_name"],
            "last_name": t["last_name"],
            "subject": ", ".join(sorted(t["subjects"])),
            "subject_code": ", ".join(sorted(t["subject_codes"])),
            "email": t["email"],
            "specializations": sorted(list(t["subjects"])),
            "max_periods_per_week": 25,
            "is_active": True,
            "teacher_id": f"default_{i}"
        })

    with open('/Users/sahasrapenumadu/Documents/Srini Learning/Srini Projects/School Schedule Builder/frontend/src/data/default_teachers.json', 'w') as f:
        json.dump(final_data, f, indent=2)

    print(f"Aggregated into {len(final_data)} unique teachers.")

if __name__ == "__main__":
    aggregate_teachers()
