
import json
import re

raw_data = [
  {
    "teacher": "Ms. Alison Oikawa and Ms. Lucy Ambroszkiewicz",
    "subject": "Science",
    "subject_code": "SNC1W"
  },
  {
    "teacher": "Ms. Lucy Ambrowzkiewicz",
    "subject": "Science",
    "subject_code": "SNC2D"
  },
  {
    "teacher": "Ms. Ashley Betlej",
    "subject": "Business",
    "subject_code": "BBI2O"
  },
  {
    "teacher": "Mr. Robert Biturajac",
    "subject": "Physical Education",
    "subject_code": "PPL4OM"
  },
  {
    "teacher": "Ms. Ashley Black",
    "subject": "Phys. Ed/Geography",
    "subject_code": "CGC1W"
  },
  {
    "teacher": "Mr. Kevin Le Blanc",
    "subject": "Canadian & World Studies",
    "subject_code": "CHC2D"
  },
  {
    "teacher": "Mr. David Boccalon",
    "subject": "Technology",
    "subject_code": "TIJ1O"
  },
  {
    "teacher": "Ms. Lena Brown",
    "subject": "Math",
    "subject_code": "MCR3UA"
  },
  {
    "teacher": "Ms. Natalie Vander Burgt",
    "subject": "Religion",
    "subject_code": "HRE1O"
  },
  {
    "teacher": "Mr. Taras Cap",
    "subject": "Math/Science",
    "subject_code": "MHF4UE"
  },
  {
    "teacher": "Ms. Elizabeth Clarke",
    "subject": "Guidance",
    "subject_code": "GLC2O"
  },
  {
    "teacher": "Ms. Irina Clipa",
    "subject": "Math",
    "subject_code": "MPM2D"
  },
  {
    "teacher": "Ms. Emily DaSilva",
    "subject": "English/Moderns",
    "subject_code": "ENG1D"
  },
  {
    "teacher": "Ms. Tristan Delamere",
    "subject": "Physical Education",
    "subject_code": "PAF3OF"
  },
  {
    "teacher": "Ms. Carmela Renzone (for Ms. Nicole Dimas)",
    "subject": "Science",
    "subject_code": "SCH4U"
  },
  {
    "teacher": "Ms. Jennie Dineen",
    "subject": "English/Moderns / Canadian & World Studies",
    "subject_code": "ENG2D"
  },
  {
    "teacher": "Mr. Michael Kussman (for Mr. Jeff Eves)",
    "subject": "Religion",
    "subject_code": "HRE2O"
  },
  {
    "teacher": "Mr. Brett Fama",
    "subject": "English",
    "subject_code": "ENG4U1"
  },
  {
    "teacher": "Ms. Natalie Fiscaletti",
    "subject": "Business",
    "subject_code": "BAT4M"
  },
  {
    "teacher": "Ms. Jennifer Da Fonte",
    "subject": "English/Moderns",
    "subject_code": "FSF1D"
  },
  {
    "teacher": "Mr. Darren Francis",
    "subject": "Business",
    "subject_code": "BBB4M"
  },
  {
    "teacher": "Mr. Patrick Gamble",
    "subject": "Religion/Physical Education",
    "subject_code": "HRE4M"
  },
  {
    "teacher": "Ms. Vanessa Gear",
    "subject": "Special Education",
    "subject_code": "GLE1O"
  },
  {
    "teacher": "Mr. Gabriel Goulart",
    "subject": "Technology",
    "subject_code": "TPJ2O"
  },
  {
    "teacher": "Ms. Donna Griffin",
    "subject": "Technology",
    "subject_code": "TPJ3M1"
  },
  {
    "teacher": "Ms. Katelyn Hawrylak",
    "subject": "Science",
    "subject_code": "SBI4U"
  },
  {
    "teacher": "Mr. K. De Gruijter (for Mr. James Hibbert)",
    "subject": "Canadian & World Studies/Careers",
    "subject_code": "CHV2O"
  },
  {
    "teacher": "Ms. Alexandra Iantorno",
    "subject": "Arts",
    "subject_code": "AVI1O"
  },
  {
    "teacher": "Ms. Kathleen Jacobs",
    "subject": "Canadian & World Studies",
    "subject_code": "CGW4U"
  },
  {
    "teacher": "Ms. Sandra Jurinic",
    "subject": "Science/Cooperative Education",
    "subject_code": "COOP"
  },
  {
    "teacher": "Mr. Richard Karniej",
    "subject": "Technology",
    "subject_code": "TPJ4M1"
  },
  {
    "teacher": "Ms. Valerie Kelenc",
    "subject": "Guidance",
    "subject_code": "GLC2O"
  },
  {
    "teacher": "Mr. David Kennedy",
    "subject": "Canadian & World Studies",
    "subject_code": "CHY4U"
  },
  {
    "teacher": "Ms. Deanna O'Donnell Leclerc",
    "subject": "Arts",
    "subject_code": "ADA4M1"
  },
  {
    "teacher": "Ms. Sandra Leslie",
    "subject": "Religion",
    "subject_code": "HRE3M"
  },
  {
    "teacher": "Ms. Christine MacDonald",
    "subject": "Special Education",
    "subject_code": "K-Code"
  },
  {
    "teacher": "Ms. Jessica Barry (for Ms. Bonnie March)",
    "subject": "Technology",
    "subject_code": "TCJ2O"
  },
  {
    "teacher": "Ms. Andrea Martin",
    "subject": "Physical Education",
    "subject_code": "PPL1O"
  },
  {
    "teacher": "Ms. Tammy Maxwell",
    "subject": "English/Moderns",
    "subject_code": "FSF2D"
  },
  {
    "teacher": "Ms. Lauren May",
    "subject": "Math/Religion",
    "subject_code": "MCR3U"
  },
  {
    "teacher": "Mr. Landon Gabriele (for Ms. Melanie Meagher)",
    "subject": "Religion/Math",
    "subject_code": "HRE2O"
  },
  {
    "teacher": "Mr. Joseph Melfi",
    "subject": "Canadian & World Studies",
    "subject_code": "CIA4U"
  },
  {
    "teacher": "Ms. Lisa Mikitzel",
    "subject": "Science",
    "subject_code": "SPH4U"
  },
  {
    "teacher": "Ms. Nadia Miklavcic",
    "subject": "French",
    "subject_code": "FSF4U"
  },
  {
    "teacher": "Ms. Suzanne Miller",
    "subject": "Special Education",
    "subject_code": "GLE2O"
  },
  {
    "teacher": "Ms. Karen Milne",
    "subject": "Arts",
    "subject_code": "AVI4M1"
  },
  {
    "teacher": "Ms. Vanessa La Monaca",
    "subject": "N/A",
    "subject_code": "N/A"
  },
  {
    "teacher": "Ms. Erica Murdoch",
    "subject": "English/Moderns",
    "subject_code": "ENG3U"
  },
  {
    "teacher": "Mr. Michael Muszak",
    "subject": "Canadian & World Studies/ESL",
    "subject_code": "ESLAO"
  },
  {
    "teacher": "Mr. Steven Nobili",
    "subject": "Special Education",
    "subject_code": "GLE3O"
  },
  {
    "teacher": "Mr. Simon O'Carroll",
    "subject": "Religion",
    "subject_code": "HRT3M"
  },
  {
    "teacher": "Ms. Samantha Onuska",
    "subject": "Canadian & World Studies/English",
    "subject_code": "ENG1D"
  },
  {
    "teacher": "Mr. Brian Owen",
    "subject": "Canadian & World Studies",
    "subject_code": "CHW3M"
  },
  {
    "teacher": "Ms. Janice Ozanic",
    "subject": "Math",
    "subject_code": "MTH1W"
  },
  {
    "teacher": "Ms. Natalie Page",
    "subject": "Physical Education",
    "subject_code": "PPL2O"
  },
  {
    "teacher": "Mr. David Papa",
    "subject": "Guidance",
    "subject_code": "GLC2O"
  },
  {
    "teacher": "Ms. Sonia Clarke (for Ms. Alyssa Parovel)",
    "subject": "English/Moderns",
    "subject_code": "NBE3U"
  },
  {
    "teacher": "Mr. Roberto Petti",
    "subject": "Technology",
    "subject_code": "TGJ2O"
  },
  {
    "teacher": "Ms. Myra Pierias",
    "subject": "Religion",
    "subject_code": "HRE1O"
  },
  {
    "teacher": "Ms. Jessica Pinto",
    "subject": "French",
    "subject_code": "FSF3U"
  },
  {
    "teacher": "Ms. Linsey Provost",
    "subject": "Science",
    "subject_code": "SNC2D"
  },
  {
    "teacher": "Ms. Carina Cino (for Ms. Diana Purdie)",
    "subject": "Religion",
    "subject_code": "HRE4M"
  },
  {
    "teacher": "Ms. Athena Rasile",
    "subject": "Math, Special Education",
    "subject_code": "MAT1L"
  },
  {
    "teacher": "Ms. Kelly Rehel",
    "subject": "English",
    "subject_code": "ENG4C"
  },
  {
    "teacher": "Ms. Meghan Romao-Penacho",
    "subject": "Physical Education/English",
    "subject_code": "PPL3O"
  },
  {
    "teacher": "Ms. Rosamelia Runco",
    "subject": "Special Education",
    "subject_code": "GLE4O"
  },
  {
    "teacher": "Ms. Heather Rutkowski",
    "subject": "Science",
    "subject_code": "SVN3E"
  },
  {
    "teacher": "Ms. Kelli Sandhu",
    "subject": "Business",
    "subject_code": "BMI3C"
  },
  {
    "teacher": "Ms. Teresa Sarjas",
    "subject": "English",
    "subject_code": "ENG2P"
  },
  {
    "teacher": "Ms. Deborah Siemiginowski",
    "subject": "Math",
    "subject_code": "MAP4C"
  },
  {
    "teacher": "Mr. Vernon Smith",
    "subject": "Science",
    "subject_code": "SNC1W"
  },
  {
    "teacher": "Mr. Francis Spadafora",
    "subject": "Co-op, Arts",
    "subject_code": "AVI2O"
  },
  {
    "teacher": "Ms. Krista Stangherlin",
    "subject": "Science",
    "subject_code": "SBI3U"
  },
  {
    "teacher": "Ms. Kathleen Symington",
    "subject": "English",
    "subject_code": "ENG4U"
  },
  {
    "teacher": "Ms. Tanya Tatti",
    "subject": "Physical Education",
    "subject_code": "PAF4O"
  }
]

def clean_name(name):
    name = re.sub(r'^(Ms\.|Mr\.|Mx\.|Dr\.)\s*', '', name)
    if ' and ' in name:
        return name.split(' and ')
    return [name]

processed = []
for item in raw_data:
    raw_names = clean_name(item['teacher'])
    
    # Process subjects and codes
    # We split the raw subject string into potential tags
    raw_specs = re.split(r'[/,&]|\s\/\s', item['subject'])
    raw_specs = [s.strip() for s in raw_specs if s.strip() and s.strip() != 'N/A']
    
    # DIVIDE: Specializations should ONLY be "Extra" expertise. 
    # We remove the main subject name and the main code.
    primary_name = item['subject']
    primary_code = item['subject_code']
    
    # Only keep specs that aren't the primary name or primary code
    filtered_specs = [s for s in raw_specs if s != primary_name and s != primary_code]
    
    for full_name in raw_names:
        sub_name = full_name.strip()
        name_parts = sub_name.split(' ')
        first_name = name_parts[0]
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        # Simple email generation
        safe_first = re.sub(r'\W+', '', first_name.lower())
        safe_last = re.sub(r'\W+', '', last_name.lower().replace(' ', ''))
        email = f"{safe_first}.{safe_last}@school.edu"
        
        processed.append({
            "first_name": first_name,
            "last_name": last_name,
            "primary_subject_code": primary_code,
            "primary_subject_name": primary_name,
            "email": email,
            "specializations": list(set(filtered_specs)),
            "max_periods_per_week": 25,
            "is_active": True,
            "teacher_id": f"default_{len(processed)}"
        })

with open('/Users/sahasrapenumadu/Documents/Srini Learning/Srini Projects/School Schedule Builder/frontend/src/data/default_teachers.json', 'w') as f:
    json.dump(processed, f, indent=2)

print(f"Processed {len(processed)} teachers with separated primary subject data.")
