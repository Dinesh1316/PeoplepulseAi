export type Role = "Admin" | "HR Manager" | "Employee";

export type User = {
  id: string;
  email: string;
  role: Role;
  employeeId: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  designation: string;
  managerId?: string;
  phone: string;
  location: string;
  joiningDate: string;
  leaveBalance: number;
  salaryBand: string;
  employmentType: string;
  managerName?: string;
  documents: { id: string; name: string; status: string; uploadedAt: string }[];
  profileSettings: { timezone: string; notifications: boolean; preferredChannel: string };
};

export type Dashboard = {
  metrics: {
    employees: number;
    presentToday: number;
    pendingLeaves: number;
    payrollTotal: number;
    lateLogins: number;
    absentToday: number;
    avgAttendance: number;
    productiveHours: number;
  };
  charts: {
    attendance: { label: string; value: number }[];
    leaves: { label: string; value: number }[];
    productivity: { label: string; value: number }[];
  };
  notifications: { id: string; title: string; body: string; type: string; createdAt: string }[];
  businessSummary: string[];
  aiInsights: string[];
  announcements: { id: string; title: string; body: string; date: string }[];
  holidays: { date: string; name: string }[];
  onboarding: string[];
  org: { id: string; name: string; title: string; managerId?: string; managerName?: string }[];
};

export type Attendance = {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
  mode: string;
  late: boolean;
  productiveHours: number;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approver?: string;
};

export type PayrollRecord = {
  id: string;
  employeeId: string;
  month: string;
  base: number;
  bonus: number;
  deductions: number;
  net: number;
  status: string;
  paidOn?: string;
};

export type Timesheet = {
  id: string;
  employeeId: string;
  date: string;
  project: string;
  hours: number;
  summary: string;
  status: string;
  billable: boolean;
};

export type AttendanceSummary = {
  employeeId: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  wfh: number;
  attendanceRate: number;
  productiveHours: number;
};

export type TimesheetSummary = {
  employeeId: string;
  name: string;
  hours: number;
  billableHours: number;
  approved: number;
  submitted: number;
  productivityScore: number;
};

export type AuditLog = {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
};

export type Payslip = {
  payslipNo: string;
  employee: Employee;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  net: number;
  month: string;
  status: string;
};

export type AiChatResponse = {
  answer: string;
  source: string;
  actions: { type: string; label: string; payload?: unknown }[];
};
