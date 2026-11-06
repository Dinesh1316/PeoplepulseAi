export type Role = "Admin" | "HR Manager" | "Employee";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
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
  employmentType: "Full-time" | "Contract" | "Intern";
  documents: { id: string; name: string; status: string; uploadedAt: string }[];
  profileSettings: { timezone: string; notifications: boolean; preferredChannel: "Email" | "Slack" | "SMS" };
};

export type Attendance = {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: "Present" | "Absent" | "Half Day";
  mode: "Office" | "WFH";
  late: boolean;
  productiveHours: number;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: "Annual" | "Sick" | "Casual" | "WFH";
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
  status: "Draft" | "Processed" | "Paid";
  paidOn?: string;
};

export type Timesheet = {
  id: string;
  employeeId: string;
  date: string;
  project: string;
  hours: number;
  summary: string;
  status: "Draft" | "Submitted" | "Approved";
  billable: boolean;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: "leave" | "attendance" | "payroll" | "ai" | "system";
  audience: "All" | "Admin" | "HR" | "Employee";
  createdAt: string;
  readBy: string[];
};

export type AuditLog = {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
};

export type AppData = {
  users: User[];
  employees: Employee[];
  attendance: Attendance[];
  leaves: LeaveRequest[];
  payroll: PayrollRecord[];
  timesheets: Timesheet[];
  notifications: Notification[];
  auditLogs: AuditLog[];
};
