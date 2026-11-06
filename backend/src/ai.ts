import OpenAI from "openai";
import { data, holidays, onboarding } from "./data.js";
import type { AuthRequest } from "./auth.js";
import type { PayrollRecord } from "./types.js";

const hrKnowledge = [
  "Annual leave is deducted only after approval. Employees can apply leave from the Leave module or by asking the AI assistant.",
  "Attendance is healthy above 90%. Clock-ins after 09:30 IST are marked late. WFH should be selected while clocking in.",
  "Payroll is processed monthly after attendance and timesheet verification. Payslips include base, bonus, deductions, and net pay.",
  "Timesheets should be submitted daily. Productivity summaries use logged hours, billable hours, and approval status.",
  "Onboarding requires document upload, payroll setup, policy acknowledgement, manager introduction, security training, and feedback."
];

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AiAction = {
  type: string;
  label: string;
  payload?: unknown;
};

function currentEmployee(req: AuthRequest) {
  return data.employees.find((item) => item.id === req.user?.employeeId);
}

function actorName(req: AuthRequest) {
  return currentEmployee(req)?.name || req.user?.email || "System";
}

function logAiAction(req: AuthRequest, action: string, entity: string, entityId: string, details: string) {
  data.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorId: req.user?.id || "system",
    actorName: actorName(req),
    action,
    entity,
    entityId,
    details,
    createdAt: new Date().toISOString()
  });
}

function notify(title: string, body: string, audience: "All" | "Admin" | "HR" | "Employee" = "HR") {
  data.notifications.unshift({
    id: `not-${Date.now()}`,
    title,
    body,
    type: "ai",
    audience,
    createdAt: new Date().toISOString(),
    readBy: []
  });
}

function todayAttendance() {
  return data.attendance.filter((item) => item.date === "2026-05-22");
}

function attendanceRate(employeeId: string) {
  const rows = data.attendance.filter((item) => item.employeeId === employeeId);
  if (!rows.length) return 0;
  return Math.round((rows.filter((item) => item.status === "Present").length / rows.length) * 100);
}

function payrollSummary(rows: PayrollRecord[]) {
  const totalNet = rows.reduce((sum, row) => sum + row.net, 0);
  const drafts = rows.filter((row) => row.status === "Draft").length;
  const processed = rows.filter((row) => row.status === "Processed").length;
  return `Payroll summary: ${rows.length} records, INR ${totalNet.toLocaleString("en-IN")} net payout, ${processed} processed, ${drafts} drafts pending.`;
}

function formatEmployeeList(ids: string[]) {
  return ids
    .map((id) => data.employees.find((employee) => employee.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

function organizationContext(req: AuthRequest) {
  const visibleEmployeeIds =
    req.user?.role === "Admin" || req.user?.role === "HR Manager" ? data.employees.map((item) => item.id) : [req.user?.employeeId || ""];
  const visibleEmployees = data.employees.filter((item) => visibleEmployeeIds.includes(item.id));
  const today = todayAttendance().filter((item) => visibleEmployeeIds.includes(item.employeeId));
  const departmentCounts = visibleEmployees.reduce<Record<string, number>>((acc, employee) => {
    acc[employee.department] = (acc[employee.department] || 0) + 1;
    return acc;
  }, {});
  const pendingLeaves = data.leaves.filter((item) => visibleEmployeeIds.includes(item.employeeId) && item.status === "Pending");
  const payrollDrafts = data.payroll.filter((item) => visibleEmployeeIds.includes(item.employeeId) && item.status === "Draft");
  const managers = visibleEmployees.map((employee) => {
    const manager = data.employees.find((item) => item.id === employee.managerId);
    return `${employee.name} reports to ${manager?.name || "Board"}`;
  });

  return {
    visibleEmployeeIds,
    text: [
      `Employees: ${visibleEmployees.map((item) => `${item.name} (${item.department}, ${item.designation})`).join("; ")}`,
      `Departments: ${Object.entries(departmentCounts).map(([name, count]) => `${name}: ${count}`).join(", ")}`,
      `Reporting: ${managers.join("; ")}`,
      `Today attendance: ${today.filter((item) => item.status === "Present").length} present, ${today.filter((item) => item.status === "Absent").length} absent, ${today.filter((item) => item.late).length} late.`,
      `Pending leaves: ${pendingLeaves.length}. Payroll drafts: ${payrollDrafts.length}.`,
      `Recent activity: ${data.auditLogs.slice(0, 5).map((log) => `${log.action} by ${log.actorName}`).join("; ")}`
    ].join("\n")
  };
}

function executeLocalCommand(question: string, req: AuthRequest): { answer: string; actions: AiAction[]; source: string } {
  const employee = currentEmployee(req);
  const lower = question.toLowerCase();
  const visibleEmployeeIds = organizationContext(req).visibleEmployeeIds;
  const visibleAttendance = data.attendance.filter((item) => visibleEmployeeIds.includes(item.employeeId));
  const visiblePayroll = data.payroll.filter((item) => visibleEmployeeIds.includes(item.employeeId));

  if (lower.includes("apply leave")) {
    const tomorrow = "2026-05-23";
    const leave = {
      id: `l-ai-${Date.now()}`,
      employeeId: req.user?.employeeId || "",
      type: "Annual" as const,
      from: lower.includes("tomorrow") ? tomorrow : "2026-06-03",
      to: lower.includes("tomorrow") ? tomorrow : "2026-06-03",
      days: 1,
      reason: "Created by AI assistant",
      status: "Pending" as const
    };
    data.leaves.unshift(leave);
    notify("AI-created leave request", `${employee?.name || "An employee"} requested leave for ${leave.from}.`);
    logAiAction(req, "AI applied leave", "LeaveRequest", leave.id, `Created pending leave for ${leave.from}.`);
    return {
      answer: `I created a pending ${leave.type} leave request for ${leave.from}. HR can approve or reject it in the Leave workflow.`,
      actions: [{ type: "leave_created", label: "Pending leave request created", payload: leave }],
      source: "ai-command"
    };
  }

  if (lower.includes("attendance this month") || lower.includes("my attendance")) {
    const myRows = visibleAttendance.filter((item) => item.employeeId === req.user?.employeeId);
    const present = myRows.filter((item) => item.status === "Present").length;
    const late = myRows.filter((item) => item.late).length;
    const wfh = myRows.filter((item) => item.mode === "WFH").length;
    return {
      answer: `Your May attendance summary has ${present}/${myRows.length} present days, ${late} late logins, ${wfh} WFH days, and ${myRows.reduce((sum, item) => sum + item.productiveHours, 0).toFixed(1)} productive hours logged.`,
      actions: [{ type: "attendance_summary", label: "Attendance summary generated", payload: { present, total: myRows.length, late, wfh } }],
      source: "ai-command"
    };
  }

  if (lower.includes("payroll summary") || lower.includes("generate payroll")) {
    const answer = payrollSummary(visiblePayroll.filter((row) => row.month === "May 2026"));
    logAiAction(req, "AI generated payroll summary", "Payroll", "May 2026", answer);
    return {
      answer,
      actions: [{ type: "report_generated", label: "Payroll summary generated" }],
      source: "ai-command"
    };
  }

  if (lower.includes("absent today")) {
    const absentIds = todayAttendance().filter((item) => item.status === "Absent").map((item) => item.employeeId);
    return {
      answer: absentIds.length ? `Absent today: ${formatEmployeeList(absentIds)}.` : "No absences are recorded today.",
      actions: [{ type: "attendance_alert", label: "Absence list generated", payload: absentIds }],
      source: "ai-command"
    };
  }

  if (lower.includes("low attendance")) {
    const low = data.employees
      .filter((item) => visibleEmployeeIds.includes(item.id))
      .map((item) => ({ employee: item, rate: attendanceRate(item.id) }))
      .filter((item) => item.rate < 80);
    return {
      answer: low.length
        ? `Employees with low attendance: ${low.map((item) => `${item.employee.name} (${item.rate}%)`).join(", ")}.`
        : "No employees are below the 80% attendance threshold in the current dataset.",
      actions: [{ type: "risk_report", label: "Low attendance report generated", payload: low }],
      source: "ai-command"
    };
  }

  if (lower.includes("draft leave approval email")) {
    const pending = data.leaves.find((item) => item.status === "Pending");
    const leaveEmployee = data.employees.find((item) => item.id === pending?.employeeId);
    return {
      answer: [
        `Subject: Leave request update for ${pending?.from || "your requested dates"}`,
        "",
        `Hi ${leaveEmployee?.name || "there"},`,
        `Your leave request for ${pending?.from || "the requested date"} has been reviewed and is approved. Please update your handover notes before logging off.`,
        "",
        "Regards,",
        "HR Team"
      ].join("\n"),
      actions: [{ type: "message_drafted", label: "Leave approval email drafted" }],
      source: "ai-command"
    };
  }

  if (lower.includes("announcement") || lower.includes("reminder") || lower.includes("payroll notification")) {
    return {
      answer: "Draft: Payroll processing for May 2026 is underway. Please submit pending timesheets and reimbursement details by 5 PM on May 25.",
      actions: [{ type: "message_drafted", label: "Payroll reminder drafted" }],
      source: "ai-command"
    };
  }

  if (lower.includes("business summary") || lower.includes("hr summary") || lower.includes("insights")) {
    const presentToday = todayAttendance().filter((item) => item.status === "Present").length;
    const absentToday = todayAttendance().filter((item) => item.status === "Absent").length;
    const pendingLeaves = data.leaves.filter((item) => item.status === "Pending").length;
    const submittedHours = data.timesheets.reduce((sum, item) => sum + item.hours, 0);
    return {
      answer: `HR business summary: ${presentToday} employees present today, ${absentToday} absent, ${pendingLeaves} leave requests pending, ${submittedHours.toFixed(1)} timesheet hours logged, and ${visiblePayroll.filter((row) => row.status === "Draft").length} payroll drafts need action.`,
      actions: [{ type: "business_summary", label: "Structured HR summary generated" }],
      source: "ai-command"
    };
  }

  if (lower.includes("leave")) {
    return {
      answer: employee
        ? `${employee.name} currently has ${employee.leaveBalance} leave days available. Pending requests do not reduce the balance until HR approves them.`
        : "You can find your current leave balance on the dashboard and in the Leave module.",
      actions: [],
      source: "local-knowledge"
    };
  }

  if (lower.includes("payroll") || lower.includes("salary") || lower.includes("payslip")) {
    const record = data.payroll.find((item) => item.employeeId === employee?.id);
    return {
      answer: record
        ? `Your latest payroll for ${record.month} is ${record.status}. Net pay is INR ${record.net.toLocaleString("en-IN")}.`
        : "Payroll is processed monthly after attendance and timesheet verification.",
      actions: [],
      source: "local-knowledge"
    };
  }

  if (lower.includes("attendance") || lower.includes("clock")) {
    return {
      answer: "Use Attendance to clock in or out. Clock-ins after 09:30 IST are marked late, and you can select Office or WFH mode.",
      actions: [],
      source: "local-knowledge"
    };
  }

  if (lower.includes("holiday")) {
    return { answer: `Upcoming holidays include ${holidays.map((holiday) => `${holiday.name} on ${holiday.date}`).join(", ")}.`, actions: [], source: "local-knowledge" };
  }

  if (lower.includes("onboard")) {
    return { answer: `The onboarding checklist is: ${onboarding.join("; ")}.`, actions: [], source: "local-knowledge" };
  }

  return {
    answer: [
      "Here is what I can see from the live HRMS data:",
      organizationContext(req).text,
      "Ask me a natural question about employees, managers, attendance, leave, payroll, documents, or workflow follow-ups."
    ].join("\n"),
    actions: [],
    source: "organization-context"
  };
}

export async function answerHrChat(messages: ChatMessage[], req: AuthRequest) {
  const latestQuestion = messages.at(-1)?.content ?? "";
  const localResult = executeLocalCommand(latestQuestion, req);
  const apiKey = process.env.OPENAI_API_KEY;
  const shouldUseLocalOnly = localResult.source === "ai-command";

  if (!apiKey || shouldUseLocalOnly) {
    return localResult;
  }

  const employee = currentEmployee(req);
  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: [
          "You are an HRMS assistant. Be concise, helpful, and policy-aware.",
          "You may explain workflows, but action execution is handled by local HRMS commands.",
          `Current user role: ${req.user?.role}.`,
          employee ? `Employee context: ${employee.name}, ${employee.department}, leave balance ${employee.leaveBalance}.` : "",
          `Live organization data:\n${organizationContext(req).text}`,
          `Knowledge base: ${hrKnowledge.join(" ")}`
        ].join("\n")
      },
      ...messages.slice(-8)
    ]
  });

  return {
    answer: completion.choices[0]?.message.content || localResult.answer,
    actions: localResult.actions,
    source: "openai"
  };
}
