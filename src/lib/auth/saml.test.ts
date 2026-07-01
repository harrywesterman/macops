import { describe, expect, it } from "vitest";
import { profileToUser } from "@/lib/auth/saml";

describe("profileToUser", () => {
  it("maps an allowed Ping SAML profile to a session user", () => {
    const user = profileToUser({
      email: "operator@example.org",
      displayName: "Operator",
      groups: ["Gebruikers Ondersteuning", "Other"]
    });

    expect(user).toEqual({
      email: "operator@example.org",
      name: "Operator",
      groups: ["Gebruikers Ondersteuning"]
    });
  });

  it("rejects profiles without an allowed group", () => {
    expect(() =>
      profileToUser({
        email: "viewer@example.org",
        groups: ["Other"]
      })
    ).toThrow("toegestane groep");
  });
});
