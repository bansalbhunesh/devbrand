import { describe, expect, it } from "vitest";
import { completionContentToText } from "./content";

describe("completionContentToText", () => {
  it("passes through strings", () => {
    expect(completionContentToText("x")).toBe("x");
  });

  it("joins text parts", () => {
    expect(
      completionContentToText([
        { type: "text", text: "a" },
        { type: "text", text: "b" },
      ]),
    ).toBe("ab");
  });
});
