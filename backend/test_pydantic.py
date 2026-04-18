from app.models.admin import TeacherUpdate
payload = {"specializations": ["Math", "Physics"]}
tu = TeacherUpdate(**payload)
print(tu.model_dump(exclude_unset=True))
