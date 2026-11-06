import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { data } from "./data.js";
import type { Role, User } from "./types.js";

const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";

export type AuthRequest = Request & {
  user?: Omit<User, "passwordHash">;
};

export function signToken(user: User) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, employeeId: user.employeeId },
    jwtSecret,
    { expiresIn: "8h" }
  );
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as { sub: string };
    const user = data.users.find((candidate) => candidate.id === payload.sub);

    if (!user) {
      return res.status(401).json({ message: "Invalid session" });
    }

    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
}

export function canSeeEmployee(user: AuthRequest["user"], employeeId: string) {
  if (!user) return false;
  return user.role === "Admin" || user.role === "HR Manager" || user.employeeId === employeeId;
}
