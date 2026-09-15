import { createClient } from 'jsr:@supabase/supabase-js@2.95.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const SERVICE_KEY = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = origin === 'https://backoffice.dextersspot.co.uk' || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://backoffice.dextersspot.co.uk',
    'Access-Control-Allow-Headers': 'authorization,content-type,apikey,x-client-info',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Vary': 'Origin'
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

async function requireStaff(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('AUTH_REQUIRED');
  const { data: userData, error: userError } = await service.auth.getUser(token);
  if (userError || !userData.user) throw new Error('AUTH_REQUIRED');
  const { data: profile, error: profileError } = await service.from('profiles').select('role').eq('id', userData.user.id).single();
  if (profileError || !profile || !['admin', 'manager', 'staff'].includes(String(profile.role || ''))) throw new Error('STAFF_REQUIRED');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'method not allowed' }, 405);
  try {
    await requireStaff(req);
    const body = await req.json();
    const receiptId = String(body?.receipt_id || '').trim();
    const orderValuePence = Math.round(Number(body?.order_value_pence));
    if (!/^[A-Za-z0-9:_-]{4,128}$/.test(receiptId)) return json(req, { error: 'invalid receipt id' }, 400);
    if (!Number.isFinite(orderValuePence) || orderValuePence < 100 || orderValuePence > 1000000) return json(req, { error: 'receipt total must be between £1 and £10,000' }, 400);

    const sourceOrderId = 'pc-pos:' + receiptId;
    const { data: existing, error: existingError } = await service.from('receipt_points_claims').select('claim_token,status').eq('source_order_id', sourceOrderId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return json(req, { ok: true, claim_token: existing.claim_token, status: existing.status, existing: true });

    const id = crypto.randomUUID();
    const claimToken = 'DXP-' + id.replace(/-/g, '').toUpperCase();
    const points = Math.max(1, Math.floor(orderValuePence / 100));
    const { data, error } = await service.from('receipt_points_claims').insert({
      claim_token: claimToken,
      source_order_id: sourceOrderId,
      order_value_pence: orderValuePence,
      points,
      status: 'available'
    }).select('claim_token,status').single();
    if (error) throw error;
    return json(req, { ok: true, claim_token: data.claim_token, status: data.status, existing: false });
  } catch (error) {
    const message = String((error as Error)?.message || error);
    if (message === 'AUTH_REQUIRED') return json(req, { error: 'Authentication required' }, 401);
    if (message === 'STAFF_REQUIRED') return json(req, { error: 'Staff access required' }, 403);
    console.error('pc-pos receipt claim failed', message);
    return json(req, { error: 'Could not create receipt reward code' }, 500);
  }
});
