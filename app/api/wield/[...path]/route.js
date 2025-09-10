// app/api/wield/[...path]/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Simple proxy to Wield API. Keeps API key on the server.
export async function GET(req, { params }) {
  try {
    const base = process.env.NEXT_PUBLIC_WIELD_API || "https://api.wield.xyz/v1";
    const pathParts = params.path || [];
    const suffix = req.nextUrl.search || "";
    const upstream = `${base}/${pathParts.join("/")}${suffix}`;
    const r = await fetch(upstream, {
      headers: {
        "x-api-key": process.env.WIELD_API_KEY || ""
      },
      next: { revalidate: 0 }
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const base = process.env.NEXT_PUBLIC_WIELD_API || "https://api.wield.xyz/v1";
    const pathParts = params.path || [];
    const suffix = req.nextUrl.search || "";
    const upstream = `${base}/${pathParts.join("/")}${suffix}`;
    const body = await req.text();
    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        "x-api-key": process.env.WIELD_API_KEY || "",
        "content-type": req.headers.get("content-type") || "application/json"
      },
      body
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") || "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}