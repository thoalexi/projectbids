import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirect("/post")).toBe("/post");
    expect(safeRedirect("/projects/abc?x=1#bid")).toBe("/projects/abc?x=1#bid");
  });
  it.each([
    "//evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/%2F%2Fevil.com",
    "%2F%2Fevil.com",
    "/%5Cevil.com",
    "/%252F%252Fevil.com",
    "/%E0%A4%A",
    "/foo\nbar",
    "/\t/evil.com",
    "/javascript:alert(1)",
    "",
    "/auth",
    "/auth?redirect=/auth",
    "/reset-password",
  ])("rejects %s", (v) => {
    expect(safeRedirect(v)).toBe("/");
  });
  it("rejects non-strings", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect(42)).toBe("/");
  });
});
