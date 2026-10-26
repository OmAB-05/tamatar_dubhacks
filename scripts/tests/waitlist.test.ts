import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";
import { POST } from "../../app/api/waitlist/route";

test("notebook routes redirect; app APIs are closed; public routes remain available", () => {
  for (const path of ["/home", "/login", "/welcome", "/onboarding", "/calendar", "/tour", "/warmup", "/board/test", "/solve/homework/problem"]) {
    const response = middleware(new NextRequest(`https://tamatar.si${path}?old=link`));
    assert.equal(response.status, 307, path);
    assert.equal(response.headers.get("location"), "https://tamatar.si/#waitlist");
  }
  for (const path of ["/api/check", "/api/extract", "/api/speak", "/api/health", "/api/waitlist/anything"]) {
    assert.equal(middleware(new NextRequest(`https://tamatar.si${path}`)).status, 403, path);
  }
  for (const path of ["/", "/team", "/api/waitlist", "/api/waitlist/"]) {
    assert.equal(middleware(new NextRequest(`https://tamatar.si${path}`)).headers.get("x-middleware-next"), "1", path);
  }
});

test("signup rejects malformed input, oversized bodies, and foreign origins before storage", async () => {
  const request = (body: string, origin = "https://tamatar.si") => new Request("https://tamatar.si/api/waitlist", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body,
  });
  for (const value of ["not json", "{}", '{"email":"nope"}', '{"email":null}', '{"email":["test@example.com"]}']) {
    assert.equal((await POST(request(value))).status, 400);
  }
  assert.equal((await POST(request("x".repeat(2049)))).status, 413);
  assert.equal((await POST(request('{"email":"test@example.com"}', "https://other.example"))).status, 403);
});

test("signup only succeeds after storage accepts the normalized email", async () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalFetch = globalThis.fetch;
  const request = () => new Request("https://tamatar.si/api/waitlist", { method: "POST", body: '{"email":"  Test@Example.com  "}' });
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal((await POST(request())).status, 503);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    let saved = false;
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "https://test.supabase.co/rest/v1/rpc/join_waitlist");
      assert.deepEqual(JSON.parse(String(init?.body)), { signup_email: "test@example.com" });
      saved = true;
      return new Response(null, { status: 204 });
    };
    const result = await POST(request());
    assert.equal(saved, true);
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { success: true });
    globalThis.fetch = async () => new Response('{"code":"TEST","message":"unavailable"}', { status: 503 });
    assert.equal((await POST(request())).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
