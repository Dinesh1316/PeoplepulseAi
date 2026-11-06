# PeoplePulse AI HRMS Automation Platform

A hackathon-ready HRMS MVP for employee operations, attendance, leave, payroll, timesheets, notifications, onboarding, organization hierarchy, signup, and AI HR assistance.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL-ready Prisma schema
- AI: OpenAI chat integration with local HR knowledge fallback
- Auth: JWT sessions with Admin, HR Manager, and Employee roles

## Quick Start

```bash
npm install
copy .env.example backend\.env
copy .env.example frontend\.env
npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:4000/api

If login shows `Failed to fetch`, the backend is not running. Start both services with `npm run dev`, or use two terminals:

```bash
npm run dev:api
npm run dev:web
```

Demo users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@acmehr.com | password123 |
| HR Manager | hr@acmehr.com | password123 |
| Employee | ava@acmehr.com | password123 |

## Highlights

- Secure JWT login/logout flow, bcrypt password hashing, and password reset simulation
- Employee signup with live in-memory onboarding data
- Role-aware dashboards for Admin, HR Manager, and Employee
- Employee directory, profiles, departments, designations, reporting managers, profile settings, and document uploads
- Clock in/out, late login tracking, WFH status, attendance history and summaries
- Leave application, approval workflow, balances, history, holiday calendar
- Payroll records, monthly processing, generated payslips, and payroll history
- Timesheets with daily/weekly task logging and productivity summaries
- AI HR assistant with multi-turn conversation support, natural language actions, report generation, workflow automation, and message drafting
- Notifications, announcements, onboarding checklist, organization chart, and audit/activity logs
- Floating Pulse AI assistant available from every screen
- Responsive enterprise dashboard with light/dark mode

AI command examples:

- `Apply leave for tomorrow`
- `Show my attendance this month`
- `Generate payroll summary`
- `Who is absent today?`
- `Draft leave approval email`
- `Show employees with low attendance`
- `Create HR business summary`

## API Docs

See [docs/API.md](docs/API.md).
