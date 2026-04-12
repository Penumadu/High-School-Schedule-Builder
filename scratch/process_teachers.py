
import json
import re

raw_data = [
  {
    "teacher": "Ms. Alison Oikawa and Ms. Lucy Ambroszkiewicz",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Lucy Ambrowzkiewicz",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Ashley Betlej",
    "subject": "Business"
  },
  {
    "teacher": "Mr. Robert Biturajac",
    "subject": "Physical Education"
  },
  {
    "teacher": "Ms. Ashley Black",
    "subject": "Phys. Ed/Geography"
  },
  {
    "teacher": "Mr. Kevin Le Blanc",
    "subject": "Canadian & World Studies"
  },
  {
    "teacher": "Mr. David Boccalon",
    "subject": "Technology"
  },
  {
    "teacher": "Ms. Lena Brown",
    "subject": "Math"
  },
  {
    "teacher": "Ms. Natalie Vander Burgt",
    "subject": "Religion"
  },
  {
    "teacher": "Mr. Taras Cap",
    "subject": "Math/Science"
  },
  {
    "teacher": "Ms. Elizabeth Clarke",
    "subject": "Guidance"
  },
  {
    "teacher": "Ms. Irina Clipa",
    "subject": "Math"
  },
  {
    "teacher": "Ms. Emily DaSilva",
    "subject": "English/Moderns"
  },
  {
    "teacher": "Ms. Tristan Delamere",
    "subject": "Physical Education"
  },
  {
    "teacher": "Ms. Carmela Renzone (for Ms. Nicole Dimas)",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Jennie Dineen",
    "subject": "English/Moderns / Canadian & World Studies"
  },
  {
    "teacher": "Mr. Michael Kussman (for Mr. Jeff Eves)",
    "subject": "Religion"
  },
  {
    "teacher": "Mr. Brett Fama",
    "subject": "English"
  },
  {
    "teacher": "Ms. Natalie Fiscaletti",
    "subject": "Business"
  },
  {
    "teacher": "Ms. Jennifer Da Fonte",
    "subject": "English/Moderns"
  },
  {
    "teacher": "Mr. Darren Francis",
    "subject": "Business"
  },
  {
    "teacher": "Mr. Patrick Gamble",
    "subject": "Religion/Physical Education"
  },
  {
    "teacher": "Ms. Vanessa Gear",
    "subject": "Special Education"
  },
  {
    "teacher": "Mr. Gabriel Goulart",
    "subject": "Technology"
  },
  {
    "teacher": "Ms. Donna Griffin",
    "subject": "Technology"
  },
  {
    "teacher": "Ms. Katelyn Hawrylak",
    "subject": "Science"
  },
  {
    "teacher": "Mr. K. De Gruijter (for Mr. James Hibbert)",
    "subject": "Canadian & World Studies/Careers"
  },
  {
    "teacher": "Ms. Alexandra Iantorno",
    "subject": "Arts"
  },
  {
    "teacher": "Ms. Kathleen Jacobs",
    "subject": "Canadian & World Studies"
  },
  {
    "teacher": "Ms. Sandra Jurinic",
    "subject": "Science/Cooperative Education"
  },
  {
    "teacher": "Mr. Richard Karniej",
    "subject": "Technology"
  },
  {
    "teacher": "Ms. Valerie Kelenc",
    "subject": "Guidance"
  },
  {
    "teacher": "Mr. David Kennedy",
    "subject": "Canadian & World Studies"
  },
  {
    "teacher": "Ms. Deanna O'Donnell Leclerc",
    "subject": "Arts"
  },
  {
    "teacher": "Ms. Sandra Leslie",
    "subject": "Religion"
  },
  {
    "teacher": "Ms. Christine MacDonald",
    "subject": "Special Education"
  },
  {
    "teacher": "Ms. Jessica Barry (for Ms. Bonnie March)",
    "subject": "Technology"
  },
  {
    "teacher": "Ms. Andrea Martin",
    "subject": "Physical Education"
  },
  {
    "teacher": "Ms. Tammy Maxwell",
    "subject": "English/Moderns"
  },
  {
    "teacher": "Ms. Lauren May",
    "subject": "Math/Religion"
  },
  {
    "teacher": "Mr. Landon Gabriele (for Ms. Melanie Meagher)",
    "subject": "Religion/Math"
  },
  {
    "teacher": "Mr. Joseph Melfi",
    "subject": "Canadian & World Studies"
  },
  {
    "teacher": "Ms. Lisa Mikitzel",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Nadia Miklavcic",
    "subject": "French"
  },
  {
    "teacher": "Ms. Suzanne Miller",
    "subject": "Special Education"
  },
  {
    "teacher": "Ms. Karen Milne",
    "subject": "Arts"
  },
  {
    "teacher": "Ms. Vanessa La Monaca",
    "subject": "N/A"
  },
  {
    "teacher": "Ms. Erica Murdoch",
    "subject": "English/Moderns"
  },
  {
    "teacher": "Mr. Michael Muszak",
    "subject": "Canadian & World Studies/ESL"
  },
  {
    "teacher": "Mr. Steven Nobili",
    "subject": "Special Education"
  },
  {
    "teacher": "Mr. Simon O'Carroll",
    "subject": "Religion"
  },
  {
    "teacher": "Ms. Samantha Onuska",
    "subject": "Canadian & World Studies/English"
  },
  {
    "teacher": "Mr. Brian Owen",
    "subject": "Canadian & World Studies"
  },
  {
    "teacher": "Ms. Janice Ozanic",
    "subject": "Math"
  },
  {
    "teacher": "Ms. Natalie Page",
    "subject": "Physical Education"
  },
  {
    "teacher": "Mr. David Papa",
    "subject": "Guidance"
  },
  {
    "teacher": "Ms. Sonia Clarke (for Ms. Alyssa Parovel)",
    "subject": "English/Moderns"
  },
  {
    "teacher": "Mr. Roberto Petti",
    "subject": "Technology"
  },
  {
    "teacher": "Ms. Myra Pierias",
    "subject": "Religion"
  },
  {
    "teacher": "Ms. Jessica Pinto",
    "subject": "French"
  },
  {
    "teacher": "Ms. Linsey Provost",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Carina Cino (for Ms. Diana Purdie)",
    "subject": "Religion"
  },
  {
    "teacher": "Ms. Athena Rasile",
    "subject": "Math, Special Education"
  },
  {
    "teacher": "Ms. Kelly Rehel",
    "subject": "English"
  },
  {
    "teacher": "Ms. Meghan Romao-Penacho",
    "subject": "Physical Education/English"
  },
  {
    "teacher": "Ms. Rosamelia Runco",
    "subject": "Special Education"
  },
  {
    "teacher": "Ms. Heather Rutkowski",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Kelli Sandhu",
    "subject": "Business"
  },
  {
    "teacher": "Ms. Teresa Sarjas",
    "subject": "English"
  },
  {
    "teacher": "Ms. Deborah Siemiginowski",
    "subject": "Math"
  },
  {
    "teacher": "Mr. Vernon Smith",
    "subject": "Science"
  },
  {
    "teacher": "Mr. Francis Spadafora",
    "subject": "Co-op, Arts"
  },
  {
    "teacher": "Ms. Krista Stangherlin",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Kathleen Symington",
    "subject": "English"
  },
  {
    "teacher": "Ms. Tanya Tatti",
    "subject": "Physical Education"
  },
  {
    "teacher": "Ms. Tara Thompson",
    "subject": "Math"
  },
  {
    "teacher": "Ms. Aelah Thomson",
    "subject": "English/Moderns/Science"
  },
  {
    "teacher": "Ms. Emily Thurner",
    "subject": "English / Canadian & World Studies"
  },
  {
    "teacher": "Ms. Lyndsay Timmins",
    "subject": "Arts"
  },
  {
    "teacher": "Ms. Helena Tucci",
    "subject": "Science"
  },
  {
    "teacher": "Ms. Sara Vella",
    "subject": "Math"
  }
]

def clean_name(name):
    name = re.sub(r'^(Ms\.|Mr\.|Mx\.|Dr\.)\s*', '', name)
    # Handle "and" cases by just taking the first one or joining them as one full name
    # The user list has some "and" cases. Let's split them.
    if ' and ' in name:
        return name.split(' and ')
    return [name]

processed = []
for item in raw_data:
    raw_names = clean_name(item['teacher'])
    # Split subject by /, ,, or &
    specs = re.split(r'[/,&]|\s\/\s', item['subject'])
    specs = [s.strip() for s in specs if s.strip() and s.strip() != 'N/A']
    
    for full_name in raw_names:
        name_parts = full_name.split(' ')
        first_name = name_parts[0]
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        email = f"{first_name.lower()}.{last_name.lower().replace(' ', '')}@school.edu"
        
        processed.append({
            "teacher_id": f"default_{len(processed)}",
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "specializations": specs,
            "max_periods_per_week": 25,
            "is_active": True
        })

with open('/Users/sahasrapenumadu/Documents/Srini Learning/Srini Projects/School Schedule Builder/frontend/src/data/default_teachers.json', 'w') as f:
    json.dump(processed, f, indent=2)

print(f"Processed {len(processed)} teachers.")
