import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock @supabase/ssr
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { middleware } from "@/middleware";

function makeRequest(pathname: string) {
  const url = new URL(pathname, "http://localhost:3000");
  return new NextRequest(url);
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows public routes through without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await middleware(makeRequest("/"));
    // Public route should pass through (NextResponse.next())
    expect(res.status).toBe(200);
  });

  it("allows /login through without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await middleware(makeRequest("/login"));
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated users to /login for protected routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await middleware(makeRequest("/student/listings"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unconfirmed email to /verify", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email_confirmed_at: null,
          user_metadata: { role: "student" },
        },
      },
    });

    const res = await middleware(makeRequest("/student/listings"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/verify");
  });

  it("redirects role mismatch (student accessing landlord route)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email_confirmed_at: "2024-01-01",
          user_metadata: { role: "student" },
        },
      },
    });

    // DB confirms user is a student
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: "student" },
              error: null,
            }),
        }),
      }),
    });

    const res = await middleware(makeRequest("/landlord/listings"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/student/listings");
  });

  it("verifies admin role via DB and rejects fake admin", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email_confirmed_at: "2024-01-01",
          user_metadata: { role: "admin" },
        },
      },
    });

    // DB says user is actually a student
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: "student" },
              error: null,
            }),
        }),
      }),
    });

    const res = await middleware(makeRequest("/admin/verification-queue"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/student/listings");
  });

  it("allows verified admin through to admin routes", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-1",
          email_confirmed_at: "2024-01-01",
          user_metadata: { role: "admin" },
        },
      },
    });

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: "admin" },
              error: null,
            }),
        }),
      }),
    });

    const res = await middleware(makeRequest("/admin/verification-queue"));
    expect(res.status).toBe(200);
  });
});
