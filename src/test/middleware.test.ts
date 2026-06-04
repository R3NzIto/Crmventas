import { describe, expect, it } from "vitest";
import { isAuthorizedForAgency } from "@/middleware";

describe("tenant middleware authorization", () => {
  it("blocks unauthenticated dashboard access", () => {
    expect(isAuthorizedForAgency({ userAgencyId: undefined })).toBe(false);
  });

  it("allows authenticated access when no resource agency is specified", () => {
    expect(isAuthorizedForAgency({ userAgencyId: "agency-1" })).toBe(true);
  });

  it("blocks cross-tenant resource access", () => {
    expect(isAuthorizedForAgency({ userAgencyId: "agency-1", resourceAgencyId: "agency-2" })).toBe(false);
  });

  it("allows same-tenant resource access", () => {
    expect(isAuthorizedForAgency({ userAgencyId: "agency-1", resourceAgencyId: "agency-1" })).toBe(true);
  });
});
