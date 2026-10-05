import { handleSdkCheckout } from "./sdk-checkout.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

async function staffFromReq(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing staff session");
  const { data: u, error: ue } = await db.auth.getUser(token);
  if (ue || !u.user) throw new Error("Invalid staff session");
  const { data: p, error: pe } = await db
    .from("profiles")
    .select("id,role")
    .eq("id", u.user.id)
    .maybeSingle();
  if (pe || !p || !["staff", "manager", "admin"].includes(String(p.role || "").toLowerCase())) {
    throw new Error("Staff access required");
  }
  return { id: u.user.id, role: String(p.role || "").toLowerCase() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "POST") {
    try { const action = String((await req.clone().json()).action || ""); if (action.startsWith("sdk_")) return handleSdkCheckout(req); } catch { /* legacy validation handles malformed JSON */ }
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return J({ error: "POST required" }, 405);

  try {
    const staff = await staffFromReq(req);
    let body: any = {};
    try { body = await req.json(); } catch { return J({ error: "Invalid request" }, 400); }
    const action = String(body.action || "");

    // Expire abandoned requests before each operation.
    await db
      .from("pc_pos_square_requests")
      .update({ status: "expired", completed_at: new Date().toISOString(), error_code: "timeout", error_message: "Payment request expired" })
      .in("status", ["pending", "processing"])
      .lt("expires_at", new Date().toISOString());

    if (action === "create") {
      const amount = Math.round(Number(body.amount_pence || 0));
      if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) {
        return J({ error: "Invalid amount" }, 400);
      }
      const reference = String(body.reference || "").slice(0, 120) || null;
      const { data, error } = await db
        .from("pc_pos_square_requests")
        .insert({
          amount_pence: amount,
          status: "pending",
          source: "pc_pos",
          reference,
          requested_by: staff.id,
        })
        .select("id,amount_pence,status,created_at,expires_at,reference")
        .single();
      if (error) throw error;
      return J({ ok: true, request: data });
    }

    if (action === "status") {
      const id = String(body.id || "");
      const { data, error } = await db
        .from("pc_pos_square_requests")
        .select("id,amount_pence,status,reference,created_at,claimed_at,completed_at,transaction_id,error_code,error_message")
        .eq("id", id)
        .eq("requested_by", staff.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return J({ error: "Payment request not found" }, 404);
      return J({ ok: true, request: data });
    }

    if (action === "next") {
      const { data: rows, error: qe } = await db
        .from("pc_pos_square_requests")
        .select("id,amount_pence,reference,created_at,expires_at")
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1);
      if (qe) throw qe;
      const row = rows?.[0];
      if (!row) return J({ ok: true, request: null });

      const now = new Date().toISOString();
      const { data: claimed, error: ce } = await db
        .from("pc_pos_square_requests")
        .update({ status: "processing", claimed_by: staff.id, claimed_at: now })
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id,amount_pence,status,reference,created_at,claimed_at,expires_at")
        .maybeSingle();
      if (ce) throw ce;
      return J({ ok: true, request: claimed || null });
    }

    if (action === "result") {
      const id = String(body.id || "");
      const approved = body.approved === true;
      const cancelled = body.cancelled === true;
      const status = approved ? "approved" : (cancelled ? "cancelled" : "failed");
      const { data, error } = await db
        .from("pc_pos_square_requests")
        .update({
          status,
          transaction_id: approved ? String(body.transaction_id || "").slice(0, 200) || null : null,
          error_code: approved ? null : String(body.error_code || "").slice(0, 120) || null,
          error_message: approved ? null : String(body.error_message || "").slice(0, 500) || null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("claimed_by", staff.id)
        .eq("status", "processing")
        .select("id,status,transaction_id,error_code,error_message,completed_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return J({ error: "Payment request is not owned by this terminal session" }, 409);
      return J({ ok: true, request: data });
    }

    if (action === "cancel") {
      const id = String(body.id || "");
      const { data, error } = await db
        .from("pc_pos_square_requests")
        .update({ status: "cancelled", completed_at: new Date().toISOString(), error_code: "cancelled_at_pos", error_message: "Cancelled at PC POS" })
        .eq("id", id)
        .eq("requested_by", staff.id)
        .in("status", ["pending"])
        .select("id,status")
        .maybeSingle();
      if (error) throw error;
      return J({ ok: true, request: data || null });
    }

    return J({ error: "Unknown action" }, 400);
  } catch (e) {
    return J({ error: e instanceof Error ? e.message : String(e) }, 401);
  }
});
