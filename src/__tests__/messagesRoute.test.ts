import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing the route
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabaseServer", () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/messageFilter", () => ({
  filterMessageContent: (content: string) => ({
    content,
    wasFlagged: false,
  }),
}));

vi.mock("@/lib/validation", () => ({
  MAX_MESSAGE_LENGTH: 2000,
}));

// Import after mocks
import { POST } from "@/app/api/messages/route";

function makeRequest(
  body: unknown,
  options: { token?: string; origin?: string } = {}
) {
  const headers = new Headers();
  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }
  if (options.origin) {
    headers.set("origin", options.origin);
  }

  return new Request("http://localhost:3000/api/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_BODY = { conversationId: VALID_UUID, content: "Hello" };

function setupAuthSuccess(userId = VALID_UUID) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function setupRateLimitOk() {
  // Rate limit check: from("messages").select().eq().gte()
  mockFrom.mockImplementation((table: string) => {
    if (table === "messages") {
      return {
        select: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ count: 0, error: null }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      };
    }
    if (table === "conversations") {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { student_id: VALID_UUID, landlord_id: "other-id" },
                error: null,
              }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ gte: () => Promise.resolve({ count: 0, error: null }) }) }) };
  });
}

describe("POST /api/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when no origin header is provided", async () => {
    const req = makeRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 401 when no auth header is provided", async () => {
    const req = makeRequest(VALID_BODY, { origin: "http://localhost:3000" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when token is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("bad token") });

    const req = makeRequest(VALID_BODY, { token: "bad-token", origin: "http://localhost:3000" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid request body", async () => {
    setupAuthSuccess();
    setupRateLimitOk();

    const req = makeRequest({ conversationId: "not-a-uuid", content: "" }, { token: "valid", origin: "http://localhost:3000" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when sender is not a participant", async () => {
    setupAuthSuccess("non-participant-id");

    mockFrom.mockImplementation((table: string) => {
      if (table === "messages") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: 0, error: null }),
            }),
          }),
        };
      }
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { student_id: "student-1", landlord_id: "landlord-1" },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });

    const req = makeRequest(VALID_BODY, { token: "valid", origin: "http://localhost:3000" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    setupAuthSuccess();

    mockFrom.mockImplementation((table: string) => {
      if (table === "messages") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: 20, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const req = makeRequest(VALID_BODY, { token: "valid", origin: "http://localhost:3000" });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 403 when Origin header doesn't match", async () => {
    const req = makeRequest(VALID_BODY, {
      token: "valid",
      origin: "https://evil.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 on successful message send", async () => {
    setupAuthSuccess();

    mockFrom.mockImplementation((table: string) => {
      if (table === "messages") {
        return {
          select: () => ({
            eq: () => ({
              gte: () => Promise.resolve({ count: 0, error: null }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "conversations") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { student_id: VALID_UUID, landlord_id: "landlord-1" },
                  error: null,
                }),
            }),
          }),
        };
      }
      return {};
    });

    const req = makeRequest(VALID_BODY, { token: "valid", origin: "http://localhost:3000" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
