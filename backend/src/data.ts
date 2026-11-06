import bcrypt from "bcryptjs";
import type { AppData, Attendance, Employee, PayrollRecord, Timesheet } from "./types.js";

const passwordHash = bcrypt.hashSync("password123", 10);

const employees: Employee[] = [
  {
    id: "e1",
    name: "Maya Srinivasan",
    email: "admin@acmehr.com",
    avatar: "MS",
    department: "Executive",
    designation: "Chief People Officer",
    phone: "+91 90000 11111",
    location: "Bengaluru",
    joiningDate: "2021-04-12",
    leaveBalance: 21,
    salaryBand: "L7",
    employmentType: "Full-time",
    documents: [{ id: "d1", name: "Employment Agreement", status: "Verified", uploadedAt: "2026-01-12" }],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Email" }
  },
  {
    id: "e2",
    name: "Rohan Mehta",
    email: "hr@acmehr.com",
    avatar: "RM",
    department: "Human Resources",
    designation: "HR Manager",
    managerId: "e1",
    phone: "+91 90000 22222",
    location: "Hyderabad",
    joiningDate: "2022-01-10",
    leaveBalance: 16,
    salaryBand: "L5",
    employmentType: "Full-time",
    documents: [
      { id: "d2", name: "PAN Card", status: "Verified", uploadedAt: "2026-01-14" },
      { id: "d3", name: "HR Certification", status: "Uploaded", uploadedAt: "2026-04-08" }
    ],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Slack" }
  },
  {
    id: "e3",
    name: "Ava Kapoor",
    email: "ava@acmehr.com",
    avatar: "AK",
    department: "Engineering",
    designation: "Frontend Engineer",
    managerId: "e2",
    phone: "+91 90000 33333",
    location: "Pune",
    joiningDate: "2023-08-21",
    leaveBalance: 12,
    salaryBand: "L3",
    employmentType: "Full-time",
    documents: [
      { id: "d4", name: "ID Proof", status: "Verified", uploadedAt: "2026-02-02" },
      { id: "d5", name: "Address Proof", status: "Pending", uploadedAt: "2026-05-14" }
    ],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Email" }
  },
  {
    id: "e4",
    name: "Kabir Anand",
    email: "kabir@acmehr.com",
    avatar: "KA",
    department: "Finance",
    designation: "Payroll Specialist",
    managerId: "e1",
    phone: "+91 90000 44444",
    location: "Delhi",
    joiningDate: "2022-11-02",
    leaveBalance: 15,
    salaryBand: "L4",
    employmentType: "Full-time",
    documents: [{ id: "d6", name: "Bank Details", status: "Verified", uploadedAt: "2026-01-18" }],
    profileSettings: { timezone: "Asia/Kolkata", notifications: false, preferredChannel: "Email" }
  },
  {
    id: "e5",
    name: "Nisha Rao",
    email: "nisha@acmehr.com",
    avatar: "NR",
    department: "Sales",
    designation: "Account Executive",
    managerId: "e2",
    phone: "+91 90000 55555",
    location: "Mumbai",
    joiningDate: "2024-02-05",
    leaveBalance: 9,
    salaryBand: "L3",
    employmentType: "Full-time",
    documents: [{ id: "d7", name: "Offer Letter", status: "Verified", uploadedAt: "2026-01-21" }],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Slack" }
  },
  {
    id: "e6",
    name: "Ishaan Verma",
    email: "ishaan@acmehr.com",
    avatar: "IV",
    department: "Engineering",
    designation: "Backend Engineer",
    managerId: "e2",
    phone: "+91 90000 66666",
    location: "Chennai",
    joiningDate: "2023-03-15",
    leaveBalance: 6,
    salaryBand: "L4",
    employmentType: "Full-time",
    documents: [{ id: "d8", name: "Address Proof", status: "Pending", uploadedAt: "2026-05-08" }],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Email" }
  },
  {
    id: "e7",
    name: "Sara Thomas",
    email: "sara@acmehr.com",
    avatar: "ST",
    department: "Design",
    designation: "Product Designer",
    managerId: "e2",
    phone: "+91 90000 77777",
    location: "Kochi",
    joiningDate: "2024-09-01",
    leaveBalance: 18,
    salaryBand: "L3",
    employmentType: "Contract",
    documents: [{ id: "d9", name: "Contract Agreement", status: "Uploaded", uploadedAt: "2026-03-02" }],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "Slack" }
  },
  {
    id: "e8",
    name: "Dev Malhotra",
    email: "dev@acmehr.com",
    avatar: "DM",
    department: "Operations",
    designation: "Operations Analyst",
    managerId: "e4",
    phone: "+91 90000 88888",
    location: "Noida",
    joiningDate: "2025-01-20",
    leaveBalance: 14,
    salaryBand: "L2",
    employmentType: "Intern",
    documents: [{ id: "d10", name: "Internship Agreement", status: "Verified", uploadedAt: "2026-01-28" }],
    profileSettings: { timezone: "Asia/Kolkata", notifications: true, preferredChannel: "SMS" }
  }
];

const dates = ["2026-05-22", "2026-05-21", "2026-05-20", "2026-05-19", "2026-05-18"];
const attendance: Attendance[] = dates.flatMap((date, dayIndex) =>
  employees.slice(1).map((employee, employeeIndex) => {
    const absent = date === "2026-05-22" && ["e5", "e8"].includes(employee.id);
    const late = !absent && (employeeIndex + dayIndex) % 4 === 0;
    return {
      id: `a-${date}-${employee.id}`,
      employeeId: employee.id,
      date,
      clockIn: absent ? undefined : late ? "09:47" : "09:08",
      clockOut: absent ? undefined : "18:10",
      status: absent ? "Absent" : dayIndex === 3 && employee.id === "e7" ? "Half Day" : "Present",
      mode: (employeeIndex + dayIndex) % 3 === 0 ? "WFH" : "Office",
      late,
      productiveHours: absent ? 0 : dayIndex === 3 && employee.id === "e7" ? 4 : late ? 7.2 : 8.1
    };
  })
);

const payroll: PayrollRecord[] = employees.slice(1).flatMap((employee, index) => {
  const base = 92000 + index * 11000;
  return ["May 2026", "April 2026"].map((month, monthIndex) => ({
    id: `p-${employee.id}-${monthIndex}`,
    employeeId: employee.id,
    month,
    base,
    bonus: monthIndex === 0 ? 6000 + index * 900 : 3500 + index * 600,
    deductions: 6200 + index * 550,
    net: base + (monthIndex === 0 ? 6000 + index * 900 : 3500 + index * 600) - (6200 + index * 550),
    status: monthIndex === 0 ? (index % 3 === 0 ? "Draft" : "Processed") : "Paid",
    paidOn: monthIndex === 1 ? "2026-04-30" : undefined
  }));
});

const timesheets: Timesheet[] = employees.slice(1).flatMap((employee, employeeIndex) =>
  dates.slice(0, 4).map((date, dayIndex) => ({
    id: `t-${employee.id}-${date}`,
    employeeId: employee.id,
    date,
    project: ["HRMS Automation", "Customer Portal", "Payroll Reconciliation", "Design System"][employeeIndex % 4],
    hours: 5.5 + ((employeeIndex + dayIndex) % 4),
    summary: ["Feature delivery", "Bug fixes", "Stakeholder review", "Documentation"][dayIndex],
    status: dayIndex === 0 ? "Submitted" : "Approved",
    billable: employeeIndex % 2 === 0
  }))
);

export const data: AppData = {
  users: [
    { id: "u1", email: "admin@acmehr.com", passwordHash, role: "Admin", employeeId: "e1" },
    { id: "u2", email: "hr@acmehr.com", passwordHash, role: "HR Manager", employeeId: "e2" },
    { id: "u3", email: "ava@acmehr.com", passwordHash, role: "Employee", employeeId: "e3" },
    { id: "u4", email: "kabir@acmehr.com", passwordHash, role: "Employee", employeeId: "e4" }
  ],
  employees,
  attendance,
  leaves: [
    { id: "l1", employeeId: "e3", type: "Annual", from: "2026-06-10", to: "2026-06-12", days: 3, reason: "Family travel", status: "Pending" },
    { id: "l2", employeeId: "e4", type: "Sick", from: "2026-05-20", to: "2026-05-20", days: 1, reason: "Fever", status: "Approved", approver: "Rohan Mehta" },
    { id: "l3", employeeId: "e6", type: "Casual", from: "2026-05-27", to: "2026-05-27", days: 1, reason: "Personal appointment", status: "Pending" },
    { id: "l4", employeeId: "e7", type: "WFH", from: "2026-05-24", to: "2026-05-24", days: 1, reason: "Home repair", status: "Approved", approver: "Rohan Mehta" }
  ],
  payroll,
  timesheets,
  notifications: [
    { id: "not-1", title: "Leave approvals", body: "2 requests need HR review today.", type: "leave", audience: "HR", createdAt: "2026-05-22T09:00:00.000Z", readBy: [] },
    { id: "not-2", title: "Attendance reminder", body: "2 employees are absent today without approved leave.", type: "attendance", audience: "HR", createdAt: "2026-05-22T10:00:00.000Z", readBy: [] },
    { id: "not-3", title: "Payroll cutoff", body: "May 2026 payroll drafts should be processed before May 25.", type: "payroll", audience: "All", createdAt: "2026-05-22T11:00:00.000Z", readBy: [] }
  ],
  auditLogs: [
    { id: "log-1", actorId: "u2", actorName: "Rohan Mehta", action: "Approved leave", entity: "LeaveRequest", entityId: "l2", details: "Approved 1 sick leave day for Kabir Anand.", createdAt: "2026-05-20T12:10:00.000Z" },
    { id: "log-2", actorId: "u1", actorName: "Maya Srinivasan", action: "Processed payroll", entity: "Payroll", entityId: "May 2026", details: "Processed payroll rows for May 2026.", createdAt: "2026-05-21T16:30:00.000Z" }
  ]
};

export const holidays = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-20", name: "Diwali" },
  { date: "2026-12-25", name: "Christmas" }
];

export const announcements = [
  { id: "n1", title: "Quarterly town hall", body: "All teams meet Friday at 4 PM IST.", date: "2026-05-22" },
  { id: "n2", title: "Payroll cutoff", body: "Timesheets and reimbursements close on May 25.", date: "2026-05-21" },
  { id: "n3", title: "Wellness week", body: "Optional wellness sessions run from May 27 to May 31.", date: "2026-05-18" }
];

export const onboarding = [
  "Upload identity and address proof",
  "Complete payroll and bank setup",
  "Read leave and attendance policy",
  "Meet manager and buddy",
  "Finish security awareness module",
  "Submit first-week feedback pulse"
];
