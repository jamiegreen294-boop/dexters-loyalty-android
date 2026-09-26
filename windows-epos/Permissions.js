'use strict';

const ROLE_DEFAULTS={
  staff:['sale','customer_view','order_view','kds_update'],
  supervisor:['sale','customer_view','order_view','kds_update','discount','void','cashup'],
  manager:['sale','customer_view','order_view','kds_update','discount','void','refund','partial_refund','cashup','reports','price_change','stock_adjust','alcohol_setup','staff_admin','integration_admin']
};
function permissionsFor(role,extra=[]){
  return [...new Set([...(ROLE_DEFAULTS[String(role||'staff')]||ROLE_DEFAULTS.staff),...(extra||[])])];
}
function allowed(staff,permission){
  const list=permissionsFor(staff?.role,staff?.permissions||[]);
  return list.includes(permission);
}
function requirePermission(staff,permission){
  if(!allowed(staff,permission))throw new Error('Manager permission required: '+permission);
  return true;
}
module.exports={ROLE_DEFAULTS,permissionsFor,allowed,requirePermission};
