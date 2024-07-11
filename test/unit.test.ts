import { describe, expect, it } from "bun:test";

describe("true", () => {
  it("should be true", () => {
    expect(true).toBeTruthy();
  });
});

describe("false", () => {
  it("should be false", () => {
    expect(false).toBeFalsy();
  });
});
