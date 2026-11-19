import { describe, expect, it } from "vitest";
import { nextCourseStatuses, nextKnowledgeStatus } from "@/lib/admin/workflow";
import { canReviewCourse, facilitatorActions } from "@/lib/mock/workflow";

describe("Admin portal workflow", () => {
  it("publishes a course only after approval", () => {
    expect(nextCourseStatuses("draft")).toEqual([]);
    expect(nextCourseStatuses("approved")).toEqual(["published"]);
    expect(nextCourseStatuses("pending_review")).not.toContain("published");
  });
  it("indexes knowledge only after approval", () => {
    expect(nextKnowledgeStatus("awaiting_review")).toBe("approved");
    expect(nextKnowledgeStatus("approved")).toBe("indexed");
    expect(nextKnowledgeStatus("processing_failed")).toBe("processing");
  });
});

describe("Facilitator workflow", () => {
  const noPublish = { approve: true, publish: false };
  it("never lets a facilitator publish without the publish permission", () => {
    expect(facilitatorActions("approved", noPublish)).not.toContain("publish");
    expect(facilitatorActions("approved", { approve: true, publish: true })).toContain("publish");
    expect(facilitatorActions("draft", noPublish)).toEqual(["submit", "archive"]);
  });
  it("does not let a facilitator approve their own course", () => {
    expect(canReviewCourse({ status: "pending_review", ownerId: "fac1" }, "fac1", noPublish)).toBe(false);
    expect(canReviewCourse({ status: "pending_review", ownerId: "fac2" }, "fac1", noPublish)).toBe(true);
    expect(canReviewCourse({ status: "draft", ownerId: "fac2" }, "fac1", noPublish)).toBe(false);
  });
});
