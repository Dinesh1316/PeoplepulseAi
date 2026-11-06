import {
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  DollarSign,
  FileText,
  LogOut,
  Mail,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type Session } from "./api";
import type { Attendance, AttendanceSummary, AuditLog, Dashboard, Employee, LeaveRequest, PayrollRecord, Payslip, Timesheet, TimesheetSummary } from "./types";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: Building2 },
  { id: "employees", label: "Employees", icon: Users },
  { id: "attendance", label: "Attendance", icon: Clock3 },
  { id: "leave", label: "Leave", icon: CalendarDays },
  { id: "payroll", label: "Payroll", icon: DollarSign },
  { id: "timesheets", label: "Timesheets", icon: FileText },
  { id: "audit", label: "Activity Logs", icon: ClipboardList }
];

const demoUsers = [
  { role: "Admin", email: "admin@acmehr.com" },
  { role: "HR Manager", email: "hr@acmehr.com" },
  { role: "Employee", email: "ava@acmehr.com" }
];

const chartColors = ["#2563eb", "#10b981", "#f97316", "#7c3aed"];

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function Card(props: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${props.className || ""}`}>{props.children}</section>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>;
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("admin@acmehr.com");
  const [password, setPassword] = useState("password123");
  const [signup, setSignup] = useState({
    name: "Priya Menon",
    department: "Engineering",
    designation: "QA Engineer",
    location: "Bengaluru",
    managerId: "e2"
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "signup") {
        onLogin(await api.signup({ ...signup, email, password }));
      } else {
        onLogin(await api.login(email, password));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to login");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    const response = await api.passwordReset(email);
    setMessage(response.message);
  }

  return (
    <main className="login-shell">
      <section className="login-visual">
        <div>
          <span className="eyebrow">PeoplePulse AI</span>
          <h1>AI-powered HR operations for modern teams</h1>
          <p>Manage people, attendance, leave, payroll, timesheets, hierarchy, and live HR intelligence from one calm enterprise workspace.</p>
        </div>
        <div className="login-stats">
          <span><ShieldCheck size={18} /> Role-aware access</span>
          <span><Bot size={18} /> HR assistant</span>
          <span><Bell size={18} /> Smart reminders</span>
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <div>
          <span className="eyebrow">{mode === "signup" ? "Employee signup" : "Secure login"}</span>
          <h2>{mode === "signup" ? "Join your workspace" : "Welcome back"}</h2>
        </div>
        <div className="segmented auth-toggle">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
        </div>
        {mode === "signup" && (
          <>
            <label>
              Full name
              <input value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })} />
            </label>
            <div className="form-grid">
              <label>
                Department
                <input value={signup.department} onChange={(event) => setSignup({ ...signup, department: event.target.value })} />
              </label>
              <label>
                Designation
                <input value={signup.designation} onChange={(event) => setSignup({ ...signup, designation: event.target.value })} />
              </label>
            </div>
            <label>
              Location
              <input value={signup.location} onChange={(event) => setSignup({ ...signup, location: event.target.value })} />
            </label>
          </>
        )}
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <div className="demo-row">
          {demoUsers.map((user) => (
            <button key={user.email} type="button" onClick={() => setEmail(user.email)}>
              {user.role}
            </button>
          ))}
        </div>
        {message && <p className="form-message">{message}</p>}
        <button className="primary-button" disabled={loading}>
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
        </button>
        <button className="link-button" type="button" onClick={resetPassword}>
          Password reset
        </button>
      </form>
    </main>
  );
}

function DashboardView({ dashboard, employee, employees }: { dashboard: Dashboard; employee: Employee; employees: Employee[] }) {
  const [department, setDepartment] = useState("All");
  const [focus, setFocus] = useState("Operations");
  const departments = ["All", ...Array.from(new Set(employees.map((item) => item.department)))];
  const scopedEmployees = department === "All" ? employees : employees.filter((item) => item.department === department);
  const scopedProductivity = department === "All"
    ? dashboard.charts.productivity
    : dashboard.charts.productivity.filter((item) => scopedEmployees.some((employee) => employee.name.startsWith(item.label)));
  const stats = [
    { label: "Employees", value: scopedEmployees.length || dashboard.metrics.employees, icon: Users },
    { label: "Present today", value: dashboard.metrics.presentToday, icon: Clock3 },
    { label: "Absent today", value: dashboard.metrics.absentToday, icon: Bell },
    { label: "Pending leave", value: dashboard.metrics.pendingLeaves, icon: CalendarDays },
    { label: "Avg attendance", value: `${dashboard.metrics.avgAttendance}%`, icon: Sparkles },
    { label: "Productive hours", value: dashboard.metrics.productiveHours, icon: FileText },
    { label: "Payroll", value: currency(dashboard.metrics.payrollTotal), icon: DollarSign }
  ];

  return (
    <div className="grid-stack">
      <div className="hero-band">
        <div>
          <span className="eyebrow">Today, 22 May 2026</span>
          <h1>Good to see you, {employee.name.split(" ")[0]}</h1>
          <p>{employee.designation} / {employee.department} / {employee.location}</p>
        </div>
        <div className="hero-balance">
          <span>Leave balance</span>
          <strong>{employee.leaveBalance}</strong>
          <small>days available</small>
        </div>
      </div>
      <Card>
        <div className="dashboard-controls">
          <label>
            Department
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              {departments.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Focus
            <select value={focus} onChange={(event) => setFocus(event.target.value)}>
              <option>Operations</option>
              <option>Attendance</option>
              <option>Payroll</option>
              <option>Productivity</option>
            </select>
          </label>
          <div className="live-chip"><Sparkles size={16} /> Live view updates after signup and workflow actions</div>
        </div>
      </Card>
      <div className="metric-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="metric">
                <Icon size={22} />
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="two-col">
        <Card>
          <h3>Attendance Overview</h3>
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={dashboard.charts.attendance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3>Leave Statistics</h3>
          <div className="chart-box">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dashboard.charts.leaves} dataKey="value" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={4}>
                  {dashboard.charts.leaves.map((_, index) => <Cell key={index} fill={chartColors[index]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="two-col">
        <Card>
          <h3>Productivity Insights</h3>
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={scopedProductivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3>AI Business Summary</h3>
          <div className="list">
            {dashboard.businessSummary.map((item) => (
              <article key={item} className="list-item">
                <Sparkles size={17} />
                <div><strong>{item}</strong></div>
              </article>
            ))}
            {dashboard.aiInsights.map((item) => (
              <article key={item} className="list-item">
                <Bot size={17} />
                <div><strong>{item}</strong></div>
              </article>
            ))}
          </div>
        </Card>
      </div>
      <div className="three-col">
        <Card>
          <h3>Notifications</h3>
          <div className="list">
            {dashboard.notifications.map((item) => (
              <article key={item.id} className="list-item">
                <Bell size={17} />
                <div><strong>{item.title}</strong><p>{item.body}</p></div>
              </article>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Announcements</h3>
          <div className="list">
            {dashboard.announcements.map((item) => (
              <article key={item.id} className="list-item">
                <ChevronRight size={17} />
                <div><strong>{item.title}</strong><p>{item.body}</p></div>
              </article>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Onboarding</h3>
          <div className="list">
            {dashboard.onboarding.map((item) => (
              <article key={item} className="list-item">
                <Check size={17} />
                <div><strong>{item}</strong></div>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OrgHierarchy({ employees }: { employees: Employee[] }) {
  const root = employees.find((employee) => !employee.managerId) || employees[0];
  const childrenFor = (managerId?: string) => employees.filter((employee) => employee.managerId === managerId);
  const renderNode = (employee: Employee, depth = 0): React.ReactNode => (
    <div key={employee.id} className="tree-branch" style={{ marginLeft: depth ? 18 : 0 }}>
      <div className="tree-node">
        <div className="avatar">{employee.avatar || initials(employee.name)}</div>
        <div>
          <strong>{employee.name}</strong>
          <span>{employee.designation}</span>
          <small>{employee.department}</small>
        </div>
      </div>
      {childrenFor(employee.id).length > 0 && (
        <div className="tree-children">
          {childrenFor(employee.id).map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <div className="section-head"><h2>Organization Hierarchy</h2><span>{employees.length} people mapped</span></div>
      <div className="hierarchy-tree">{root ? renderNode(root) : null}</div>
    </Card>
  );
}

function EmployeesView({ token, employees, refresh }: { token: string; employees: Employee[]; refresh: () => void }) {
  const [documentName, setDocumentName] = useState("Updated address proof");
  const [query, setQuery] = useState("");
  const filtered = employees.filter((employee) =>
    [employee.name, employee.department, employee.designation, employee.managerName || ""].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  async function upload(employeeId: string) {
    await api.uploadDocument(token, employeeId, documentName);
    refresh();
  }

  return (
    <div className="grid-stack">
    <Card>
      <div className="section-head"><h2>Employee Directory</h2><span>{filtered.length} people</span></div>
      <input className="directory-search" placeholder="Search by name, team, role, or manager" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="employee-grid">
        {filtered.map((employee) => (
          <article key={employee.id} className="employee-card">
            <div className="avatar">{employee.avatar || initials(employee.name)}</div>
            <div>
              <h3>{employee.name}</h3>
              <p>{employee.designation}</p>
              <span>{employee.department}</span>
            </div>
            <div className="employee-meta">
              <span>{employee.email}</span>
              <span>{employee.phone}</span>
              <span>{employee.location}</span>
              <span>Manager: {employee.managerName || "Board"}</span>
              <span>{employee.employmentType} / {employee.salaryBand}</span>
            </div>
            <div className="doc-row">
              {employee.documents.map((document) => <StatusPill key={document.name} status={document.status} />)}
            </div>
            <div className="upload-row">
              <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} aria-label="Document name" />
              <button className="icon-button" title="Upload document" onClick={() => upload(employee.id)}><Upload /></button>
            </div>
          </article>
        ))}
      </div>
    </Card>
    <OrgHierarchy employees={employees} />
    </div>
  );
}

function AttendanceView({ token, rows, summary, refresh }: { token: string; rows: Attendance[]; summary: AttendanceSummary[]; refresh: () => void }) {
  const [mode, setMode] = useState<"Office" | "WFH">("Office");

  async function clock(type: "in" | "out") {
    await api.clock(token, type, mode);
    refresh();
  }

  return (
    <div className="grid-stack">
      <Card>
        <div className="section-head">
          <h2>Daily Attendance</h2>
          <div className="segmented">
            <button className={mode === "Office" ? "active" : ""} onClick={() => setMode("Office")}>Office</button>
            <button className={mode === "WFH" ? "active" : ""} onClick={() => setMode("WFH")}>WFH</button>
          </div>
        </div>
        <div className="action-row">
          <button className="primary-button" onClick={() => clock("in")}><Clock3 size={17} /> Clock in</button>
          <button className="secondary-button" onClick={() => clock("out")}><LogOut size={17} /> Clock out</button>
        </div>
      </Card>
      <DataTable headers={["Employee", "Rate", "Present", "Absent", "Late", "WFH", "Hours"]} rows={summary.map((row) => [
        row.name,
        `${row.attendanceRate}%`,
        row.present,
        row.absent,
        row.late,
        row.wfh,
        row.productiveHours
      ])} />
      <DataTable headers={["Date", "Clock in", "Clock out", "Mode", "Late", "Status"]} rows={rows.map((row) => [
        row.date,
        row.clockIn || "-",
        row.clockOut || "-",
        row.mode,
        row.late ? "Yes" : "No",
        row.status
      ])} />
    </div>
  );
}

function LeaveView({ token, rows, refresh, canApprove }: { token: string; rows: LeaveRequest[]; refresh: () => void; canApprove: boolean }) {
  const [form, setForm] = useState({ type: "Annual", from: "2026-06-10", to: "2026-06-12", reason: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await api.applyLeave(token, form);
    setForm({ ...form, reason: "" });
    refresh();
  }

  async function update(id: string, status: "Approved" | "Rejected") {
    await api.updateLeave(token, id, status);
    refresh();
  }

  return (
    <div className="two-col">
      <Card>
        <h2>Apply Leave</h2>
        <form className="stack-form" onSubmit={submit}>
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option>Annual</option><option>Sick</option><option>Casual</option><option>WFH</option>
          </select>
          <input type="date" value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} />
          <input type="date" value={form.to} onChange={(event) => setForm({ ...form, to: event.target.value })} />
          <textarea placeholder="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
          <button className="primary-button">Submit request</button>
        </form>
      </Card>
      <Card>
        <h2>Leave Workflow</h2>
        <div className="list">
          {rows.map((row) => (
            <article key={row.id} className="workflow-item">
              <div>
                <strong>{row.type} / {row.days} day(s)</strong>
                <p>{row.from} to {row.to} / {row.reason}</p>
              </div>
              <StatusPill status={row.status} />
              {canApprove && row.status === "Pending" && (
                <div className="mini-actions">
                  <button onClick={() => update(row.id, "Approved")}>Approve</button>
                  <button onClick={() => update(row.id, "Rejected")}>Reject</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PayrollView({ token, rows, refresh, canProcess }: { token: string; rows: PayrollRecord[]; refresh: () => void; canProcess: boolean }) {
  const [payslip, setPayslip] = useState<Payslip | null>(null);

  async function process() {
    await api.processPayroll(token, "May 2026");
    refresh();
  }

  async function generate(id: string) {
    setPayslip(await api.payslip(token, id));
  }

  return (
    <div className="grid-stack">
      <Card>
        <div className="section-head">
          <h2>Payroll Summary</h2>
          {canProcess && <button className="primary-button" onClick={process}>Process May payroll</button>}
        </div>
      </Card>
      {payslip && (
        <Card>
          <div className="section-head"><h2>{payslip.payslipNo}</h2><StatusPill status={payslip.status} /></div>
          <div className="payslip-grid">
            <span>{payslip.employee.name}</span>
            <span>{payslip.month}</span>
            <strong>{currency(payslip.net)}</strong>
          </div>
        </Card>
      )}
      <DataTable headers={["Month", "Base", "Bonus", "Deductions", "Net", "Status", "Payslip"]} rows={rows.map((row) => [
        row.month,
        currency(row.base),
        currency(row.bonus),
        currency(row.deductions),
        currency(row.net),
        row.status,
        "Use action below"
      ])} />
      <Card>
        <div className="action-grid">
          {rows.map((row) => (
            <button key={row.id} className="secondary-button" onClick={() => generate(row.id)}><Download size={17} /> Generate {row.month} payslip</button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TimesheetView({ token, rows, summary, refresh }: { token: string; rows: Timesheet[]; summary: TimesheetSummary[]; refresh: () => void }) {
  const [form, setForm] = useState({ date: "2026-05-22", project: "", hours: 6, summary: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await api.addTimesheet(token, form);
    setForm({ ...form, project: "", summary: "" });
    refresh();
  }

  return (
    <div className="two-col">
      <Card>
        <h2>Log Work</h2>
        <form className="stack-form" onSubmit={submit}>
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <input placeholder="Project" value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} />
          <input type="number" min="0.5" max="24" step="0.5" value={form.hours} onChange={(event) => setForm({ ...form, hours: Number(event.target.value) })} />
          <textarea placeholder="Summary" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          <button className="primary-button">Save timesheet</button>
        </form>
      </Card>
      <DataTable headers={["Employee", "Hours", "Billable", "Approved", "Submitted", "Score"]} rows={summary.map((row) => [
        row.name,
        row.hours,
        row.billableHours,
        row.approved,
        row.submitted,
        `${row.productivityScore}%`
      ])} />
      <DataTable headers={["Date", "Project", "Hours", "Summary"]} rows={rows.map((row) => [row.date, row.project, row.hours, row.summary])} />
    </div>
  );
}

function FloatingAssistant({ token, refresh }: { token: string; refresh: () => void }) {
  const initialOpen = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("assistant") === "1";
  const [open, setOpen] = useState(Boolean(initialOpen));
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi, I can answer from live PeoplePulse data and help run HR workflows." }
  ]);
  const [actions, setActions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [chatStatus, setChatStatus] = useState<"idle" | "sending">("idle");
  const [chatError, setChatError] = useState("");
  const suggestions = [
    "Apply leave for tomorrow",
    "Show my attendance this month",
    "Generate payroll summary",
    "Who is absent today?",
    "Draft leave approval email",
    "Show employees with low attendance",
    "Create HR business summary"
  ];

  async function submitPrompt(prompt: string) {
    const content = prompt.trim();
    if (!content || chatStatus === "sending") return;

    setChatStatus("sending");
    setChatError("");
    setActions([]);
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    try {
      const response = await api.chat(token, nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: response.answer }]);
      setActions(response.actions?.map((action) => action.label) || []);
      if (response.actions?.length) refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach Pulse AI";
      setChatError(message);
      setMessages([...nextMessages, { role: "assistant", content: `I could not complete that request: ${message}` }]);
    } finally {
      setChatStatus("idle");
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    await submitPrompt(input);
  }

  return (
    <div className="floating-assistant">
      {open && (
        <section className="assistant-dock">
      <div className="section-head"><h2>Pulse AI</h2><span>Live HR assistant</span></div>
      <div className="suggestion-row">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" disabled={chatStatus === "sending"} onClick={() => submitPrompt(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
      <div className="chat-log">
        {messages.map((message, index) => (
          <div key={index} className={`chat-bubble ${message.role}`}>{message.content}</div>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="workflow-output">
          {actions.map((action) => <button type="button" key={action}><Sparkles size={15} /> {action}</button>)}
        </div>
      )}
      {chatError && <p className="assistant-error">{chatError}</p>}
      <form className="chat-form" onSubmit={send}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about leave, payroll, attendance..." />
        <button className="primary-button" disabled={!input.trim() || chatStatus === "sending"}>
          {chatStatus === "sending" ? "..." : <Send size={17} />}
        </button>
      </form>
        </section>
      )}
      <button className="assistant-fab" onClick={() => setOpen(!open)} title="Open Pulse AI assistant" aria-label="Open Pulse AI assistant">
        <Bot />
      </button>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <Card>
      <div className="table-wrap">
        <table>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditView({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="grid-stack">
      <Card>
        <div className="section-head"><h2>Audit & Activity Logs</h2><span>{logs.length} tracked actions</span></div>
        <div className="list">
          {logs.map((log) => (
            <article key={log.id} className="list-item">
              <ShieldCheck size={17} />
              <div>
                <strong>{log.action} / {log.entity}</strong>
                <p>{log.details}</p>
                <small>{log.actorName} / {new Date(log.createdAt).toLocaleString()}</small>
              </div>
            </article>
          ))}
        </div>
      </Card>
      <Card>
        <h2>Email & Message Automation</h2>
        <div className="message-grid">
          <article><Mail size={18} /><strong>Leave approval email</strong><span>Generated from pending leave context.</span></article>
          <article><Bell size={18} /><strong>Attendance reminder</strong><span>Triggered for absent and late-login follow-ups.</span></article>
          <article><DollarSign size={18} /><strong>Payroll notification</strong><span>Drafted before payroll cutoff and processing.</span></article>
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem("hrms-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if ((parsed.user.role as string) === "HR") parsed.user.role = "HR Manager";
    return parsed;
  });
  const [active, setActive] = useState("dashboard");
  const [dark, setDark] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [timesheetSummary, setTimesheetSummary] = useState<TimesheetSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const canManage = session?.user.role === "Admin" || session?.user.role === "HR Manager";

  async function refresh() {
    if (!session) return;
    const [nextDashboard, nextEmployees, nextAttendance, nextLeaves, nextPayroll, nextTimesheets, nextAttendanceSummary, nextTimesheetSummary] = await Promise.all([
      api.dashboard(session.token),
      api.employees(session.token),
      api.attendance(session.token),
      api.leaves(session.token),
      api.payroll(session.token),
      api.timesheets(session.token),
      api.attendanceSummary(session.token),
      api.timesheetSummary(session.token)
    ]);
    setDashboard(nextDashboard);
    setEmployees(nextEmployees);
    setAttendance(nextAttendance);
    setLeaves(nextLeaves);
    setPayroll(nextPayroll);
    setTimesheets(nextTimesheets);
    setAttendanceSummary(nextAttendanceSummary);
    setTimesheetSummary(nextTimesheetSummary);
    if (session.user.role === "Admin" || session.user.role === "HR Manager") {
      setAuditLogs(await api.auditLogs(session.token));
    }
  }

  useEffect(() => {
    if (session) {
      localStorage.setItem("hrms-session", JSON.stringify(session));
      refresh();
    }
  }, [session?.token]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (!session) return <Login onLogin={setSession} />;
  if (!dashboard) return <div className="loading">Loading HRMS workspace...</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><ShieldCheck /> <span>PeoplePulse AI</span></div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)} title={item.label}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{session.user.role} workspace</span>
            <h1>{nav.find((item) => item.id === active)?.label}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
            <div className="user-chip"><UserRound size={17} /> {session.employee.name}</div>
            <button className="icon-button" onClick={() => { localStorage.removeItem("hrms-session"); setSession(null); }} title="Logout"><LogOut /></button>
          </div>
        </header>
        {active === "dashboard" && <DashboardView dashboard={dashboard} employee={session.employee} employees={employees} />}
        {active === "employees" && <EmployeesView token={session.token} employees={employees} refresh={refresh} />}
        {active === "attendance" && <AttendanceView token={session.token} rows={attendance} summary={attendanceSummary} refresh={refresh} />}
        {active === "leave" && <LeaveView token={session.token} rows={leaves} refresh={refresh} canApprove={canManage} />}
        {active === "payroll" && <PayrollView token={session.token} rows={payroll} refresh={refresh} canProcess={canManage} />}
        {active === "timesheets" && <TimesheetView token={session.token} rows={timesheets} summary={timesheetSummary} refresh={refresh} />}
        {active === "audit" && <AuditView logs={auditLogs} />}
        <FloatingAssistant token={session.token} refresh={refresh} />
      </main>
    </div>
  );
}
