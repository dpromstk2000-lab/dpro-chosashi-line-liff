window.DPRO_CONFIG = Object.freeze({
  systemName: "DPRO 土地家屋調査士 LINE",
  version: "CHOSASHI-R2-FRONTEND-PRODUCT-READY-20260824",
  officeCode: "dpro_chosashi_demo",

  // Existing Worker is kept as the canonical demo/data implementation.
  // R2 permits it only when the page is explicitly opened with ?demo=1.
  apiBase: "https://dpro-chosashi-line-api.dpromstk2000.workers.dev",
  legacyApiBase: "https://dpro-chosashi-line-api.dpromstk2000.workers.dev",

  // R2 Product READY security gateway.
  productReadyApiBase: "https://cbknucemarcpbscirzyv.supabase.co/functions/v1/chosashi-product-ready",
  productReadyAdapterVersion: "CHOSASHI-R2-ADAPTER-PRODUCT-READY-20260824",
  productReadyDatabaseVersion: "CHOSASHI-R2-DB-PRODUCT-READY-20260824",
  productReadyFrontendVersion: "CHOSASHI-R2-FRONTEND-PRODUCT-READY-20260824",

  // Contract-time bindings remain fail-closed until explicitly provisioned.
  serviceBindingReady: false,
  lineBindingReady: false,
  supportRecoveryReady: false,
  websiteSyncReady: false,

  liffId: "",
  demoLineUserId: "U_DEMO_CHOSASHI_001",
  timezone: "Asia/Tokyo",
  defaultSlotMinutes: 30,
  supportPhone: "092-000-0000",
  maxUploadBytes: 15728640,
  allowedUploadTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  allowedFieldPhotoTypes: ["image/jpeg", "image/png", "image/webp"],

  // Keep the existing Worker release value so the current demo system-check
  // continues to verify the deployed Worker byte-for-byte contract.
  releaseVersion: "CHOSASHI-8-R2-WORKER-DEMO-PREPARE-IDEMPOTENT-FIX-20260717"
});

(() => {
  "use strict";

  const CONFIG = window.DPRO_CONFIG;
  const nativeFetch = window.fetch.bind(window);
  const legacyOrigin = new URL(CONFIG.legacyApiBase).origin;
  const gatewayBase = CONFIG.productReadyApiBase.replace(/\/+$/, "");
  const isDemo = () => new URLSearchParams(location.search).get("demo") === "1";

  function jsonResponse(status, payload) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }

  async function gateway(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const url = new URL(`${gatewayBase}${path.startsWith("/") ? path : `/${path}`}`);
    url.searchParams.set("office_code", CONFIG.officeCode);

    for (const [key, value] of Object.entries(options.query || {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    if (options.demo === true) url.searchParams.set("demo", "1");

    const headers = new Headers(options.headers || {});
    headers.set("content-type", "application/json");
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    if (options.demo === true) headers.set("x-demo-mode", "1");

    let body;
    if (options.body !== undefined) {
      body = JSON.stringify({
        office_code: CONFIG.officeCode,
        ...(options.demo === true ? { demo_mode: true } : {}),
        ...options.body
      });
    }

    const response = await nativeFetch(url, {
      method,
      headers,
      body,
      cache: "no-store"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const error = new Error(data?.error || `Product READY gateway HTTP ${response.status}`);
      error.status = response.status;
      error.code = data?.code || "PRODUCT_READY_GATEWAY_ERROR";
      error.details = data?.details;
      throw error;
    }
    return data;
  }

  window.DPRO_R2 = Object.freeze({
    version: CONFIG.productReadyFrontendVersion,
    isDemo,
    gateway,
    health: () => gateway("/health"),
    productReadyCheck: () => gateway("/product-ready/check"),
    selfTest: () => gateway("/product-ready/self-test", {
      method: "POST",
      demo: true,
      headers: { "x-product-ready-code": "1234" },
      body: {}
    }),
    normalizePhone: (phone) => gateway("/phone/normalize", {
      method: "POST",
      body: { phone }
    }),
    validateReservation: (start_at, end_at) => gateway("/reservation/validate", {
      method: "POST",
      body: { start_at, ...(end_at ? { end_at } : {}) }
    }),
    calendarCheck: (date) => gateway("/calendar/check", { query: { date } }),
    verifyLineIdToken: (id_token) => gateway("/line/verify", {
      method: "POST",
      body: { id_token }
    }),
    issueOwnerSession: (owner_code) => gateway("/auth/owner-session", {
      method: "POST",
      demo: isDemo(),
      body: { owner_code }
    }),
    issueStaffSession: (owner_code, staff_id) => gateway("/auth/staff-session", {
      method: "POST",
      demo: isDemo(),
      body: { owner_code, staff_id }
    }),
    checkSession: (token) => gateway("/auth/session/check", { token }),
    revokeSession: (token, session_id) => gateway("/auth/session/revoke", {
      method: "POST",
      token,
      body: { session_id }
    })
  });

  // R2 production guard:
  // - Explicit ?demo=1 keeps the existing Worker behavior untouched.
  // - Normal/contract mode must not silently fall back to the shared legacy
  //   admin code or raw LINE user id paths.
  // - Public office config may be read from the new gateway.
  // - All other legacy API routes fail closed until service binding is ready.
  window.fetch = async function dproR2Fetch(input, init) {
    let url;
    try {
      url = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    } catch {
      return nativeFetch(input, init);
    }

    if (url.origin !== legacyOrigin) return nativeFetch(input, init);
    if (isDemo()) return nativeFetch(input, init);

    if (url.pathname === "/api/public/config" && (!init?.method || String(init.method).toUpperCase() === "GET")) {
      const mapped = new URL(`${gatewayBase}/public/config`);
      mapped.searchParams.set("office_code", CONFIG.officeCode);
      return nativeFetch(mapped, {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store"
      });
    }

    return jsonResponse(503, {
      ok: false,
      code: "SERVICE_BINDING_REQUIRED",
      error: "本番接続はProduct READY gatewayへ未bindingのため、安全のため停止しています。?demo=1 の明示デモだけ既存Workerを使用できます。",
      product_ready: {
        adapter_version: CONFIG.productReadyAdapterVersion,
        database_version: CONFIG.productReadyDatabaseVersion,
        frontend_version: CONFIG.productReadyFrontendVersion,
        service_binding_ready: false
      }
    });
  };
})();
