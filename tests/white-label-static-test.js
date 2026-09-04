const fs=require('fs');

const required=[
  'web/white-label/business-config.js',
  'web/white-label/business-template.json',
  'web/white-label/runtime-branding.js',
  'web/white-label/tenant-context.js',
  'web/white-label/admin.html',
  'build-white-label.js',
  'supabase/white-label/001_multitenant_foundation.sql',
  'supabase/white-label/002_rls_verification.sql'
];

for(const f of required){
  if(!fs.existsSync(f)) throw new Error('Missing white-label file: '+f);
}

const migration=fs.readFileSync('supabase/white-label/001_multitenant_foundation.sql','utf8');
for(const needle of [
  'create table if not exists public.businesses',
  'create table if not exists public.business_memberships',
  'business_customer_profiles',
  'private.has_business_role',
  'customer_collection_orders_select',
  'customer_points_events_select',
  'customer_sunday_orders_select'
]){
  if(!migration.includes(needle)) throw new Error('Migration missing: '+needle);
}

const tenantHelper=fs.readFileSync('web/white-label/tenant-context.js','utf8');
if(!tenantHelper.includes('.eq("business_id", businessId)')) throw new Error('Tenant query scoping missing');

const all=required.map(f=>fs.readFileSync(f,'utf8')).join('\n');
if(/service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(all)) throw new Error('Secret/service role reference found in browser white-label files');

console.log('White-label static checks passed');
