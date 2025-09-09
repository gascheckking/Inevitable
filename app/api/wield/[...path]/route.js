export const dynamic = "force-dynamic";

async function proxy(req, { params }) {
  try {
    const pathParts = params.path || [];
    const suffix = req.nextUrl.search || "";
    const upstream = `https://build.wield.xyz/${pathParts.join("/")}${suffix}`;

    const init = {
      method: req.method,
      headers: {
        "x-api-key": process.env.WIELD_API_KEY || "",
        "content-type": req.headers.get("content-type") || undefined
      },
      body: ["GET","HEAD"].includes(req.method) ? undefined : await req.text(),
      next: { revalidate: 0 }
    };

    const r = await fetch(upstream, init);
    const ct = r.headers.get("content-type") || "application/json";
    const text = await r.text();

    return new Response(text, { status: r.status, headers: { "content-type": ct } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;