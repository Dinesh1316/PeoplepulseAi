import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { z } from "zod";
import { answerHrChat } from "./ai.js";
import { canSeeEmployee, requireAuth, requireRole, signToken, type AuthRequest } from "./auth.js";
import { announcements, data, holidays, onboarding } from "./data.js";
import type { AuditLog, Employee } from "./types.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  department: z.string().min(2),
  designation: z.string().min(2),
  location: z.string().min(2),
  managerId: z.string().optional()
});
const leaveSchema = z.object({
  type: z.enum(["Annual", "Sick", "Casual", "WFH"]),
  from: z.string(),
  to: z.string(),
  reason: z.string().min(3)
});
const timesheetSchema = z.object({
  date: z.string(),
  project: z.string().min(2),
  hours: z.number().positive().max(24),
  summary: z.string().min(3)
});
const documentSchema = z.object({ name: z.string().min(2), status: z.string().default("Uploaded") });

function visibleEmployeeIds(req: AuthRequest) {
  if (req.user?.role === "Admin" || req.user?.role === "HR Manager") {
    return data.employees.map((employee) => employee.id);
  }

  return [req.user?.employeeId].filter(Boolean) as string[];
}

function daysBetween(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function currentEmployee(req: AuthRequest) {
  return data.employees.find((item) => item.id === req.user?.employeeId);
}

function addAudit(req: AuthRequest, action: string, entity: string, entityId: string, details: string): AuditLog {
  const actor = currentEmployee(req);
  const log = {
    id: `log-${Date.now()}`,
    actorId: req.user?.id || "system",
    actorName: actor?.name || req.user?.email || "System",
    action,
    entity,
    entityId,
    details,
    createdAt: new Date().toISOString()
  };
  data.auditLogs.unshift(log);
  return log;
}

function managerFor(employee: Employee) {
  return data.employees.find((item) => item.id === employee.managerId);
}

function attendanceRate(employeeId: string) {
  const rows = data.attendance.filter((item) => item.employeeId === employeeId);
  if (!rows.length) return 0;
  return Math.round((rows.filter((item) => item.status === "Present").length / rows.length) * 100);
}

function buildBusinessSummary(ids: string[]) {
  const scopedAttendance = data.attendance.filter((item) => ids.includes(item.employeeId));
  const today = scopedAttendance.filter((item) => item.date === "2026-05-22");
  const payrollDrafts = data.payroll.filter((item) => ids.includes(item.employeeId) && item.status === "Draft").length;
  const pendingDocuments = data.employees
    .filter((item) => ids.includes(item.id))
    .flatMap((item) => item.documents)
    .filter((item) => item.status === "Pending").length;

  return [
    `${today.filter((item) => item.status === "Present").length} employees are present today and ${today.filter((item) => item.status === "Absent").length} are absent.`,
    `${data.leaves.filter((item) => ids.includes(item.employeeId) && item.status === "Pending").length} leave requests need review.`,
    `${payrollDrafts} payroll drafts and ${pendingDocuments} pending documents need follow-up.`
  ];
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid login payload" });

  const user = data.users.find((candidate) => candidate.email === parsed.data.email);
  if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const employee = data.employees.find((item) => item.id === user.employeeId);
  const { passwordHash, ...safeUser } = user;
  res.json({ token: signToken(user), user: safeUser, employee });
});

app.post("/api/auth/signup", (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid signup payload" });
  if (data.users.some((user) => user.email === parsed.data.email)) {
    return res.status(409).json({ message: "An account already exists for this email" });
  }

  const now = new Date().toISOString();
  const employeeId = `e${Date.now()}`;
  const user = {
    id: `u${Date.now()}`,
    email: parsed.data.email,
    passwordHash: bcrypt.hashSync(parsed.data.password, 10),
    role: "Employee" as const,
    employeeId
  };
  const employee = {
    id: employeeId,
    name: parsed.data.name,
    email: parsed.data.email,
    avatar: parsed.data.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    department: parsed.data.department,
    designation: parsed.data.designation,
    managerId: parsed.data.managerId || "e2",
    phone: "+91 90000 00000",
    location: parsed.data.location,
    joiningDate: now.slice(0, 10),
    leaveBalance: 18,
    salaryBand: "L1",
    employmentType: "Full-time" as const,
    documents: [],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Email" as const }
  };

  data.users.push(user);
  data.employees.push(employee);
  data.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorId: user.id,
    actorName: employee.name,
    action: "Signed up",
    entity: "Employee",
    entityId: employee.id,
    details: `${employee.name} joined ${employee.department} as ${employee.designation}.`,
    createdAt: now
  });
  data.notifications.unshift({
    id: `not-${Date.now()}`,
    title: "New employee signup",
    body: `${employee.name} joined ${employee.department} and needs onboarding review.`,
    type: "system",
    audience: "HR",
    createdAt: now,
    readBy: []
  });

  const { passwordHash, ...safeUser } = user;
  res.status(201).json({ token: signToken(user), user: safeUser, employee });
});

app.post("/api/auth/password-reset", (req, res) => {
  const email = String(req.body?.email || "");
  const exists = data.users.some((user) => user.email === email);
  res.json({
    sent: exists,
    message: exists ? "Password reset link queued for delivery." : "If the email exists, a reset link will be sent."
  });
});

app.use("/api", requireAuth);

app.get("/api/me", (req: AuthRequest, res) => {
  const employee = data.employees.find((item) => item.id === req.user?.employeeId);
  res.json({ user: req.user, employee });
});

app.get("/api/dashboard", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  const scopedAttendance = data.attendance.filter((item) => ids.includes(item.employeeId));
  const scopedLeaves = data.leaves.filter((item) => ids.includes(item.employeeId));
  const scopedPayroll = data.payroll.filter((item) => ids.includes(item.employeeId));
  const scopedTimesheets = data.timesheets.filter((item) => ids.includes(item.employeeId));
  const totalNetPayroll = scopedPayroll.reduce((sum, row) => sum + row.net, 0);
  const today = "2026-05-22";
  const attendanceToday = scopedAttendance.filter((item) => item.date === today);
  const notifications = data.notifications.filter(
    (item) =>
      item.audience === "All" ||
      item.audience === req.user?.role ||
      (item.audience === "HR" && (req.user?.role === "Admin" || req.user?.role === "HR Manager"))
  );

  res.json({
    metrics: {
      employees: ids.length,
      presentToday: attendanceToday.filter((item) => item.status === "Present").length,
      pendingLeaves: scopedLeaves.filter((item) => item.status === "Pending").length,
      payrollTotal: totalNetPayroll,
      lateLogins: scopedAttendance.filter((item) => item.late).length,
      absentToday: attendanceToday.filter((item) => item.status === "Absent").length,
      avgAttendance: ids.length ? Math.round(ids.reduce((sum, id) => sum + attendanceRate(id), 0) / ids.length) : 0,
      productiveHours: Number(scopedTimesheets.reduce((sum, row) => sum + row.hours, 0).toFixed(1))
    },
    charts: {
      attendance: [
        { label: "Present", value: scopedAttendance.filter((item) => item.status === "Present").length },
        { label: "Absent", value: scopedAttendance.filter((item) => item.status === "Absent").length },
        { label: "Late", value: scopedAttendance.filter((item) => item.late).length },
        { label: "WFH", value: scopedAttendance.filter((item) => item.mode === "WFH").length }
      ],
      leaves: ["Pending", "Approved", "Rejected"].map((status) => ({
        label: status,
        value: scopedLeaves.filter((item) => item.status === status).length
      })),
      productivity: data.employees
        .filter((item) => ids.includes(item.id))
        .map((employee) => ({
          label: employee.name.split(" ")[0],
          value: Number(scopedTimesheets.filter((row) => row.employeeId === employee.id).reduce((sum, row) => sum + row.hours, 0).toFixed(1))
        }))
    },
    notifications,
    businessSummary: buildBusinessSummary(ids),
    aiInsights: [
      attendanceToday.some((item) => item.status === "Absent") ? "AI alert: follow up with employees absent today without matching approved leave." : "AI insight: no unexplained absences detected today.",
      scopedPayroll.some((item) => item.status === "Draft") ? "AI insight: payroll drafts still need approval before cutoff." : "AI insight: payroll is on track.",
      scopedTimesheets.filter((item) => item.status === "Submitted").length > 0 ? "AI insight: submitted timesheets are ready for manager review." : "AI insight: timesheet approvals are current."
    ],
    announcements,
    holidays,
    onboarding,
    org: data.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      title: employee.designation,
      managerId: employee.managerId,
      managerName: managerFor(employee)?.name
    }))
  });
});

app.get("/api/employees", (_req: AuthRequest, res) => {
  res.json(data.employees.map((employee) => ({ ...employee, managerName: managerFor(employee)?.name || "Board" })));
});

app.get("/api/employees/:id", (req: AuthRequest, res) => {
  const id = routeParam(req.params.id);
  if (!canSeeEmployee(req.user, id)) {
    return res.status(403).json({ message: "Cannot view this employee" });
  }

  const employee = data.employees.find((item) => item.id === id);
  return employee ? res.json(employee) : res.status(404).json({ message: "Employee not found" });
});

app.patch("/api/employees/:id", (req: AuthRequest, res) => {
  const id = routeParam(req.params.id);
  const canEdit = req.user?.role === "Admin" || req.user?.role === "HR Manager" || req.user?.employeeId === id;
  if (!canEdit) return res.status(403).json({ message: "Cannot edit this employee" });

  const employee = data.employees.find((item) => item.id === id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  Object.assign(employee, req.body);
  addAudit(req, "Updated employee profile", "Employee", id, `Updated profile data for ${employee.name}.`);
  res.json(employee);
});

app.post("/api/employees/:id/documents", (req: AuthRequest, res) => {
  const id = routeParam(req.params.id);
  const canEdit = req.user?.role === "Admin" || req.user?.role === "HR Manager" || req.user?.employeeId === id;
  if (!canEdit) return res.status(403).json({ message: "Cannot upload documents for this employee" });

  const parsed = documentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid document payload" });

  const employee = data.employees.find((item) => item.id === id);
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const document = { id: `doc-${Date.now()}`, name: parsed.data.name, status: parsed.data.status, uploadedAt: new Date().toISOString().slice(0, 10) };
  employee.documents.unshift(document);
  addAudit(req, "Uploaded document", "EmployeeDocument", document.id, `Uploaded ${document.name} for ${employee.name}.`);
  res.status(201).json(document);
});

app.get("/api/attendance", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json(data.attendance.filter((item) => ids.includes(item.employeeId)));
});

app.post("/api/attendance/clock", (req: AuthRequest, res) => {
  const type = req.body?.type === "out" ? "out" : "in";
  const mode = req.body?.mode === "WFH" ? "WFH" : "Office";
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  let record = data.attendance.find((item) => item.employeeId === req.user?.employeeId && item.date === date);

  if (!record) {
    record = {
      id: `a${Date.now()}`,
      employeeId: req.user?.employeeId || "",
      date,
      status: "Present",
      mode,
      late: time > "09:30",
      productiveHours: 0
    };
    data.attendance.unshift(record);
  }

  if (!record) return res.status(500).json({ message: "Unable to create attendance record" });
  if (type === "in") record.clockIn = time;
  if (type === "out") record.clockOut = time;
  record.mode = mode;
  record.productiveHours = record.clockOut ? record.productiveHours || 8 : record.productiveHours || 0;
  addAudit(req, type === "in" ? "Clocked in" : "Clocked out", "Attendance", record.id, `${type === "in" ? "Clocked in" : "Clocked out"} via ${mode}.`);
  res.json(record);
});

app.get("/api/attendance/summary", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json(
    data.employees
      .filter((employee) => ids.includes(employee.id))
      .map((employee) => {
        const rows = data.attendance.filter((item) => item.employeeId === employee.id);
        return {
          employeeId: employee.id,
          name: employee.name,
          present: rows.filter((item) => item.status === "Present").length,
          absent: rows.filter((item) => item.status === "Absent").length,
          late: rows.filter((item) => item.late).length,
          wfh: rows.filter((item) => item.mode === "WFH").length,
          attendanceRate: attendanceRate(employee.id),
          productiveHours: Number(rows.reduce((sum, item) => sum + item.productiveHours, 0).toFixed(1))
        };
      })
  );
});

app.get("/api/leaves", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json(data.leaves.filter((item) => ids.includes(item.employeeId)));
});

app.post("/api/leaves", (req: AuthRequest, res) => {
  const parsed = leaveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid leave payload" });

  const leave = {
    id: `l${Date.now()}`,
    employeeId: req.user?.employeeId || "",
    ...parsed.data,
    days: daysBetween(parsed.data.from, parsed.data.to),
    status: "Pending" as const
  };
  data.leaves.unshift(leave);
  data.notifications.unshift({
    id: `not-${Date.now()}`,
    title: "New leave request",
    body: `${currentEmployee(req)?.name || "Employee"} requested ${leave.days} day(s) of ${leave.type} leave.`,
    type: "leave",
    audience: "HR",
    createdAt: new Date().toISOString(),
    readBy: []
  });
  addAudit(req, "Applied leave", "LeaveRequest", leave.id, `Applied ${leave.type} leave from ${leave.from} to ${leave.to}.`);
  res.status(201).json(leave);
});

app.patch("/api/leaves/:id", requireRole(["Admin", "HR Manager"]), (req: AuthRequest, res) => {
  const id = routeParam(req.params.id);
  const leave = data.leaves.find((item) => item.id === id);
  if (!leave) return res.status(404).json({ message: "Leave request not found" });

  if (["Approved", "Rejected"].includes(req.body?.status)) {
    leave.status = req.body.status;
    leave.approver = data.employees.find((item) => item.id === req.user?.employeeId)?.name;
    if (leave.status === "Approved") {
      const employee = data.employees.find((item) => item.id === leave.employeeId);
      if (employee) employee.leaveBalance = Math.max(0, employee.leaveBalance - leave.days);
    }
    data.notifications.unshift({
      id: `not-${Date.now()}`,
      title: `Leave ${leave.status.toLowerCase()}`,
      body: `Your ${leave.type} leave from ${leave.from} was ${leave.status.toLowerCase()}.`,
      type: "leave",
      audience: "Employee",
      createdAt: new Date().toISOString(),
      readBy: []
    });
    addAudit(req, `${leave.status} leave`, "LeaveRequest", leave.id, `${leave.status} leave request ${leave.id}.`);
  }

  res.json(leave);
});

app.get("/api/payroll", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json(data.payroll.filter((item) => ids.includes(item.employeeId)));
});

app.post("/api/payroll/process", requireRole(["Admin", "HR Manager"]), (req: AuthRequest, res) => {
  const month = String(req.body?.month || "May 2026");
  data.payroll.forEach((row) => {
    if (row.month === month && row.status === "Draft") row.status = "Processed";
  });
  addAudit(req, "Processed payroll", "Payroll", month, `Processed draft payroll rows for ${month}.`);
  res.json({ month, processed: data.payroll.filter((row) => row.month === month && row.status === "Processed").length });
});

app.get("/api/payroll/:id/payslip", (req: AuthRequest, res) => {
  const id = routeParam(req.params.id);
  const row = data.payroll.find((item) => item.id === id);
  if (!row || !canSeeEmployee(req.user, row.employeeId)) return res.status(404).json({ message: "Payslip not found" });

  const employee = data.employees.find((item) => item.id === row.employeeId);
  addAudit(req, "Generated payslip", "PayrollRecord", row.id, `Generated payslip for ${employee?.name || row.employeeId} ${row.month}.`);
  res.json({
    payslipNo: `PS-${row.id.toUpperCase()}`,
    employee,
    earnings: [{ label: "Base salary", amount: row.base }, { label: "Bonus", amount: row.bonus }],
    deductions: [{ label: "Tax and statutory", amount: row.deductions }],
    net: row.net,
    month: row.month,
    status: row.status
  });
});

app.get("/api/timesheets", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json(data.timesheets.filter((item) => ids.includes(item.employeeId)));
});

app.post("/api/timesheets", (req: AuthRequest, res) => {
  const parsed = timesheetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid timesheet payload" });

  const timesheet = { id: `t${Date.now()}`, employeeId: req.user?.employeeId || "", ...parsed.data, status: "Submitted" as const, billable: true };
  data.timesheets.unshift(timesheet);
  addAudit(req, "Submitted timesheet", "Timesheet", timesheet.id, `Submitted ${timesheet.hours} hours for ${timesheet.project}.`);
  res.status(201).json(timesheet);
});

app.get("/api/timesheets/summary", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json(
    data.employees
      .filter((employee) => ids.includes(employee.id))
      .map((employee) => {
        const rows = data.timesheets.filter((item) => item.employeeId === employee.id);
        const hours = rows.reduce((sum, item) => sum + item.hours, 0);
        return {
          employeeId: employee.id,
          name: employee.name,
          hours: Number(hours.toFixed(1)),
          billableHours: Number(rows.filter((item) => item.billable).reduce((sum, item) => sum + item.hours, 0).toFixed(1)),
          approved: rows.filter((item) => item.status === "Approved").length,
          submitted: rows.filter((item) => item.status === "Submitted").length,
          productivityScore: Math.min(100, Math.round((hours / 32) * 100))
        };
      })
  );
});

app.get("/api/audit-logs", requireRole(["Admin", "HR Manager"]), (_req: AuthRequest, res) => {
  res.json(data.auditLogs.slice(0, 50));
});

app.get("/api/reports/summary", (req: AuthRequest, res) => {
  const ids = visibleEmployeeIds(req);
  res.json({
    generatedAt: new Date().toISOString(),
    businessSummary: buildBusinessSummary(ids),
    lowAttendance: data.employees
      .filter((employee) => ids.includes(employee.id))
      .map((employee) => ({ name: employee.name, attendanceRate: attendanceRate(employee.id) }))
      .filter((item) => item.attendanceRate < 80),
    payroll: {
      totalNet: data.payroll.filter((row) => ids.includes(row.employeeId)).reduce((sum, row) => sum + row.net, 0),
      drafts: data.payroll.filter((row) => ids.includes(row.employeeId) && row.status === "Draft").length
    },
    workflowOutputs: data.notifications.slice(0, 5)
  });
});

app.post("/api/ai/chat", async (req: AuthRequest, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  try {
    res.json(await answerHrChat(messages, req));
  } catch (error) {
    res.status(502).json({ message: "AI assistant unavailable", detail: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.listen(port, () => {
  console.log(`HRMS API running on http://localhost:${port}/api`);
});
