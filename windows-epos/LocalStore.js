'use strict';

const path=require('path');
const fs=require('fs');
const crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');

const ROOT=__dirname;
const DB_PATH=process.env.DEXTERS_EPOS_DB||path.join(ROOT,'dexters-epos-test.sqlite');

function ensureColumn(d,table,column,definition){
  const cols=d.prepare('PRAGMA table_info('+table+')').all().map(x=>x.name);
  if(!cols.includes(column))d.exec('ALTER TABLE '+table+' ADD COLUMN '+column+' '+definition);
}
function db(){
  const d=new DatabaseSync(DB_PATH);
  d.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      external_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      fulfilment TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      total_pence INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      phone TEXT,
      caller_name TEXT,
      caller_type TEXT,
      event_type TEXT,
      payload_json TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calls_received ON calls(received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_calls_phone ON calls(phone);
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      loyalty_code TEXT,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connector TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_id TEXT,
      payload_json TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'queued',
      last_error TEXT,
      error_kind TEXT,
      result_json TEXT,
      retry_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_state ON sync_queue(state,created_at);
    CREATE TABLE IF NOT EXISTS catalog_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Drinks',
      price_pence INTEGER NOT NULL DEFAULT 0,
      barcode TEXT,
      source_supplier TEXT,
      source_supplier_sku TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_products_barcode ON catalog_products(barcode) WHERE barcode IS NOT NULL AND barcode<>'';
    CREATE TABLE IF NOT EXISTS supplier_products (
      id TEXT PRIMARY KEY,
      supplier TEXT NOT NULL,
      supplier_sku TEXT,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      pack_size TEXT,
      unit_size TEXT,
      barcode TEXT,
      case_barcode TEXT,
      cost_pence INTEGER,
      vat_rate REAL,
      payload_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_products_name ON supplier_products(name);
    CREATE INDEX IF NOT EXISTS idx_supplier_products_barcode ON supplier_products(barcode);
    CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_sku ON supplier_products(supplier,supplier_sku);
    CREATE TABLE IF NOT EXISTS stock_levels (
      product_id TEXT PRIMARY KEY,
      qty REAL NOT NULL DEFAULT 0,
      reorder_level REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'each',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      qty_delta REAL NOT NULL,
      reason TEXT NOT NULL,
      reference TEXT,
      staff_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplier TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goods_receipts (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT,
      supplier TEXT,
      payload_json TEXT NOT NULL,
      received_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff_roles (
      staff_id TEXT PRIMARY KEY,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      permissions_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      scope_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      starts_at TEXT,
      ends_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS delivery_jobs (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      driver TEXT,
      status TEXT NOT NULL DEFAULT 'waiting',
      address_json TEXT NOT NULL,
      notes TEXT,
      assigned_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs(status,updated_at);
    CREATE TABLE IF NOT EXISTS order_adjustments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_pence INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      staff_id TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cashups (
      id TEXT PRIMARY KEY,
      staff_id TEXT,
      expected_cash_pence INTEGER NOT NULL DEFAULT 0,
      counted_cash_pence INTEGER NOT NULL DEFAULT 0,
      card_pence INTEGER NOT NULL DEFAULT 0,
      other_pence INTEGER NOT NULL DEFAULT 0,
      discrepancy_pence INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      detail_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn(d,'sync_queue','error_kind','TEXT');
  ensureColumn(d,'sync_queue','result_json','TEXT');
  ensureColumn(d,'sync_queue','retry_at','TEXT');
  ensureColumn(d,'staff_roles','pin_salt','TEXT');
  ensureColumn(d,'staff_roles','pin_hash','TEXT');
  ensureColumn(d,'staff_roles','active','INTEGER NOT NULL DEFAULT 1');
  ensureColumn(d,'staff_roles','last_login_at','TEXT');
  return d;
}
function now(){return new Date().toISOString()}
function saveOrder(order){
  const d=db(),t=now(),id=String(order.id||order.externalId||('local-'+Date.now()));
  d.prepare(`INSERT INTO orders(id,source,external_id,status,fulfilment,customer_name,customer_phone,total_pence,payload_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET source=excluded.source,external_id=excluded.external_id,status=excluded.status,fulfilment=excluded.fulfilment,customer_name=excluded.customer_name,customer_phone=excluded.customer_phone,total_pence=excluded.total_pence,payload_json=excluded.payload_json,updated_at=excluded.updated_at`)
    .run(id,String(order.source||'pos'),String(order.externalId||''),String(order.status||'draft'),String(order.fulfilment||''),String(order.customer?.name||order.customerName||''),String(order.customer?.phone||order.customerPhone||''),Number(order.total_pence||order.totalPence||0),JSON.stringify(order),String(order.createdAt||t),t);
  d.close();return id;
}
function upsertSupplierProduct(product){
  const d=db(),t=now();
  const supplier=String(product.supplier||'unknown');
  const sku=String(product.supplierSku||product.supplier_sku||'');
  const barcode=String(product.barcode||product.ean||product.gtin||'');
  const id=String(product.id||[supplier,sku||barcode||product.name||Date.now()].join(':'));
  d.prepare(`INSERT INTO supplier_products(id,supplier,supplier_sku,name,brand,category,pack_size,unit_size,barcode,case_barcode,cost_pence,vat_rate,payload_json,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET supplier=excluded.supplier,supplier_sku=excluded.supplier_sku,name=excluded.name,brand=excluded.brand,category=excluded.category,pack_size=excluded.pack_size,unit_size=excluded.unit_size,barcode=excluded.barcode,case_barcode=excluded.case_barcode,cost_pence=excluded.cost_pence,vat_rate=excluded.vat_rate,payload_json=excluded.payload_json,active=excluded.active,updated_at=excluded.updated_at`)
    .run(id,supplier,sku,String(product.name||''),String(product.brand||''),String(product.category||''),String(product.packSize||product.pack_size||''),String(product.unitSize||product.unit_size||''),barcode,String(product.caseBarcode||product.case_barcode||''),product.costPence==null?null:Number(product.costPence),product.vatRate==null?null:Number(product.vatRate),JSON.stringify(product),product.active===false?0:1,t);
  d.close();return id;
}
function importSupplierProducts(products=[]){
  const ids=[];for(const p of products)ids.push(upsertSupplierProduct(p));return ids;
}
function searchSupplierProducts(query='',supplier='',limit=100){
  const d=db(),q='%'+String(query||'').trim()+'%',sup=String(supplier||'').trim();
  let rows;
  if(sup)rows=d.prepare(`SELECT * FROM supplier_products WHERE active=1 AND supplier=? AND (name LIKE ? OR brand LIKE ? OR supplier_sku LIKE ? OR barcode LIKE ? OR case_barcode LIKE ?) ORDER BY brand,name LIMIT ?`).all(sup,q,q,q,q,q,Number(limit));
  else rows=d.prepare(`SELECT * FROM supplier_products WHERE active=1 AND (name LIKE ? OR brand LIKE ? OR supplier_sku LIKE ? OR barcode LIKE ? OR case_barcode LIKE ?) ORDER BY supplier,brand,name LIMIT ?`).all(q,q,q,q,q,Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function supplierProductById(id){
  const d=db();
  const r=d.prepare('SELECT * FROM supplier_products WHERE active=1 AND id=? LIMIT 1').get(String(id||''));
  d.close();return r?{...r,payload:JSON.parse(r.payload_json||'{}')}:null;
}
function supplierProductByBarcode(barcode){
  const d=db(),code=String(barcode||'').trim();
  const r=d.prepare('SELECT * FROM supplier_products WHERE active=1 AND (barcode=? OR case_barcode=?) LIMIT 1').get(code,code);
  d.close();return r?{...r,payload:JSON.parse(r.payload_json||'{}')}:null;
}
function addSupplierProductToCatalog(productId,pricePence,category='Drinks'){
  const d=db(),t=now();
  const p=d.prepare('SELECT * FROM supplier_products WHERE id=? AND active=1').get(String(productId));
  if(!p){d.close();throw new Error('Supplier product not found')}
  const id='supplier:'+p.id;
  d.prepare(`INSERT INTO catalog_products(id,name,category,price_pence,barcode,source_supplier,source_supplier_sku,active,payload_json,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,price_pence=excluded.price_pence,barcode=excluded.barcode,source_supplier=excluded.source_supplier,source_supplier_sku=excluded.source_supplier_sku,active=1,payload_json=excluded.payload_json,updated_at=excluded.updated_at`)
    .run(id,p.name,String(category||'Drinks'),Number(pricePence||0),p.barcode||'',p.supplier,p.supplier_sku||'',1,p.payload_json,t);
  d.close();return id;
}
function catalogProducts(query='',limit=200){
  const d=db(),q='%'+String(query||'').trim()+'%';
  const rows=d.prepare('SELECT * FROM catalog_products WHERE active=1 AND (name LIKE ? OR barcode LIKE ? OR source_supplier_sku LIKE ?) ORDER BY category,name LIMIT ?').all(q,q,q,Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function catalogProductByBarcode(barcode){
  const d=db(),r=d.prepare('SELECT * FROM catalog_products WHERE active=1 AND barcode=? LIMIT 1').get(String(barcode||'').trim());
  d.close();return r?{...r,payload:JSON.parse(r.payload_json||'{}')}:null;
}
function setStock(productId,qty,reorderLevel=0,unit='each'){
  const d=db(),t=now();
  d.prepare(`INSERT INTO stock_levels(product_id,qty,reorder_level,unit,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(product_id) DO UPDATE SET qty=excluded.qty,reorder_level=excluded.reorder_level,unit=excluded.unit,updated_at=excluded.updated_at`)
    .run(String(productId),Number(qty||0),Number(reorderLevel||0),String(unit||'each'),t);
  d.close();return true;
}
function adjustStock(productId,delta,reason='manual',reference='',staffId=null){
  const d=db(),t=now(),id=String(productId);
  d.prepare(`INSERT INTO stock_levels(product_id,qty,reorder_level,unit,updated_at) VALUES(?,?,0,'each',?)
    ON CONFLICT(product_id) DO UPDATE SET qty=qty+excluded.qty,updated_at=excluded.updated_at`)
    .run(id,Number(delta||0),t);
  d.prepare('INSERT INTO stock_movements(product_id,qty_delta,reason,reference,staff_id,created_at) VALUES(?,?,?,?,?,?)')
    .run(id,Number(delta||0),String(reason||'manual'),String(reference||''),staffId?String(staffId):null,t);
  d.close();return true;
}
function stockSnapshot(limit=500){
  const d=db();
  const rows=d.prepare(`SELECT c.id,c.name,c.category,c.barcode,c.price_pence,
    COALESCE(s.qty,0) qty,COALESCE(s.reorder_level,0) reorder_level,COALESCE(s.unit,'each') unit,s.updated_at
    FROM catalog_products c LEFT JOIN stock_levels s ON s.product_id=c.id
    WHERE c.active=1 ORDER BY c.category,c.name LIMIT ?`).all(Number(limit));
  d.close();return rows;
}
function lowStock(limit=200){
  const d=db();
  const rows=d.prepare(`SELECT c.id,c.name,c.category,c.barcode,COALESCE(s.qty,0) qty,COALESCE(s.reorder_level,0) reorder_level
    FROM catalog_products c JOIN stock_levels s ON s.product_id=c.id
    WHERE c.active=1 AND s.qty<=s.reorder_level ORDER BY (s.reorder_level-s.qty) DESC LIMIT ?`).all(Number(limit));
  d.close();return rows;
}
function savePurchaseOrder(po){
  const d=db(),t=now(),id=String(po.id||('po-'+Date.now()));
  d.prepare(`INSERT INTO purchase_orders(id,supplier,status,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET supplier=excluded.supplier,status=excluded.status,payload_json=excluded.payload_json,updated_at=excluded.updated_at`)
    .run(id,String(po.supplier||''),String(po.status||'draft'),JSON.stringify(po),String(po.createdAt||t),t);
  d.close();return id;
}
function listPurchaseOrders(limit=100){
  const d=db();const rows=d.prepare('SELECT id,supplier,status,payload_json,created_at,updated_at FROM purchase_orders ORDER BY created_at DESC LIMIT ?').all(Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function receiveGoods(receipt){
  const d=db(),t=now(),id=String(receipt.id||('grn-'+Date.now())),items=Array.isArray(receipt.items)?receipt.items:[];
  d.prepare('INSERT INTO goods_receipts(id,purchase_order_id,supplier,payload_json,received_at) VALUES(?,?,?,?,?)')
    .run(id,String(receipt.purchaseOrderId||''),String(receipt.supplier||''),JSON.stringify(receipt),t);
  for(const item of items){
    const pid=String(item.productId||''),qty=Number(item.qty||0);
    if(!pid||!qty)continue;
    d.prepare(`INSERT INTO stock_levels(product_id,qty,reorder_level,unit,updated_at) VALUES(?,?,0,'each',?)
      ON CONFLICT(product_id) DO UPDATE SET qty=qty+excluded.qty,updated_at=excluded.updated_at`).run(pid,qty,t);
    d.prepare('INSERT INTO stock_movements(product_id,qty_delta,reason,reference,staff_id,created_at) VALUES(?,?,?,?,?,?)')
      .run(pid,qty,'goods_in',id,receipt.staffId?String(receipt.staffId):null,t);
  }
  d.close();return id;
}
function setStaffRole(staffId,displayName,role,permissions=[]){
  const d=db(),t=now();
  d.prepare(`INSERT INTO staff_roles(staff_id,display_name,role,permissions_json,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(staff_id) DO UPDATE SET display_name=excluded.display_name,role=excluded.role,permissions_json=excluded.permissions_json,updated_at=excluded.updated_at`)
    .run(String(staffId),String(displayName||''),String(role||'staff'),JSON.stringify(permissions||[]),t);
  d.close();return true;
}
function setStaffPin(staffId,pin){
  const id=String(staffId||''),p=String(pin||'');
  if(!id)throw new Error('Staff ID required');
  if(!/^\d{4,8}$/.test(p))throw new Error('PIN must be 4 to 8 digits');
  const d=db(),salt=crypto.randomBytes(16).toString('hex');
  const hash=crypto.scryptSync(p,salt,32).toString('hex');
  const exists=d.prepare('SELECT staff_id FROM staff_roles WHERE staff_id=?').get(id);
  if(!exists)d.prepare("INSERT INTO staff_roles(staff_id,display_name,role,permissions_json,pin_salt,pin_hash,active,updated_at) VALUES(?,?,?, ?,?,?,1,?)")
    .run(id,id,'staff','[]',salt,hash,now());
  else d.prepare('UPDATE staff_roles SET pin_salt=?,pin_hash=?,active=1,updated_at=? WHERE staff_id=?').run(salt,hash,now(),id);
  d.close();return true;
}
function verifyStaffPin(staffId,pin){
  const d=db(),r=d.prepare('SELECT * FROM staff_roles WHERE staff_id=? AND COALESCE(active,1)=1').get(String(staffId||''));
  if(!r||!r.pin_salt||!r.pin_hash){d.close();return null}
  let ok=false;
  try{
    const calc=crypto.scryptSync(String(pin||''),r.pin_salt,32);
    ok=crypto.timingSafeEqual(calc,Buffer.from(r.pin_hash,'hex'));
  }catch{}
  if(ok)d.prepare('UPDATE staff_roles SET last_login_at=? WHERE staff_id=?').run(now(),String(staffId));
  d.close();
  if(!ok)return null;
  return {...r,permissions:JSON.parse(r.permissions_json||'[]')};
}
function listStaff(){
  const d=db(),rows=d.prepare('SELECT staff_id,display_name,role,permissions_json,COALESCE(active,1) active,last_login_at,updated_at FROM staff_roles ORDER BY display_name,staff_id').all();d.close();
  return rows.map(r=>({...r,permissions:JSON.parse(r.permissions_json||'[]')}));
}
function staffRole(staffId){
  const d=db(),r=d.prepare('SELECT * FROM staff_roles WHERE staff_id=?').get(String(staffId||''));d.close();
  return r?{...r,permissions:JSON.parse(r.permissions_json||'[]')}:null;
}
function savePromotion(promo){
  const d=db(),t=now(),id=String(promo.id||('promo-'+Date.now()));
  d.prepare(`INSERT INTO promotions(id,name,type,value,scope_json,active,starts_at,ends_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,value=excluded.value,scope_json=excluded.scope_json,active=excluded.active,starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=excluded.updated_at`)
    .run(id,String(promo.name||''),String(promo.type||'percent'),Number(promo.value||0),JSON.stringify(promo.scope||{}),promo.active===false?0:1,promo.startsAt||null,promo.endsAt||null,t);
  d.close();return id;
}
function activePromotions(){
  const d=db(),t=now();
  const rows=d.prepare(`SELECT * FROM promotions WHERE active=1 AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY name`).all(t,t);
  d.close();return rows.map(r=>({...r,scope:JSON.parse(r.scope_json||'{}')}));
}
function deductStockForOrder(order){
  const d=db(),t=now(),items=Array.isArray(order?.items)?order.items:[];
  for(const item of items){
    const pid=String(item.productId||item.id||'');
    const qty=Number(item.qty||1);
    if(!pid||!qty)continue;
    const exists=d.prepare('SELECT product_id FROM stock_levels WHERE product_id=?').get(pid);
    if(!exists)continue;
    d.prepare('UPDATE stock_levels SET qty=qty-?,updated_at=? WHERE product_id=?').run(qty,t,pid);
    d.prepare('INSERT INTO stock_movements(product_id,qty_delta,reason,reference,staff_id,created_at) VALUES(?,?,?,?,?,?)')
      .run(pid,-qty,'sale',String(order.id||''),order.staffId?String(order.staffId):null,t);
  }
  d.close();return true;
}
function updateOrderStatus(orderId,status,staffId=null){
  const d=db(),t=now();
  const r=d.prepare('SELECT payload_json FROM orders WHERE id=?').get(String(orderId));
  if(!r){d.close();throw new Error('Order not found')}
  const payload=JSON.parse(r.payload_json||'{}');payload.status=String(status);payload.updatedAt=t;
  d.prepare('UPDATE orders SET status=?,payload_json=?,updated_at=? WHERE id=?').run(String(status),JSON.stringify(payload),t,String(orderId));
  d.prepare('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?)')
    .run(staffId?String(staffId):null,'order.status','order',String(orderId),JSON.stringify({status}),t);
  d.close();return true;
}
function kdsOrders(limit=100){
  const d=db();
  const rows=d.prepare(`SELECT id,source,status,fulfilment,customer_name,total_pence,payload_json,created_at,updated_at FROM orders
    WHERE status NOT IN ('completed','collected','cancelled','refunded','voided')
    ORDER BY created_at ASC LIMIT ?`).all(Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function saveDeliveryJob(job){
  const d=db(),t=now(),id=String(job.id||('delivery-'+Date.now()));
  d.prepare(`INSERT INTO delivery_jobs(id,order_id,driver,status,address_json,notes,assigned_at,completed_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET order_id=excluded.order_id,driver=excluded.driver,status=excluded.status,address_json=excluded.address_json,notes=excluded.notes,assigned_at=excluded.assigned_at,completed_at=excluded.completed_at,updated_at=excluded.updated_at`)
    .run(id,String(job.orderId||''),job.driver?String(job.driver):null,String(job.status||'waiting'),JSON.stringify(job.address||{}),String(job.notes||''),job.assignedAt||null,job.completedAt||null,t);
  d.close();return id;
}
function deliveryJobs(limit=100){
  const d=db(),rows=d.prepare('SELECT * FROM delivery_jobs ORDER BY updated_at DESC LIMIT ?').all(Number(limit));d.close();
  return rows.map(r=>({...r,address:JSON.parse(r.address_json||'{}')}));
}
function saveOrderAdjustment(adj){
  const d=db(),t=now(),id=String(adj.id||('adjust-'+Date.now())),type=String(adj.type||'void');
  if(!['void','refund','partial_refund'].includes(type)){d.close();throw new Error('Invalid adjustment type')}
  d.prepare('INSERT INTO order_adjustments(id,order_id,type,amount_pence,reason,staff_id,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(id,String(adj.orderId||''),type,Number(adj.amountPence||0),String(adj.reason||''),adj.staffId?String(adj.staffId):null,JSON.stringify(adj),t);
  if(type==='void')d.prepare("UPDATE orders SET status='voided',updated_at=? WHERE id=?").run(t,String(adj.orderId||''));
  if(type==='refund')d.prepare("UPDATE orders SET status='refunded',updated_at=? WHERE id=?").run(t,String(adj.orderId||''));
  d.close();return id;
}
function orderAdjustments(orderId){
  const d=db(),rows=d.prepare('SELECT * FROM order_adjustments WHERE order_id=? ORDER BY created_at DESC').all(String(orderId||''));d.close();
  return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function saveCashup(c){
  const d=db(),t=now(),id=String(c.id||('cashup-'+Date.now()));
  const expected=Number(c.expectedCashPence||0),counted=Number(c.countedCashPence||0);
  d.prepare('INSERT INTO cashups(id,staff_id,expected_cash_pence,counted_cash_pence,card_pence,other_pence,discrepancy_pence,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
    .run(id,c.staffId?String(c.staffId):null,expected,counted,Number(c.cardPence||0),Number(c.otherPence||0),counted-expected,JSON.stringify(c),t);
  d.close();return id;
}
function recentCashups(limit=50){
  const d=db(),rows=d.prepare('SELECT * FROM cashups ORDER BY created_at DESC LIMIT ?').all(Number(limit));d.close();return rows;
}
function customer360(customerIdOrPhone){
  const d=db(),q=String(customerIdOrPhone||'');
  const c=d.prepare('SELECT * FROM customers WHERE id=? OR phone=? LIMIT 1').get(q,q);
  if(!c){d.close();return null}
  const orders=d.prepare('SELECT id,source,status,fulfilment,total_pence,created_at,updated_at FROM orders WHERE customer_phone=? ORDER BY created_at DESC LIMIT 50').all(c.phone||'');
  const calls=d.prepare('SELECT id,phone,caller_name,caller_type,event_type,received_at FROM calls WHERE phone=? ORDER BY received_at DESC LIMIT 50').all(c.phone||'');
  d.close();
  return {
    customer:{...c,payload:JSON.parse(c.payload_json||'{}')},
    orders,
    calls,
    totals:{
      orderCount:orders.length,
      lifetimeSpendPence:orders.reduce((a,o)=>a+Number(o.total_pence||0),0)
    }
  };
}
function saveCall(call){
  const d=db(),t=now(),id=String(call.id||call.call_id||('call-'+Date.now()));
  const phone=String(call.phone||call.caller_number||call.normalized_phone||'');
  const name=String(call.caller_name||call.customer_name||call.customer?.name||'');
  const type=String(call.caller_type||'unknown'),event=String(call.event_type||'incoming');
  d.prepare(`INSERT INTO calls(id,phone,caller_name,caller_type,event_type,payload_json,received_at)
    VALUES(?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET phone=excluded.phone,caller_name=excluded.caller_name,caller_type=excluded.caller_type,event_type=excluded.event_type,payload_json=excluded.payload_json,received_at=excluded.received_at`)
    .run(id,phone,name,type,event,JSON.stringify(call),String(call.received_at||t));
  d.close();return id;
}
function recentCalls(limit=100){
  const d=db();const rows=d.prepare('SELECT id,phone,caller_name,caller_type,event_type,payload_json,received_at FROM calls ORDER BY received_at DESC LIMIT ?').all(Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function saveCustomer(customer){
  const d=db(),t=now(),id=String(customer.id||('customer-'+Date.now()));
  d.prepare(`INSERT INTO customers(id,name,phone,loyalty_code,payload_json,updated_at)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,loyalty_code=excluded.loyalty_code,payload_json=excluded.payload_json,updated_at=excluded.updated_at`)
    .run(id,String(customer.name||customer.full_name||''),String(customer.phone||''),String(customer.loyalty_code||''),JSON.stringify(customer),t);
  d.close();return id;
}
function searchCustomers(query='',limit=50){
  const d=db(),q='%'+String(query||'').trim()+'%';
  const rows=d.prepare('SELECT id,name,phone,loyalty_code,payload_json,updated_at FROM customers WHERE name LIKE ? OR phone LIKE ? OR loyalty_code LIKE ? ORDER BY name LIMIT ?').all(q,q,q,Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function queue(connector,action,entityId,payload){
  const d=db(),t=now();
  const r=d.prepare('INSERT INTO sync_queue(connector,action,entity_id,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(String(connector),String(action),entityId?String(entityId):null,JSON.stringify(payload||{}),t,t);
  d.close();return Number(r.lastInsertRowid);
}
function queueSummary(){
  const d=db();
  const rows=d.prepare('SELECT state,COUNT(*) count FROM sync_queue GROUP BY state').all();
  d.close();return Object.fromEntries(rows.map(r=>[r.state,Number(r.count)]));
}
function nextQueued(limit=25){
  const d=db(),t=now();
  const rows=d.prepare("SELECT * FROM sync_queue WHERE state='queued' AND (retry_at IS NULL OR retry_at<=?) ORDER BY created_at ASC LIMIT ?").all(t,Number(limit));
  d.close();return rows.map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
}
function markQueueDone(id,result){
  const d=db(),t=now();
  d.prepare("UPDATE sync_queue SET state='done',result_json=?,last_error=NULL,error_kind=NULL,retry_at=NULL,updated_at=? WHERE id=?").run(JSON.stringify(result||{}),t,Number(id));
  d.close();return true;
}
function markQueueRetry(id,attempts,error,retryAt,kind){
  const d=db(),t=now();
  d.prepare("UPDATE sync_queue SET state='queued',attempts=?,last_error=?,error_kind=?,retry_at=?,updated_at=? WHERE id=?").run(Number(attempts),String(error||''),String(kind||''),String(retryAt||''),t,Number(id));
  d.close();return true;
}
function markQueueFailed(id,attempts,error,kind){
  const d=db(),t=now();
  d.prepare("UPDATE sync_queue SET state='failed',attempts=?,last_error=?,error_kind=?,retry_at=NULL,updated_at=? WHERE id=?").run(Number(attempts),String(error||''),String(kind||''),t,Number(id));
  d.close();return true;
}
function recentOrders(limit=50){
  const d=db();
  const rows=d.prepare('SELECT id,source,external_id,status,fulfilment,customer_name,customer_phone,total_pence,created_at,updated_at FROM orders ORDER BY created_at DESC LIMIT ?').all(Number(limit));
  d.close();return rows;
}
function audit(staffId,action,entityType,entityId,detail){
  const d=db(),t=now();
  d.prepare('INSERT INTO audit_log(staff_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?)').run(staffId?String(staffId):null,String(action),entityType?String(entityType):null,entityId?String(entityId):null,JSON.stringify(detail||{}),t);
  d.close();return true;
}
function stats(){
  const d=db();
  const orders=Number(d.prepare('SELECT COUNT(*) c FROM orders').get().c);
  const calls=Number(d.prepare('SELECT COUNT(*) c FROM calls').get().c);
  const queued=Number(d.prepare("SELECT COUNT(*) c FROM sync_queue WHERE state='queued'").get().c);
  d.close();return {dbPath:DB_PATH,orders,calls,queued};
}
module.exports={DB_PATH,saveOrder,upsertSupplierProduct,importSupplierProducts,searchSupplierProducts,supplierProductById,supplierProductByBarcode,addSupplierProductToCatalog,catalogProducts,catalogProductByBarcode,setStock,adjustStock,stockSnapshot,lowStock,savePurchaseOrder,listPurchaseOrders,receiveGoods,setStaffRole,setStaffPin,verifyStaffPin,listStaff,staffRole,savePromotion,activePromotions,deductStockForOrder,updateOrderStatus,kdsOrders,saveDeliveryJob,deliveryJobs,saveOrderAdjustment,orderAdjustments,saveCashup,recentCashups,customer360,saveCall,recentCalls,saveCustomer,searchCustomers,queue,queueSummary,nextQueued,markQueueDone,markQueueRetry,markQueueFailed,recentOrders,audit,stats};
