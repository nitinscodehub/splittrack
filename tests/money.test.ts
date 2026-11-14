import { describe, expect, it } from "vitest";
import { formatINR, parseAmountToPaise, paiseToInput, percentToBps } from "@/lib/money";

describe("money parsing", () => {
  it("parses rupee strings into integer paise without floats", () => {
    expect(parseAmountToPaise("100")).toBe(10000);
    expect(parseAmountToPaise("100.5")).toBe(10050);
    expect(parseAmountToPaise("₹1,234.56")).toBe(123456);
    expect(parseAmountToPaise("0.01")).toBe(1);
    expect(parseAmountToPaise("0.009")).toBeNull();
    expect(parseAmountToPaise("-5")).toBeNull();
    expect(parseAmountToPaise("abc")).toBeNull();
  });

  it("round-trips paise to input values", () => {
    expect(paiseToInput(10050)).toBe("100.50");
    expect(paiseToInput(1)).toBe("0.01");
  });

  it("formats INR", () => {
    expect(formatINR(10000)).toContain("100");
    expect(formatINR(0)).toContain("0");
  });

  it("converts percentages to basis points", () => {
    expect(percentToBps(33.33)).toBe(3333);
    expect(percentToBps(100)).toBe(10000);
  });
});
