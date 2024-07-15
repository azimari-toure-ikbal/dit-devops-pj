import { describe, expect, it } from "bun:test";

describe("true", () => {
  it("should be true", () => {
    expect(false).toBeTruthy();
  });
});

describe("false", () => {
  it("should be false", () => {
    expect(false).toBeFalsy();
  });
});
