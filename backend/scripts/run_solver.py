from app.services.solver import ScheduleSolver

def run_solver(school_id: str):
    print(f"🚀 Triggering Scheduling Engine for school: {school_id}")
    solver = ScheduleSolver(school_id)
    
    try:
        # Generate schedule for Semester 1
        result = solver.generate(semester=1)
        
        print(f"\n✨ SUCCESS: Schedule Generated!")
        print(f"Schedule ID: {result.schedule_id}")
        print(f"Status: {result.status}")
        print(f"Message: {result.message}")
        
        if result.conflict_report.has_conflicts:
            print(f"⚠️ Warning: Found {result.conflict_report.total_conflicts} conflicts.")
            for c in result.conflict_report.conflicts:
                print(f"   - {c.type}: {c.description}")
        else:
            print("✅ Perfect! No conflicts found.")
            
    except Exception as e:
        print(f"❌ Error during generation: {e}")

if __name__ == "__main__":
    run_solver("demo-school")
