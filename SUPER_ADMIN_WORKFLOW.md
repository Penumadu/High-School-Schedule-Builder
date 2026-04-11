# Super Admin Operations & Provisioning

## Role Definition
The Super Admin is a platform-level user responsible for onboarding new client schools, managing billing/limits, and resolving cross-tenant system errors. 

## School Onboarding Sequence
When a new school purchases the software, the Super Admin follows this flow:

1. **Create Tenant:** Admin clicks "Add New School" in the Super Admin UI.
2. **Configure Profile:** Enters the `school_name`, time zone, and licensing limits (e.g., max 2000 students).
3. **Generate First Account:** The Admin creates the "Principal" account for that specific school. 
4. **Handoff:** The system automatically emails the newly created Principal a secure setup link. 
5. **Delegation:** From that point on, the Principal takes over. The Principal logs in using their School Name, logs into their isolated dashboard, and begins uploading their teachers and students.

## API Endpoint: Provisioning
- `POST /api/v1/system/provision-school`
  - Auth: `SUPER_ADMIN` Custom Claim Required.
  - Action: Creates the `schools/{school_id}` document and registers the initial Principal user via Firebase Admin SDK.