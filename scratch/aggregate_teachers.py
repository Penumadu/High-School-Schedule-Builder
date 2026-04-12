import json
import re
from collections import defaultdict

# The raw data copied from previous turn context
raw_data = [
    {"teacher": "Ms. Alison Oikawa and Ms. Lucy Ambroszkiewicz", "subject": "Science", "subject_code": "SNC1W"},
    {"teacher": "Ms. Lucy Ambrowzkiewicz", "subject": "Science", "subject_code": "SNC2D"},
    {"teacher": "Ms. Ashley Betlej", "subject": "Business", "subject_code": "BBI2O"},
    {"teacher": "Mr. Robert Biturajac", "subject": "Physical Education", "subject_code": "PPL4OM"},
    {"teacher": "Ms. Ashley Black", "subject": "Phys. Ed/Geography", "subject_code": "CGC1W"},
    {"teacher": "Mr. Kevin Le Blanc", "subject": "Canadian & World Studies", "subject_code": "CHC2D"},
    {"teacher": "Mr. David Boccalon", "subject": "Technology", "subject_code": "TIJ1O"},
    {"teacher": "Ms. Lena Brown", "subject": "Math", "subject_code": "MCR3UA"},
    {"teacher": "Ms. Natalie Vander Burgt", "subject": "Religion", "subject_code": "HRE1O"},
    {"teacher": "Mr. Taras Cap", "subject": "Math/Science", "subject_code": "MHF4UE"},
    {"teacher": "Ms. Elizabeth Clarke", "subject": "Guidance", "subject_code": "GLC2O"},
    {"teacher": "Ms. Irina Clipa", "subject": "Math", "subject_code": "MPM2D"},
    {"teacher": "Ms. Emily DaSilva", "subject": "English/Moderns", "subject_code": "ENG1D"},
    {"teacher": "Ms. Tristan Delamere", "subject": "Physical Education", "subject_code": "PAF3OF"},
    {"teacher": "Ms. Carmela Renzone (for Ms. Nicole Dimas)", "subject": "Science", "subject_code": "SCH4U"},
    {"teacher": "Ms. Jennie Dineen", "subject": "English/Moderns / Canadian & World Studies", "subject_code": "ENG2D"},
    {"teacher": "Mr. Michael Kussman (for Mr. Jeff Eves)", "subject": "Religion", "subject_code": "HRE2O"},
    {"teacher": "Mr. Brett Fama", "subject": "English", "subject_code": "ENG4U1"},
    {"teacher": "Ms. Natalie Fiscaletti", "subject": "Business", "subject_code": "BAT4M"},
    {"teacher": "Mr. Francesco Florio", "subject": "Technology", "subject_code": "TCJ2O"},
    {"teacher": "Mr. Robert Floris", "subject": "Math", "subject_code": "MEL3E"},
    {"teacher": "Ms. Nicole Floris", "subject": "English", "subject_code": "ENG3U1"},
    {"teacher": "Ms. Jennifer Fountas", "subject": "Sociology/Religion", "subject_code": "HSP3U"},
    {"teacher": "Ms. Rosanne Galli", "subject": "Math", "subject_code": "MAP4C"},
    {"teacher": "Mr. Marco Giansante", "subject": "Geography", "subject_code": "CGW4U"},
    {"teacher": "Ms. Sarah Gibson", "subject": "Guidance", "subject_code": "GLC2OT"},
    {"teacher": "Ms. Amanda Gibson", "subject": "Arts", "subject_code": "AVI2O"},
    {"teacher": "Mr. Adam Gordon", "subject": "Business", "subject_code": "BOH4M"},
    {"teacher": "Mr. Matthew Green", "subject": "Physical Education", "subject_code": "PPL1O"},
    {"teacher": "Ms. Surbhi Gulati", "subject": "Religion", "subject_code": "HRE4O"},
    {"teacher": "Ms. Kim Hall", "subject": "Physical Education", "subject_code": "PPL2OF"},
    {"teacher": "Ms. Stephanie Hamilton", "subject": "Science", "subject_code": "SBI3U"},
    {"teacher": "Ms. Julia Hanbury", "subject": "Special Education", "subject_code": "GLE1O"},
    {"teacher": "Mr. David Hayes", "subject": "English", "subject_code": "NBE3U"},
    {"teacher": "Ms. Anna Heald", "subject": "Physical Education", "subject_code": "PPL1OF"},
    {"teacher": "Mr. Adam Helmers", "subject": "Music", "subject_code": "AMI1O"},
    {"teacher": "Ms. Maria-Elena Hernandez", "subject": "Moderns", "subject_code": "FSF1D"},
    {"teacher": "Mr. Richard Jany", "subject": "Religion", "subject_code": "HRE4M"},
    {"teacher": "Ms. Deanna Jany", "subject": "Religion", "subject_code": "HRE3M"},
    {"teacher": "Mr. Matthew Johnston", "subject": "Science/Technology", "subject_code": "SPH4U"},
    {"teacher": "Mr. David Katona", "subject": "Technology", "subject_code": "TMJ3M"},
    {"teacher": "Mr. David Katool", "subject": "Math", "subject_code": "MPM2DE"},
    {"teacher": "Mr. Peter Kehoe", "subject": "History/Civics", "subject_code": "CHC2P"},
    {"teacher": "Ms. Jennifer Kent", "subject": "Science", "subject_code": "SNC2P"},
    {"teacher": "Mr. Robert Knotek", "subject": "Special Education", "subject_code": "GLE1OA"},
    {"teacher": "Mr. Michael Kostal", "subject": "Technology", "subject_code": "TTJ2O"},
    {"teacher": "Ms. Heather Kromis", "subject": "History/Civics", "subject_code": "CHV2O"},
    {"teacher": "Mr. James Kromis", "subject": "Technology", "subject_code": "TDJ3M"},
    {"teacher": "Ms. Jennifer Laccitti", "subject": "Geography", "subject_code": "CGC1WE"},
    {"teacher": "Mr. Alexander MacDonald", "subject": "History/Civics", "subject_code": "CHC2L"},
    {"teacher": "Mr. Anthony Macaluso", "subject": "Math", "subject_code": "MCF3M"},
    {"teacher": "Mr. Stephen Macaluso", "subject": "Math", "subject_code": "MCR3U"},
    {"teacher": "Mr. Paul Macan", "subject": "Arts/Music", "subject_code": "ASM2O"},
    {"teacher": "Ms. Julia Malcew", "subject": "English", "subject_code": "ENG2P"},
    {"teacher": "Mr. Marc Malizia", "subject": "Special Education", "subject_code": "GLE2O"},
    {"teacher": "Mr. John Mallett", "subject": "Geography", "subject_code": "CGF3M"},
    {"teacher": "Mr. Marc Mallett", "subject": "History/Civics", "subject_code": "CGG3O"},
    {"teacher": "Mr. Joseph Mara", "subject": "Technology", "subject_code": "ICS3U"},
    {"teacher": "Ms. Sarah Marin", "subject": "English", "subject_code": "ENG3C"},
    {"teacher": "Mr. Steven Mazza", "subject": "Physical Education", "subject_code": "PPL2OM"},
    {"teacher": "Ms. Sandra Mazza", "subject": "English", "subject_code": "ENG4C"},
    {"teacher": "Mr. James McCutcheon", "subject": "Math", "subject_code": "MTH1W"},
    {"teacher": "Ms. Katherine Moore", "subject": "English/Arts", "subject_code": "ENG1DT"},
    {"teacher": "Ms. Lindsay Moore", "subject": "Moderns", "subject_code": "FSF1P"},
    {"teacher": "Ms. Jessica Mosimann", "subject": "Arts", "subject_code": "AVI1O"},
    {"teacher": "Mr. Christopher Naar", "subject": "English", "subject_code": "ENG1L"},
    {"teacher": "Mr. Stephen Naar", "subject": "English", "subject_code": "NBE3C"},
    {"teacher": "Ms. Megan Naar", "subject": "English", "subject_code": "ENG2L"},
    {"teacher": "Ms. Julia Naccarato", "subject": "Math", "subject_code": "MCR3U"},
    {"teacher": "Ms. Nancy Nardi", "subject": "Math", "subject_code": "MCR4U"},
    {"teacher": "Ms. Angela Nero", "subject": "Religion", "subject_code": "HRE1OT"},
    {"teacher": "Mr. Joseph Nero", "subject": "Religion", "subject_code": "HRF3O"},
    {"teacher": "Ms. Kelly O’Hara", "subject": "Religion", "subject_code": "HRE2OT"},
    {"teacher": "Ms. Linda O’Neill", "subject": "Religion/Philosophy", "subject_code": "HZT4U"},
    {"teacher": "Ms. Maria Paccione", "subject": "Moderns", "subject_code": "FSF1Z"},
    {"teacher": "Ms. Lisa Paccione / Ms. Megan Piccoli", "subject": "French/Arts", "subject_code": "FSF1D"},
    {"teacher": "Ms. Rosanne Pasquale", "subject": "Business", "subject_code": "BDI3C"},
    {"teacher": "Mr. Claudio Pasquale", "subject": "Technology", "subject_code": "TEJ3M"},
    {"teacher": "Mr. Gianmarco Pelino", "subject": "English/History", "subject_code": "ENG1P"},
    {"teacher": "Ms. Sonia Peralta", "subject": "Sociology/Anthropology", "subject_code": "HSP3C"},
    {"teacher": "Mr. Francesco Peralta", "subject": "Moderns", "subject_code": "LWSOB"},
    {"teacher": "Mr. Nicholas Pesiak", "subject": "History/Civics", "subject_code": "CHV2OT"},
    {"teacher": "Ms. Sara Pesiak", "subject": "Arts", "subject_code": "ADA2O"},
    {"teacher": "Ms. Emily Piccoli", "subject": "English", "subject_code": "ENG2D"},
    {"teacher": "Ms. Christina Polidoro", "subject": "Moderns", "subject_code": "FSF2D"},
    {"teacher": "Mr. Robert Polidoro", "subject": "Math", "subject_code": "MEL4E"},
    {"teacher": "Ms. Sarah Prendergast", "subject": "Science", "subject_code": "SNC1WT"},
    {"teacher": "Mr. David Prendergast", "subject": "Math/Science", "subject_code": "SNC2D"},
    {"teacher": "Ms. Vanessa Rajaratnam", "subject": "Science", "subject_code": "SNC1L"},
    {"teacher": "Ms. Sonia Sanchis", "subject": "Moderns", "subject_code": "FSF3U"},
    {"teacher": "Mr. David Shoveller", "subject": "Religion", "subject_code": "HRE3O"},
    {"teacher": "Mr. John Shoveller", "subject": "History/Civics", "subject_code": "CHV2O"},
    {"teacher": "Ms. Maria Sileici", "subject": "Moderns", "subject_code": "FSF4U"},
    {"teacher": "Ms. Lisa Silvestri", "subject": "Family Studies", "subject_code": "HFN2O"},
    {"teacher": "Ms. Paula Silvestri", "subject": "Arts", "subject_code": "ADA3M"},
    {"teacher": "Ms. Jennifer Stewart", "subject": "English", "subject_code": "NBE3E"},
    {"teacher": "Mr. Matthew Stewart", "subject": "Physical Education", "subject_code": "PPL3OM"},
    {"teacher": "Ms. Lindsay Stewart", "subject": "Science", "subject_code": "SBI4U"},
    {"teacher": "Ms. Siobhan Stewart", "subject": "Math", "subject_code": "MAT1L"},
    {"teacher": "Ms. Helena Tucci", "subject": "Science", "subject_code": "SCH3U"},
    {"teacher": "Ms. Sara Vella", "subject": "Math", "subject_code": "MCV4U"}
]

def aggregate_teachers():
    # Aggregator dictionary
    teachers = defaultdict(lambda: {
        "first_name": "",
        "last_name": "",
        "subjects": set(),
        "subject_codes": set(),
        "email": ""
    })

    def clean_name(name):
        name = re.sub(r'^(Ms\.|Mr\.|Mx\.|Dr\.)\s*', '', name)
        name = re.sub(r'\(.*?\)', '', name).strip()
        # Handle multiple teachers in one row
        if ' and ' in name:
            return [n.strip() for n in name.split(' and ')]
        if ' / ' in name: # Support Lisa Paccione / Megan Piccoli
             return [n.strip() for n in name.split('/')]
        return [name.strip()]

    for item in raw_data:
        names = clean_name(item['teacher'])
        raw_subj = item['subject']
        raw_code = item['subject_code']
        
        # Split subjects if they contain slash
        subjs_split = [s.strip() for s in re.split(r'[/,&]|\s\/\s', raw_subj) if s.strip()]
        
        for name in names:
            name_parts = name.split(' ')
            first = name_parts[0]
            last = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            key = f"{first} {last}".replace('.', '').strip() # Remove dots from Mrs. etc if any
            t = teachers[key]
            t["first_name"] = first
            t["last_name"] = last
            
            t["subjects"].update(subjs_split)
            t["subject_codes"].add(raw_code)
            
            if not t["email"]:
                safe_first = re.sub(r'\W+', '', first.lower())
                safe_last = re.sub(r'\W+', '', last.lower().replace(' ', ''))
                t["email"] = f"{safe_first}.{safe_last}@school.edu"

    final_data = []
    for i, (key, t) in enumerate(sorted(teachers.items())):
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
