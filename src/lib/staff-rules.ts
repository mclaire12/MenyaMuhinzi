export type AppRole = "farmer" | "facilitator" | "admin";
export const canManageCourses = (roles: AppRole[]) => roles.includes("admin") || roles.includes("facilitator");
export const canApproveStaff = (roles: AppRole[]) => roles.includes("admin");