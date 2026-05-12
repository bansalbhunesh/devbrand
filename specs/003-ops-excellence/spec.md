# Spec: Operations Excellence (Resiliency & Monitoring)

## Context
As the system scales, heavy AI processing (`transformPR`) can time out or fail. We need a way to track these background jobs and provide an administrative view of system health and security events.

## Objectives
1. **Background Job Resiliency**: Implement a "Job Status" tracking system for heavy AI tasks.
2. **Admin Dashboard**: Create a secure interface to monitor security events, job status, and user activity.
3. **Role-Based Access**: Add support for an `admin` role to protect the dashboard.

## Acceptance Criteria
1. **Job Tracking**: `transformPR` must return a `jobId` immediately; client must poll for status (`PENDING`, `COMPLETED`, `FAILED`).
2. **Admin UI**: Accessible at `/admin`, showing:
   - Recent Security Events (from Redis).
   - Active/Failed Jobs.
   - User Activity Feed.
3. **Role Security**: Only users with `role: 'admin'` can access `/admin`.
4. **Resiliency**: Jobs must persist their state to the DB so they can be resumed or audited on failure.

## Technical Constraints
- Must adhere to DevBrand Constitution v1.0.0.
- Use `TanStack Query` for polling logic on the client.
- Admin dashboard must use the "Aesthetic Excellence" standard (glassmorphism, Inter/JetBrains typography).
