import { describe, expect, it } from "vitest";
import { publicUrl, safeReturnPath } from "@/lib/public-url";

describe("public URL helpers", () => {
  it("uses forwarded host and proto when the app is behind a tunnel", () => {
    const request = new Request("http://0.0.0.0:3000/auth/login", {
      headers: {
        "x-forwarded-host": "macops.westermanonline.com",
        "x-forwarded-proto": "https"
      }
    });

    expect(publicUrl("/dashboard", request).toString()).toBe("https://macops.westermanonline.com/dashboard");
  });

  it("rejects external return targets", () => {
    expect(safeReturnPath("https://example.org", "/dashboard")).toBe("/dashboard");
    expect(safeReturnPath("//example.org", "/dashboard")).toBe("/dashboard");
    expect(safeReturnPath("/dashboard", "/")).toBe("/dashboard");
  });
});
