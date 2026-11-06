import type { AiChatResponse, Attendance, AttendanceSummary, AuditLog, Dashboard, Employee, LeaveRequest, PayrollRecord, Payslip, Timesheet, TimesheetSummary, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export type Session = {
  token: string;
  user: User;
  employee: Employee;
};

async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message || "Request failed");
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<Session>("/auth/login", undefined, { method: "POST", body: JSON.stringify({ email, password }) }),
  signup: (payload: { name: string; email: string; password: string; department: string; designation: string; location: string; managerId?: string }) =>
    request<Session>("/auth/signup", undefined, { method: "POST", body: JSON.stringify(payload) }),
  passwordReset: (email: string) =>
    request<{ sent: boolean; message: string }>("/auth/password-reset", undefined, {
      method: "POST",
      body: JSON.stringify({ email })
    }),
  dashboard: (token: string) => request<Dashboard>("/dashboard", token),
  employees: (token: string) => request<Employee[]>("/employees", token),
  uploadDocument: (token: string, employeeId: string, name: string) =>
    request<{ id: string; name: string; status: string; uploadedAt: string }>(`/employees/${employeeId}/documents`, token, {
      method: "POST",
      body: JSON.stringify({ name, status: "Uploaded" })
    }),
  attendance: (token: string) => request<Attendance[]>("/attendance", token),
  attendanceSummary: (token: string) => request<AttendanceSummary[]>("/attendance/summary", token),
  clock: (token: string, type: "in" | "out", mode: "Office" | "WFH") =>
    request<Attendance>("/attendance/clock", token, { method: "POST", body: JSON.stringify({ type, mode }) }),
  leaves: (token: string) => request<LeaveRequest[]>("/leaves", token),
  applyLeave: (token: string, payload: { type: string; from: string; to: string; reason: string }) =>
    request<LeaveRequest>("/leaves", token, { method: "POST", body: JSON.stringify(payload) }),
  updateLeave: (token: string, id: string, status: "Approved" | "Rejected") =>
    request<LeaveRequest>(`/leaves/${id}`, token, { method: "PATCH", body: JSON.stringify({ status }) }),
  payroll: (token: string) => request<PayrollRecord[]>("/payroll", token),
  payslip: (token: string, id: string) => request<Payslip>(`/payroll/${id}/payslip`, token),
  processPayroll: (token: string, month: string) =>
    request<{ month: string; processed: number }>("/payroll/process", token, {
      method: "POST",
      body: JSON.stringify({ month })
    }),
  timesheets: (token: string) => request<Timesheet[]>("/timesheets", token),
  timesheetSummary: (token: string) => request<TimesheetSummary[]>("/timesheets/summary", token),
  addTimesheet: (token: string, payload: { date: string; project: string; hours: number; summary: string }) =>
    request<Timesheet>("/timesheets", token, { method: "POST", body: JSON.stringify(payload) }),
  chat: (token: string, messages: { role: "user" | "assistant"; content: string }[]) =>
    request<AiChatResponse>("/ai/chat", token, {
      method: "POST",
      body: JSON.stringify({ messages })
    }),
  auditLogs: (token: string) => request<AuditLog[]>("/audit-logs", token),
  reportSummary: (token: string) => request<unknown>("/reports/summary", token)
};
