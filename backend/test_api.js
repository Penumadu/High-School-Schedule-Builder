const fetch = require('node-fetch');

async function test() {
  const schoolId = "demo-school";
  const teacherId = "default_0";
  const baseUrl = "http://localhost:8000/admin";

  // 1. Get staff
  const res = await fetch(`${baseUrl}/${schoolId}/staff`, {
    headers: { 'Authorization': 'Bearer mock-token' }
  });
  const staff = await res.json();
  console.log("Found staff:", staff.length);
  
  let teacher = staff.find(t => t.teacher_id === teacherId || t.id === teacherId);
  if (!teacher) {
    console.log("Teacher not found, creating test teacher");
    const createRes = await fetch(`${baseUrl}/${schoolId}/staff`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer mock-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: "Test", last_name: "Teacher", email: "test@test.com", subject: "Math", subject_code: "MAT", specializations: ["Math"]
      })
    });
    teacher = await createRes.json();
    console.log("Created teacher:", teacher);
  } else {
    console.log("Current specializations:", teacher.specializations);
  }

  // 2. Update specializations
  console.log("\nUpdating specializations to ['Math', 'Physics', 'Chemistry']...");
  const updateRes = await fetch(`${baseUrl}/${schoolId}/staff/${teacher.teacher_id || teacher.id}`, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer mock-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      specializations: ["Math", "Physics", "Chemistry"]
    })
  });
  
  const updateData = await updateRes.json();
  console.log("Update response specializations:", updateData.specializations);

  // 3. Get staff again
  const finalRes = await fetch(`${baseUrl}/${schoolId}/staff`, {
    headers: { 'Authorization': 'Bearer mock-token' }
  });
  const finalStaff = await finalRes.json();
  const finalTeacher = finalStaff.find(t => t.teacher_id === (teacher.teacher_id || teacher.id));
  console.log("\nFinal specializations after fetch:", finalTeacher.specializations);
}

test().catch(console.error);
