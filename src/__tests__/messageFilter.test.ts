import { describe, it, expect } from "vitest";
import { filterMessageContent } from "@/lib/messageFilter";

describe("filterMessageContent", () => {
  it("passes through normal messages unchanged", () => {
    const result = filterMessageContent("Is the room still available?");
    expect(result.wasFlagged).toBe(false);
    expect(result.content).toBe("Is the room still available?");
  });

  it("redacts Nigerian phone numbers (080x format)", () => {
    const result = filterMessageContent("Call me on 08012345678");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("08012345678");
    expect(result.content).toContain("[removed");
  });

  it("redacts Nigerian phone numbers (+234 format)", () => {
    const result = filterMessageContent("My number is +2348012345678");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("+234");
  });

  it("redacts Nigerian phone numbers (090x format)", () => {
    const result = filterMessageContent("Reach me at 09012345678");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("090");
  });

  it("redacts email addresses", () => {
    const result = filterMessageContent("Email me at landlord@gmail.com");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("landlord@gmail.com");
  });

  it("redacts WhatsApp mentions", () => {
    const result = filterMessageContent("Message me on WhatsApp");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("WhatsApp");
  });

  it("redacts Telegram mentions", () => {
    const result = filterMessageContent("Find me on telegram");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("telegram");
  });

  it("redacts spelled-out digit sequences", () => {
    const result = filterMessageContent(
      "My number is zero eight zero one two three four five six seven eight"
    );
    expect(result.wasFlagged).toBe(true);
    expect(result.content).toContain("[removed");
  });

  it("redacts generic phone patterns", () => {
    const result = filterMessageContent("Call 123-456-7890");
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("123-456-7890");
  });

  it("redacts multiple patterns in one message", () => {
    const result = filterMessageContent(
      "Email me at test@email.com or call 08012345678"
    );
    expect(result.wasFlagged).toBe(true);
    expect(result.content).not.toContain("test@email.com");
    expect(result.content).not.toContain("08012345678");
  });

  it("handles the regex /g statefulness correctly (consecutive calls)", () => {
    // This was a bug — calling .test() before .replace() on /g regex
    // would advance lastIndex and cause the second match to be skipped.
    const r1 = filterMessageContent("Call 08012345678");
    expect(r1.wasFlagged).toBe(true);
    const r2 = filterMessageContent("Call 08012345678");
    expect(r2.wasFlagged).toBe(true);
    expect(r2.content).not.toContain("08012345678");
  });
});
