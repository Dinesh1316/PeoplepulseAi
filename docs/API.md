# API Documentation

Base URL: `http://localhost:4000/api`

Send authenticated requests with:

```http
Authorization: Bearer <jwt>
```

## Auth

### POST `/auth/login`

```json
{
  "email": "admin@acmehr.com",
  "password": "password123"
}
```

Returns a JWT token and the current user.

### POST `/auth/password-reset`

```json
{
  "email": "ava@acmehr.com"
}
```

Returns a simulated password reset response for MVP demos.

## Dashboard

### GET `/dashboard`

Returns role-aware metrics, analytics charts, productivity insights, AI-generated business summaries, notifications, announcements, and organization data.

## Employees

### GET `/employees`

Returns the employee directory.

### GET `/employees/:id`

Returns one employee profile.

### PATCH `/employees/:id`

Updates editable employee fields. Admin and HR Manager only, except users may update their own profile settings.

### POST `/employees/:id/documents`

Uploads a simulated employee document and creates an audit log entry.

```json
{
  "name": "Updated address proof",
  "status": "Uploaded"
}
```

## Attendance

### GET `/attendance`

Returns attendance records visible to the current role.

### GET `/attendance/summary`

Returns attendance rate, present/absent counts, WFH count, late logins, and productive hours by employee.

### POST `/attendance/clock`

```json
{
  "type": "in",
  "mode": "Office"
}
```

`type` may be `in` or `out`. `mode` may be `Office` or `WFH`.

## Leave

### GET `/leaves`

Returns leave requests visible to the current role.

### POST `/leaves`

```json
{
  "type": "Annual",
  "from": "2026-06-10",
  "to": "2026-06-12",
  "reason": "Family travel"
}
```

### PATCH `/leaves/:id`

```json
{
  "status": "Approved"
}
```

Admin and HR Manager only.

## Payroll

### GET `/payroll`

Returns payroll rows visible to the current role.

### GET `/payroll/:id/payslip`

Generates a structured payslip for the selected payroll record and writes an audit log entry.

### POST `/payroll/process`

```json
{
  "month": "May 2026"
}
```

Admin and HR Manager only.

## Timesheets

### GET `/timesheets`

Returns timesheet entries visible to the current role.

### GET `/timesheets/summary`

Returns productivity summaries by employee, including total hours, billable hours, approvals, submitted rows, and productivity score.

### POST `/timesheets`

```json
{
  "date": "2026-05-22",
  "project": "HRMS Automation",
  "hours": 6,
  "summary": "Built leave workflow"
}
```

## AI Assistant

### POST `/ai/chat`

```json
{
  "messages": [
    { "role": "user", "content": "How many annual leaves do I have?" }
  ]
}
```

Uses OpenAI when `OPENAI_API_KEY` is configured. Otherwise it returns a deterministic HR knowledge fallback for demos.

Supported local AI actions include leave creation, attendance summaries, payroll summaries, absent employee detection, low-attendance reports, HR message drafts, and structured business summaries.

## Audit & Reports

### GET `/audit-logs`

Admin and HR Manager only. Returns tracked actions such as leave approvals, attendance clock events, payroll updates, document uploads, profile changes, payslip generation, timesheet submissions, and AI-generated actions.

### GET `/reports/summary`

Returns a structured HR business summary with low-attendance risks, payroll draft counts, workflow outputs, and generated timestamp.
