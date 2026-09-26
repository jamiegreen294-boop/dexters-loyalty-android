'use strict';

const path=require('path');
const fs=require('fs');
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
module.exports={DB_PATH,saveOrder,saveCall,recentCalls,saveCustomer,searchCustomers,queue,queueSummary,nextQueued,markQueueDone,markQueueRetry,markQueueFailed,recentOrders,audit,stats};
