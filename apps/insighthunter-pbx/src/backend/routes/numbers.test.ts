import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../types.js";
import { numbers } from "./numbers.js";

type PhoneRecord = {
  id: number;
  org_id: string;
  phone_number: string;
  label: string | null;
  created_at: string;
};

class FakeD1 {
  phoneNumbers: PhoneRecord[] = [];
  auditEvents: unknown[][] = [];

  prepare(query: string) {
    let values: unknown[] = [];
    const statement = {
      bind: (...args: unknown[]) => {
        values = args;
        return statement;
      },
      all: async <T>() => ({
        results: this.phoneNumbers
          .filter((item) => item.org_id === values[0])
          .map((item) => ({
            id: item.id,
            phoneNumber: item.phone_number,
            label: item.label,
            createdAt: item.created_at,
          })) as T[],
      }),
      run: async () => {
        if (query.includes("INSERT INTO phone_numbers")) {
          const phoneNumber = String(values[1]);
          if (this.phoneNumbers.some((item) => item.phone_number === phoneNumber)) {
            return { success: true, meta: { changes: 0 } };
          }
          this.phoneNumbers.push({
            id: this.phoneNumbers.length + 1,
            org_id: String(values[0]),
            phone_number: phoneNumber,
            label: values[2] === null ? null : String(values[2]),
            created_at: String(values[3]),
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (query.includes("INSERT INTO audit_log")) {
          this.auditEvents.push(values);
          return { success: true, meta: { changes: 1 } };
        }
        throw new Error(`Unexpected SQL in test: ${query}`);
      },
    };
    return statement;
  }
}

function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/numbers", numbers);
  return app;
}

function sessionHeaders(role = "admin", orgId = "org-a") {
  return {
    "Content-Type": "application/json",
    "X-User-Id": "user-a",
    "X-Org-Id": orgId,
    "X-User-Role": role,
    "X-User-Email": "user@example.test",
  };
}

function stubTwilioNumberLookup(phoneNumber = "+15551234567") {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        incoming_phone_numbers: [{ phone_number: phoneNumber, sid: "PN123" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("phone number inventory routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists only numbers belonging to the authenticated tenant", async () => {
    const db = new FakeD1();
    db.phoneNumbers = [
      {
        id: 1,
        org_id: "org-a",
        phone_number: "+15551234567",
        label: "Main",
        created_at: "2026-01-01",
      },
      {
        id: 2,
        org_id: "org-b",
        phone_number: "+15557654321",
        label: "Other",
        created_at: "2026-01-02",
      },
    ];

    const response = await createApp().request(
      "/api/numbers",
      {
        headers: sessionHeaders(),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ id: 1, phoneNumber: "+15551234567", label: "Main", createdAt: "2026-01-01" }],
    });
    expect(db.auditEvents).toHaveLength(1);
  });

  it("registers an E.164 number under the authenticated tenant and audits it", async () => {
    const db = new FakeD1();
    const fetchMock = stubTwilioNumberLookup();
    const response = await createApp().request(
      "/api/numbers",
      {
        method: "POST",
        headers: sessionHeaders("owner"),
        body: JSON.stringify({
          phoneNumber: "+15551234567",
          label: "  Main line  ",
          orgId: "org-b",
        }),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(201);
    expect(db.phoneNumbers).toMatchObject([
      { org_id: "org-a", phone_number: "+15551234567", label: "Main line" },
    ]);
    expect(db.auditEvents).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("prevents non-admin members from registering numbers", async () => {
    const db = new FakeD1();
    const response = await createApp().request(
      "/api/numbers",
      {
        method: "POST",
        headers: sessionHeaders("member"),
        body: JSON.stringify({ phoneNumber: "+15551234567" }),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(403);
    expect(db.phoneNumbers).toHaveLength(0);
    expect(db.auditEvents).toHaveLength(0);
  });

  it("rejects malformed phone numbers", async () => {
    const db = new FakeD1();
    const response = await createApp().request(
      "/api/numbers",
      {
        method: "POST",
        headers: sessionHeaders(),
        body: JSON.stringify({ phoneNumber: "555-123-4567" }),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(400);
    expect(db.phoneNumbers).toHaveLength(0);
  });

  it("does not disclose or reassign a number already in the inventory", async () => {
    const db = new FakeD1();
    stubTwilioNumberLookup();
    db.phoneNumbers.push({
      id: 1,
      org_id: "org-b",
      phone_number: "+15551234567",
      label: "Other tenant",
      created_at: "2026-01-01",
    });
    const response = await createApp().request(
      "/api/numbers",
      {
        method: "POST",
        headers: sessionHeaders("admin", "org-a"),
        body: JSON.stringify({ phoneNumber: "+15551234567" }),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "phone_number_unavailable" });
    expect(db.phoneNumbers).toHaveLength(1);
    expect(db.auditEvents).toHaveLength(0);
  });

  it("does not register numbers absent from the configured Twilio account", async () => {
    const db = new FakeD1();
    stubTwilioNumberLookup("+15557654321");
    const response = await createApp().request(
      "/api/numbers",
      {
        method: "POST",
        headers: sessionHeaders(),
        body: JSON.stringify({ phoneNumber: "+15551234567" }),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: "number_not_in_provider_account" });
    expect(db.phoneNumbers).toHaveLength(0);
  });

  it("surfaces provider verification failures without registering a number", async () => {
    const db = new FakeD1();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    const response = await createApp().request(
      "/api/numbers",
      {
        method: "POST",
        headers: sessionHeaders(),
        body: JSON.stringify({ phoneNumber: "+15551234567" }),
      },
      { DB: db as unknown as D1Database } as Env,
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "provider_verification_unavailable" });
    expect(db.phoneNumbers).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});
