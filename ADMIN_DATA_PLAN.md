# Administrative Data Management Plan

## 1. Bulk Import Specifications (Excel)
To ensure system integrity, all Excel uploads follow a "Validate-then-Commit" workflow.

### Template Structures
- **Staff_Template.xlsx**: [Name, Email, Specializations (comma-separated), Max_Periods_Per_Week]
- **Subject_Template.xlsx**: [Subject_Name, Grade_Level, Periods_Per_Week, Prerequisite_Subject, Min_Grade]
- **Student_Choices_Template.xlsx**: [Student_ID, Grade, Choice_1, Choice_2, Choice_3, Choice_4, Choice_5, Choice_6]

### Validation Logic (The Python Layer)
1. **Schema Check:** Does the file have the required columns?
2. **Reference Check:** Do the 'Specializations' in the Teacher file match existing 'Subject_IDs'?
3. **Conflict Check:** Does the 'Total Student Choices' for a specific subject exceed 'Total Capacity' of all assigned rooms?

## 2. Online Management Screens
- **The Staff Registry:** A searchable grid to update teacher status or manually adjust subject specializations.
- **The Subject Catalog:** A configuration page for subjects where the "Rules Engine" is visually managed (e.g., setting a 70% Physics 9 requirement for Physics 10).
- **The Conflict Dashboard:** A real-time view showing "Unassigned Students" or "Over-allocated Teachers" after an import.