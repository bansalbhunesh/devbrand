import { describe, expect, it } from "vitest";
import {
  digestIdSchema,
  generateDigestSchema,
  githubCallbackSchema,
  postToXSchema,
  roastSchema,
  toggleVisibilitySchema,
  transformPRSchema,
  userSettingsSchema,
  verifyPaymentSchema,
} from "./rpc";

const validUuid = "11111111-2222-3333-4444-555555555555";

describe("rpc input schemas", () => {
  describe("githubCallbackSchema", () => {
    it("accepts a typical callback payload", () => {
      expect(() =>
        githubCallbackSchema.parse({ code: "abc", state: "xyz" }),
      ).not.toThrow();
    });
    it("requires code", () => {
      expect(() => githubCallbackSchema.parse({ state: "xyz" })).toThrow();
    });
    it("rejects empty code", () => {
      expect(() => githubCallbackSchema.parse({ code: "" })).toThrow();
    });
    it("caps code length to prevent abuse", () => {
      expect(() =>
        githubCallbackSchema.parse({ code: "a".repeat(2000) }),
      ).toThrow();
    });
  });

  describe("userSettingsSchema", () => {
    it("accepts valid enums", () => {
      expect(() =>
        userSettingsSchema.parse({
          seniority: "senior",
          tone: "direct",
          targetAudience: "recruiter",
        }),
      ).not.toThrow();
    });
    it("rejects bogus seniority", () => {
      expect(() =>
        userSettingsSchema.parse({
          seniority: "wizard",
          tone: "direct",
          targetAudience: "recruiter",
        }),
      ).toThrow();
    });
  });

  describe("transformPRSchema", () => {
    it("accepts a GitHub PR URL", () => {
      const parsed = transformPRSchema.parse({
        prUrl: "https://github.com/owner/repo/pull/123",
      });
      expect(parsed.prUrl).toBe("https://github.com/owner/repo/pull/123");
    });
    it("rejects non-PR URLs", () => {
      expect(() =>
        transformPRSchema.parse({
          prUrl: "https://example.com/foo",
        }),
      ).toThrow();
    });
    it("rejects javascript: URLs", () => {
      expect(() =>
        transformPRSchema.parse({
          prUrl: "javascript:alert(1)//github.com/x/y/pull/1",
        }),
      ).toThrow();
    });
    it("rejects GitHub URLs that aren't PRs", () => {
      expect(() =>
        transformPRSchema.parse({
          prUrl: "https://github.com/owner/repo/issues/1",
        }),
      ).toThrow();
    });
    it("rejects bad userId", () => {
      expect(() =>
        transformPRSchema.parse({
          prUrl: "https://github.com/o/r/pull/1",
          userId: "not-a-uuid",
        }),
      ).toThrow();
    });
  });

  describe("toggleVisibilitySchema", () => {
    it("accepts uuid + boolean", () => {
      expect(() =>
        toggleVisibilitySchema.parse({
          outputId: validUuid,
          isPublic: true,
        }),
      ).not.toThrow();
    });
    it("rejects non-uuid outputId", () => {
      expect(() =>
        toggleVisibilitySchema.parse({ outputId: "abc", isPublic: true }),
      ).toThrow();
    });
    it("rejects non-boolean isPublic", () => {
      expect(() =>
        toggleVisibilitySchema.parse({
          outputId: validUuid,
          isPublic: "yes",
        }),
      ).toThrow();
    });
  });

  describe("roastSchema", () => {
    it("accepts a valid GitHub login", () => {
      expect(() =>
        roastSchema.parse({ username: "torvalds", tone: "salty" }),
      ).not.toThrow();
    });
    it("rejects login with slashes (path traversal hint)", () => {
      expect(() =>
        roastSchema.parse({ username: "foo/bar", tone: "salty" }),
      ).toThrow();
    });
    it("rejects login starting with hyphen", () => {
      expect(() =>
        roastSchema.parse({ username: "-bad", tone: "salty" }),
      ).toThrow();
    });
    it("rejects unknown tone", () => {
      expect(() =>
        roastSchema.parse({ username: "ok", tone: "spicy" }),
      ).toThrow();
    });
  });

  describe("verifyPaymentSchema", () => {
    it("accepts the three Razorpay fields", () => {
      expect(() =>
        verifyPaymentSchema.parse({
          razorpay_order_id: "order_xyz",
          razorpay_payment_id: "pay_xyz",
          razorpay_signature: "sig",
        }),
      ).not.toThrow();
    });
    it("rejects when a field is missing", () => {
      expect(() =>
        verifyPaymentSchema.parse({
          razorpay_order_id: "order_xyz",
          razorpay_payment_id: "pay_xyz",
        }),
      ).toThrow();
    });
  });

  describe("generateDigestSchema", () => {
    const since = "2026-05-01T00:00:00Z";
    const until = "2026-05-08T00:00:00Z";

    it("accepts ISO strings and coerces them to Date", () => {
      const parsed = generateDigestSchema.parse({
        kind: "weekly",
        since,
        until,
      });
      expect(parsed.since).toBeInstanceOf(Date);
      expect(parsed.until).toBeInstanceOf(Date);
      expect(parsed.kind).toBe("weekly");
    });
    it("accepts release_notes kind", () => {
      expect(() =>
        generateDigestSchema.parse({
          kind: "release_notes",
          since,
          until,
        }),
      ).not.toThrow();
    });
    it("rejects unknown kind", () => {
      expect(() =>
        generateDigestSchema.parse({
          kind: "monthly",
          since,
          until,
        }),
      ).toThrow();
    });
    it("rejects inverted range", () => {
      expect(() =>
        generateDigestSchema.parse({
          kind: "weekly",
          since: until,
          until: since,
        }),
      ).toThrow();
    });
    it("rejects equal range", () => {
      expect(() =>
        generateDigestSchema.parse({
          kind: "weekly",
          since,
          until: since,
        }),
      ).toThrow();
    });
  });

  describe("digestIdSchema", () => {
    it("accepts a uuid", () => {
      expect(() => digestIdSchema.parse({ id: validUuid })).not.toThrow();
    });
    it("rejects non-uuid", () => {
      expect(() => digestIdSchema.parse({ id: "not-a-uuid" })).toThrow();
    });
  });

  describe("postToXSchema", () => {
    it("accepts uuid + content", () => {
      expect(() =>
        postToXSchema.parse({ id: validUuid, content: "hello" }),
      ).not.toThrow();
    });
    it("rejects empty content", () => {
      expect(() =>
        postToXSchema.parse({ id: validUuid, content: "" }),
      ).toThrow();
    });
    it("caps content length", () => {
      expect(() =>
        postToXSchema.parse({ id: validUuid, content: "a".repeat(5000) }),
      ).toThrow();
    });
  });
});
