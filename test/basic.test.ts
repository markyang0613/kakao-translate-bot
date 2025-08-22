import { describe, it, expect } from "vitest";
import { containsHangul, inferTarget, parseForcedTarget } from "../src/lib/lang";

describe("lang utils", () => {
  it("detects hangul", () => {
    expect(containsHangul("안녕하세요")).toBe(true);
    expect(containsHangul("Hello")).toBe(false);
  });
  it("infers target", () => {
    expect(inferTarget("안녕하세요")).toBe("en");
    expect(inferTarget("Good morning")).toBe("ko");
  });
  it("forced target parsing", () => {
    expect(parseForcedTarget("/en 안녕").forced).toBe("en");
    expect(parseForcedTarget("/ko hello").forced).toBe("ko");
  });
});
