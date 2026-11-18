import { describe, expect, it } from "vitest";
import { canApproveStaff, canManageCourses } from "@/lib/staff-rules";
describe("Staff access", () => {
  it("farmers cannot manage courses", () => expect(canManageCourses(["farmer"])).toBe(false));
  it("facilitators can manage courses", () => expect(canManageCourses(["farmer", "facilitator"])).toBe(true));
  it("admins can manage courses", () => expect(canManageCourses(["admin"])).toBe(true));
  it("only admins can approve staff", () => { expect(canApproveStaff(["facilitator"])).toBe(false); expect(canApproveStaff(["farmer"])).toBe(false); expect(canApproveStaff(["admin"])).toBe(true); });
});