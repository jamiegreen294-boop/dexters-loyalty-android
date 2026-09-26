const http=require('http');
const fs=require('fs');
const path=require('path');
const os=require('os');
const cp=require('child_process');
const IntegrationGateway=require('./IntegrationGateway');
const PhoneOrders=require('./PhoneOrders');
const DexterAI=require('./DexterAI');
const LocalStore=require('./LocalStore');
const OperationsCentre=require('./OperationsCentre');
const SyncEngine=require('./SyncEngine');
const DeliveryLookup=require('./DeliveryLookup');
const MarketplaceAdapters=require('./MarketplaceAdapters');
const OpenAIBuilder=require('./OpenAIBuilder');
const Permissions=require('./Permissions');
const Reports=require('./Reports');
const SupportDiagnostics=require('./SupportDiagnostics');
const BackupRestore=require('./BackupRestore');
const ReleaseManager=require('./ReleaseManager');
const HealthSupervisor=require('./HealthSupervisor');
const CrashGuard=require('./CrashGuard');
const PilotSelfTest=require('./PilotSelfTest');
const AlcoholCompliance=require('./AlcoholCompliance');
const Barcode=require('./Barcode');
const PaymentGateway=require('./PaymentGateway');
const HardwareService=require('./HardwareService');

const ROOT=path.resolve(__dirname);
const BUILD_VERSION='0.5.0-rc';
let customerDisplayState={cart:[],subtotalPence:0,discountPence:0,deliveryFeePence:0,totalPence:0,customer:null,updatedAt:null};
const staffSessions=new Map();
function newSessionToken(){return require('crypto').randomBytes(24).toString('hex')}
function staffFromRequest(req){
  const token=String(req.headers['x-staff-session']||'');
  const session=staffSessions.get(token);
  if(!session)return null;
  if(Date.now()>session.expiresAt){staffSessions.delete(token);return null}
  session.expiresAt=Date.now()+8*60*60*1000;
  return session.staff;
}
function requireStaffPermission(req,res,permission){
  const staff=staffFromRequest(req);
  if(!staff){send(res,401,{ok:false,error:'Staff login required'});return null}
  if(!Permissions.allowed(staff,permission)){send(res,403,{ok:false,error:'Permission required: '+permission});return null}
  return staff;
}
const CONFIG_PATH=process.env.DEXTERS_EPOS_CONFIG||path.join(ROOT,'config.json');
const LOG_PATH=path.join(ROOT,'hub-node.log');
const QUEUE_PATH=path.join(ROOT,'offline-queue.jsonl');
const DASHBOARD=path.join(ROOT,'dashboard','index.html');
const CUSTOMER_DISPLAY=path.join(ROOT,'customer-display','index.html');
const EPOS_APP=path.join(ROOT,'app','index.html');
const EPOS_APP_JS=path.join(ROOT,'app','app.js');
const PRELOADED_DRINKS=path.join(ROOT,'preloaded-drinks.json');
const PRELOADED_SNACKS=path.join(ROOT,'preloaded-snacks.json');
const PRELOADED_ALCOHOL=path.join(ROOT,'preloaded-alcohol.json');
function log(msg){fs.appendFileSync(LOG_PATH,new Date().toISOString()+' '+msg+'\n');}
function seedPreloadedFile(file,label){
  try{
    if(!fs.existsSync(file))return 0;
    const rows=JSON.parse(fs.readFileSync(file,'utf8'));
    const n=LocalStore.importSupplierProducts(Array.isArray(rows)?rows:[]).length;
    log('Preloaded '+label+' '+n);
    return n;
  }catch(e){log('PRELOAD '+label+' ERROR '+e.message);return 0}
}
function loadConfig(){return JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));}
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'access-control-allow-origin':'*','access-control-allow-headers':'content-type,x-dexters-key,x-staff-session','access-control-allow-methods':'GET,POST,OPTIONS','cache-control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(body):String(body));}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>1024*1024)reject(new Error('Request too large'));});req.on('end',()=>{try{resolve(s?JSON.parse(s):{});}catch(e){reject(e);}});req.on('error',reject);});}
function launch(command,args){const parts=args?String(args).split(' ').filter(Boolean):[];const child=cp.spawn(command,parts,{detached:true,stdio:'ignore',windowsHide:false});child.unref();return true;}
function queue(event){fs.appendFileSync(QUEUE_PATH,JSON.stringify({...event,queued_at:new Date().toISOString()})+'\n');}
function queueCount(){try{return fs.readFileSync(QUEUE_PATH,'utf8').split(/\r?\n/).filter(Boolean).length}catch{return 0}}
function runPS(script){return new Promise((resolve,reject)=>cp.execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{windowsHide:true,timeout:8000},(e,stdout,stderr)=>e?reject(new Error((stderr||e.message).trim())):resolve(stdout.trim())))}
async function printerStatus(name){if(!name)return null;try{const safe=String(name).replace(/'/g,"''");const out=await runPS("$p=Get-Printer -Name '"+safe+"' -ErrorAction Stop; [pscustomobject]@{Name=$p.Name;PrinterStatus=[string]$p.PrinterStatus;WorkOffline=[bool]$p.WorkOffline}|ConvertTo-Json -Compress");return JSON.parse(out)}catch{return null}}
async function handle(req,res){
  const cfg=loadConfig();
  if(req.method==='OPTIONS')return send(res,200,{ok:true});
  const url=new URL(req.url,'http://127.0.0.1');
  if(req.method==='GET'&&url.pathname==='/epos/app.js'){if(!fs.existsSync(EPOS_APP_JS))return send(res,404,'EPOS app controller not installed','text/plain; charset=utf-8');return send(res,200,fs.readFileSync(EPOS_APP_JS,'utf8'),'application/javascript; charset=utf-8');}
  if(req.method==='GET'&&url.pathname==='/epos'){if(!fs.existsSync(EPOS_APP))return send(res,404,'EPOS app not installed','text/plain; charset=utf-8');return send(res,200,fs.readFileSync(EPOS_APP,'utf8'),'text/html; charset=utf-8');}
  if(req.method==='GET'&&url.pathname==='/customer-display'){if(!fs.existsSync(CUSTOMER_DISPLAY))return send(res,404,'Customer display not installed','text/plain; charset=utf-8');return send(res,200,fs.readFileSync(CUSTOMER_DISPLAY,'utf8'),'text/html; charset=utf-8');}
  if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/dashboard')){if(!fs.existsSync(DASHBOARD))return send(res,404,'Dashboard not installed','text/plain; charset=utf-8');return send(res,200,fs.readFileSync(DASHBOARD,'utf8'),'text/html; charset=utf-8');}
  if(req.method==='GET'&&url.pathname==='/supplier/products'){
    return send(res,200,{ok:true,testOnly:true,products:LocalStore.searchSupplierProducts(url.searchParams.get('q')||'',url.searchParams.get('supplier')||'',Number(url.searchParams.get('limit')||100))});
  }
  if(req.method==='POST'&&url.pathname==='/supplier/import'){
    const b=await body(req);const ids=LocalStore.importSupplierProducts(Array.isArray(b.products)?b.products:[]);return send(res,200,{ok:true,testOnly:true,imported:ids.length,ids});
  }
  if(req.method==='POST'&&url.pathname==='/supplier/add-to-catalog'){
    const staff=requireStaffPermission(req,res,'price_change');if(!staff)return;
    const b=await body(req),p=LocalStore.supplierProductById(b.productId);
    if(!p)return send(res,404,{ok:false,error:'Supplier product not found'});
    const payload=p.payload||{},pricePence=Number(b.pricePence||0);
    if(payload.alcohol===true){
      const check=AlcoholCompliance.validateAlcoholProduct({
        alcohol:true,abv:Number(payload.abv||0),volumeMl:Number(payload.volumeMl||0),pricePence
      },{mupPencePerUnit:65});
      if(!check.ok)return send(res,409,{ok:false,error:check.errors.join('; '),minimumPricePence:check.minimumPricePence,units:check.units});
    }
    const id=LocalStore.addSupplierProductToCatalog(b.productId,pricePence,String(b.category||'Drinks'));
    LocalStore.audit(b.staffId||null,'catalog.add_supplier_product','catalog_product',id,{supplierProductId:b.productId,alcohol:payload.alcohol===true});
    return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='POST'&&url.pathname==='/stock/deduct-order'){
    const staff=requireStaffPermission(req,res,'sale');if(!staff)return;
    const b=await body(req);LocalStore.deductStockForOrder(b.order||{});LocalStore.audit(b.staffId||null,'stock.sale_deduct','order',String(b.order?.id||''),{items:Array.isArray(b.order?.items)?b.order.items.length:0});return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='GET'&&url.pathname==='/stock'){
    return send(res,200,{ok:true,testOnly:true,stock:LocalStore.stockSnapshot(Number(url.searchParams.get('limit')||500))});
  }
  if(req.method==='GET'&&url.pathname==='/stock/low'){
    return send(res,200,{ok:true,testOnly:true,stock:LocalStore.lowStock(Number(url.searchParams.get('limit')||200))});
  }
  if(req.method==='POST'&&url.pathname==='/stock/set'){
    const staff=requireStaffPermission(req,res,'stock_adjust');if(!staff)return;
    const b=await body(req);LocalStore.setStock(b.productId,Number(b.qty||0),Number(b.reorderLevel||0),String(b.unit||'each'));LocalStore.audit(b.staffId||null,'stock.set','catalog_product',String(b.productId),{qty:b.qty,reorderLevel:b.reorderLevel});return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='POST'&&url.pathname==='/stock/adjust'){
    const staff=requireStaffPermission(req,res,'stock_adjust');if(!staff)return;
    const b=await body(req);LocalStore.adjustStock(b.productId,Number(b.delta||0),String(b.reason||'manual'),String(b.reference||''),b.staffId||null);LocalStore.audit(b.staffId||null,'stock.adjust','catalog_product',String(b.productId),{delta:b.delta,reason:b.reason});return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='GET'&&url.pathname==='/purchasing/orders'){
    return send(res,200,{ok:true,testOnly:true,orders:LocalStore.listPurchaseOrders(Number(url.searchParams.get('limit')||100))});
  }
  if(req.method==='POST'&&url.pathname==='/purchasing/order'){
    const staff=requireStaffPermission(req,res,'stock_adjust');if(!staff)return;
    const b=await body(req);const id=LocalStore.savePurchaseOrder(b.order||{});LocalStore.audit(b.staffId||null,'purchase_order.save','purchase_order',id,{supplier:b.order?.supplier||''});return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='POST'&&url.pathname==='/purchasing/receive'){
    const staff=requireStaffPermission(req,res,'stock_adjust');if(!staff)return;
    const b=await body(req);const id=LocalStore.receiveGoods({...b.receipt,staffId:b.staffId||b.receipt?.staffId||null});LocalStore.audit(b.staffId||null,'goods.receive','goods_receipt',id,{purchaseOrderId:b.receipt?.purchaseOrderId||''});return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='GET'&&url.pathname==='/staff/bootstrap-status'){
    return send(res,200,{ok:true,testOnly:true,required:!LocalStore.hasPinStaff()});
  }
  if(req.method==='POST'&&url.pathname==='/staff/bootstrap'){
    if(LocalStore.hasPinStaff())return send(res,409,{ok:false,error:'Staff already configured'});
    const b=await body(req),staffId=String(b.staffId||'manager'),name=String(b.displayName||'Manager');
    LocalStore.setStaffRole(staffId,name,'manager',[]);
    LocalStore.setStaffPin(staffId,b.pin);
    LocalStore.audit(staffId,'staff.bootstrap','staff',staffId,{role:'manager'});
    return send(res,200,{ok:true,testOnly:true,staffId});
  }
  if(req.method==='POST'&&url.pathname==='/staff/login'){
    const b=await body(req),staff=LocalStore.verifyStaffPin(b.staffId,b.pin);
    if(!staff)return send(res,401,{ok:false,error:'Invalid staff ID or PIN'});
    const token=newSessionToken();
    staffSessions.set(token,{staff,expiresAt:Date.now()+8*60*60*1000});
    LocalStore.audit(staff.staff_id,'staff.login','staff',staff.staff_id,{role:staff.role});
    return send(res,200,{ok:true,testOnly:true,session:token,staff:{staffId:staff.staff_id,displayName:staff.display_name,role:staff.role,permissions:Permissions.permissionsFor(staff.role,staff.permissions||[])}});
  }
  if(req.method==='POST'&&url.pathname==='/staff/logout'){
    const token=String(req.headers['x-staff-session']||'');staffSessions.delete(token);return send(res,200,{ok:true});
  }
  if(req.method==='GET'&&url.pathname==='/staff/me'){
    const staff=staffFromRequest(req);if(!staff)return send(res,401,{ok:false,error:'Not signed in'});
    return send(res,200,{ok:true,testOnly:true,staff:{staffId:staff.staff_id,displayName:staff.display_name,role:staff.role,permissions:Permissions.permissionsFor(staff.role,staff.permissions||[])}});
  }
  if(req.method==='GET'&&url.pathname==='/staff/list'){
    const staff=requireStaffPermission(req,res,'staff_admin');if(!staff)return;
    return send(res,200,{ok:true,testOnly:true,staff:LocalStore.listStaff()});
  }
  if(req.method==='POST'&&url.pathname==='/staff/pin'){
    const staff=requireStaffPermission(req,res,'staff_admin');if(!staff)return;
    const b=await body(req);LocalStore.setStaffPin(b.staffId,b.pin);LocalStore.audit(staff.staff_id,'staff.pin_set','staff',String(b.staffId),{});return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='POST'&&url.pathname==='/staff/role'){
    const staff=requireStaffPermission(req,res,'staff_admin');if(!staff)return;
    const b=await body(req);LocalStore.setStaffRole(b.staffId,b.displayName,b.role,b.permissions||[]);return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='GET'&&url.pathname==='/staff/role'){
    return send(res,200,{ok:true,testOnly:true,staff:LocalStore.staffRole(url.searchParams.get('staffId')||'')});
  }
  if(req.method==='GET'&&url.pathname==='/promotions'){
    return send(res,200,{ok:true,testOnly:true,promotions:LocalStore.activePromotions()});
  }
  if(req.method==='POST'&&url.pathname==='/promotions'){
    const staff=requireStaffPermission(req,res,'price_change');if(!staff)return;
    const b=await body(req);const id=LocalStore.savePromotion(b.promotion||{});LocalStore.audit(b.staffId||null,'promotion.save','promotion',id,{name:b.promotion?.name||''});return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='GET'&&url.pathname==='/kds/orders'){
    return send(res,200,{ok:true,testOnly:true,orders:LocalStore.kdsOrders(Number(url.searchParams.get('limit')||100))});
  }
  if(req.method==='POST'&&url.pathname==='/orders/status'){
    const staff=requireStaffPermission(req,res,'kds_update');if(!staff)return;
    const b=await body(req);LocalStore.updateOrderStatus(b.orderId,b.status,b.staffId||null);return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='GET'&&url.pathname==='/delivery/jobs'){
    return send(res,200,{ok:true,testOnly:true,jobs:LocalStore.deliveryJobs(Number(url.searchParams.get('limit')||100))});
  }
  if(req.method==='POST'&&url.pathname==='/delivery/jobs'){
    const staff=requireStaffPermission(req,res,'sale');if(!staff)return;
    const b=await body(req);const id=LocalStore.saveDeliveryJob(b.job||{});return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='POST'&&url.pathname==='/orders/adjust'){
    const b=await body(req);const type=String(b.adjustment?.type||'void');
    const staff=requireStaffPermission(req,res,type==='void'?'void':type==='partial_refund'?'partial_refund':'refund');if(!staff)return;const id=LocalStore.saveOrderAdjustment(b.adjustment||{});LocalStore.audit(b.staffId||null,'order.adjust','order',String(b.adjustment?.orderId||''),{type:b.adjustment?.type,amountPence:b.adjustment?.amountPence});return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='GET'&&url.pathname==='/orders/adjustments'){
    return send(res,200,{ok:true,testOnly:true,adjustments:LocalStore.orderAdjustments(url.searchParams.get('orderId')||'')});
  }
  if(req.method==='GET'&&url.pathname==='/cashups'){
    return send(res,200,{ok:true,testOnly:true,cashups:LocalStore.recentCashups(Number(url.searchParams.get('limit')||50))});
  }
  if(req.method==='POST'&&url.pathname==='/cashups'){
    const staff=requireStaffPermission(req,res,'cashup');if(!staff)return;
    const b=await body(req);const id=LocalStore.saveCashup(b.cashup||{});LocalStore.audit(b.staffId||null,'cashup.save','cashup',id,{});return send(res,200,{ok:true,testOnly:true,id});
  }
  if(req.method==='GET'&&url.pathname==='/catalog/products'){
    return send(res,200,{ok:true,testOnly:true,products:LocalStore.catalogProducts(url.searchParams.get('q')||'',Number(url.searchParams.get('limit')||200))});
  }
  if(req.method==='GET'&&url.pathname==='/catalog/barcode'){
    return send(res,200,{ok:true,testOnly:true,product:LocalStore.catalogProductByBarcode(url.searchParams.get('code')||'')});
  }
  if(req.method==='POST'&&url.pathname==='/alcohol/check'){
    const b=await body(req);
    const settings={offSalesStart:String(b.settings?.offSalesStart||'10:00'),offSalesEnd:String(b.settings?.offSalesEnd||'22:00'),mupPencePerUnit:Number(b.settings?.mupPencePerUnit||65),challengeAge:Number(b.settings?.challengeAge||25)};
    return send(res,200,{ok:true,testOnly:true,gate:AlcoholCompliance.checkoutGate(b.cart||[],new Date(),settings)});
  }
  if(req.method==='POST'&&url.pathname==='/alcohol/verify-age'){
    const b=await body(req);return send(res,200,{ok:true,testOnly:true,result:AlcoholCompliance.confirmAgeVerification(b)});
  }
  if(req.method==='POST'&&url.pathname==='/barcode/validate'){
    const b=await body(req),barcode=Barcode.normaliseBarcode(b.barcode);
    return send(res,200,{ok:true,testOnly:true,barcode,valid:Barcode.looksLikeBarcode(barcode)});
  }
  if(req.method==='POST'&&url.pathname==='/sync/run'){
    const b=await body(req);return send(res,200,await SyncEngine.runBatch(Number(b.limit||25)));
  }
  if(req.method==='GET'&&url.pathname==='/operations'){
    return send(res,200,{ok:true,...OperationsCentre.overview(LocalStore.stats())});
  }
  if(req.method==='GET'&&url.pathname==='/local/calls'){
    return send(res,200,{ok:true,calls:LocalStore.recentCalls(Number(url.searchParams.get('limit')||100))});
  }
  if(req.method==='POST'&&url.pathname==='/local/call'){
    const b=await body(req);const id=LocalStore.saveCall(b.call||{});LocalStore.audit(b.staffId||null,'call.save','call',id,{source:'test-epos'});return send(res,200,{ok:true,id});
  }
  if(req.method==='GET'&&url.pathname==='/setup/config'){
    const c=loadConfig();
    return send(res,200,{ok:true,testOnly:true,config:{companyId:c.companyId||'dexters',siteId:c.siteId||'',deviceId:c.deviceId||'',deviceName:c.deviceName||'',timezone:c.timezone||'Europe/London',currency:c.currency||'GBP',jurisdiction:c.jurisdiction||'Scotland',alcohol:c.alcohol||{},deliveryZones:c.deliveryZones||[],listenPort:c.listenPort||17654,printer:c.printer||{},apps:Object.fromEntries(Object.entries(c.apps||{}).map(([k,v])=>[k,{enabled:!!v.enabled,displayName:v.displayName||k,mode:v.mode||''}]))}});
  }
  if(req.method==='POST'&&url.pathname==='/setup/config'){
    const staff=requireStaffPermission(req,res,'integration_admin');if(!staff)return;
    const b=await body(req),c=loadConfig();
    const next={...c,
      companyId:String(b.companyId||c.companyId||'dexters'),
      siteId:String(b.siteId||c.siteId||''),
      deviceId:String(b.deviceId||c.deviceId||''),
      deviceName:String(b.deviceName||c.deviceName||''),
      timezone:String(b.timezone||c.timezone||'Europe/London'),
      currency:String(b.currency||c.currency||'GBP'),
      jurisdiction:String(b.jurisdiction||c.jurisdiction||'Scotland'),
      deliveryZones:Array.isArray(b.deliveryZones)?b.deliveryZones:(c.deliveryZones||[]),
      alcohol:{...(c.alcohol||{}),offSalesStart:String(b.offSalesStart||c.alcohol?.offSalesStart||'10:00'),offSalesEnd:String(b.offSalesEnd||c.alcohol?.offSalesEnd||'22:00'),mupPencePerUnit:Number(b.mupPencePerUnit||c.alcohol?.mupPencePerUnit||65),challengeAge:Number(b.challengeAge||c.alcohol?.challengeAge||25)},
      printer:{...(c.printer||{}),name:String(b.printerName||c.printer?.name||''),paperWidth:Number(b.paperWidth||c.printer?.paperWidth||80),drawerPulsePin:Number(b.drawerPulsePin??c.printer?.drawerPulsePin??0)}
    };
    fs.writeFileSync(CONFIG_PATH,JSON.stringify(next,null,2),'utf8');
    LocalStore.audit(b.staffId||null,'setup.config','device',next.deviceId,{siteId:next.siteId,deviceName:next.deviceName,printer:next.printer?.name||''});
    return send(res,200,{ok:true,testOnly:true,restartRequired:false,config:{siteId:next.siteId,deviceId:next.deviceId,deviceName:next.deviceName,printer:next.printer}});
  }
  if(req.method==='POST'&&url.pathname==='/permissions/check'){
    const b=await body(req);
    return send(res,200,{ok:true,testOnly:true,allowed:Permissions.allowed(b.staff||{},String(b.permission||'')),permissions:Permissions.permissionsFor(b.staff?.role,b.staff?.permissions||[])});
  }
  if(req.method==='GET'&&url.pathname==='/system/self-test'){
    return send(res,200,{ok:true,testOnly:true,selfTest:PilotSelfTest.run(ROOT,LocalStore,IntegrationGateway)});
  }
  if(req.method==='POST'&&url.pathname==='/backup/restore'){
    const staff=requireStaffPermission(req,res,'integration_admin');if(!staff)return;
    const b=await body(req),dir=path.join(ROOT,'backups');
    BackupRestore.restoreDatabase(process.env.DEXTERS_EPOS_DB||LocalStore.DB_PATH,dir,b.file);
    LocalStore.audit(staff.staff_id,'backup.restore','database',String(b.file||''),{});
    return send(res,200,{ok:true,testOnly:true,restartRecommended:true});
  }
  if(req.method==='GET'&&url.pathname==='/system/status'){
    const stock=LocalStore.stockSnapshot(1000),orders=LocalStore.recentOrders(1000);
    const report=await HealthSupervisor.checkAll({databaseOk:true,uiOk:true,printerOk:false,integrations:IntegrationGateway.allStates()});
    return send(res,200,{ok:true,testOnly:true,health:report,release:ReleaseManager.loadState(ROOT),crash:CrashGuard.load(ROOT),sales:Reports.salesSummary(orders),stock:Reports.stockValuation(stock)});
  }
  if(req.method==='POST'&&url.pathname==='/system/mark-stable'){
    const staff=requireStaffPermission(req,res,'integration_admin');if(!staff)return;
    const test=PilotSelfTest.run(ROOT,LocalStore,IntegrationGateway);
    if(!test.ok)return send(res,409,{ok:false,error:'Pilot self-test must pass before marking stable',selfTest:test});
    CrashGuard.markStable(ROOT);ReleaseManager.markGood(ROOT,BUILD_VERSION);
    LocalStore.audit(staff.staff_id,'release.mark_good','release',BUILD_VERSION,{channel:ReleaseManager.loadState(ROOT).channel});
    return send(res,200,{ok:true,testOnly:true,version:BUILD_VERSION,selfTest:test});
  }
  if(req.method==='POST'&&url.pathname==='/system/record-crash'){
    const b=await body(req);const journal=CrashGuard.recordCrash(ROOT,b.component||'unknown',b.error||'');return send(res,200,{ok:true,testOnly:true,journal,rollback:CrashGuard.shouldRollback(ROOT)});
  }
  if(req.method==='GET'&&url.pathname==='/release/state'){
    return send(res,200,{ok:true,testOnly:true,state:ReleaseManager.loadState(ROOT),rollback:ReleaseManager.rollbackPlan(ROOT)});
  }
  if(req.method==='POST'&&url.pathname==='/release/channel'){
    const staff=requireStaffPermission(req,res,'integration_admin');if(!staff)return;
    const b=await body(req),state=ReleaseManager.setChannel(ROOT,String(b.channel||'test'));
    LocalStore.audit(staff.staff_id,'release.channel','release',String(state.channel),{});
    return send(res,200,{ok:true,testOnly:true,state});
  }
  if(req.method==='POST'&&url.pathname==='/backup/create'){
    const staff=requireStaffPermission(req,res,'reports');if(!staff)return;
    const db=process.env.DEXTERS_EPOS_DB||LocalStore.DB_PATH;const target=path.join(ROOT,'backups');const file=BackupRestore.backupDatabase(db,target);return send(res,200,{ok:true,testOnly:true,file});
  }
  if(req.method==='GET'&&url.pathname==='/backups'){
    return send(res,200,{ok:true,testOnly:true,files:BackupRestore.listBackups(path.join(ROOT,'backups'))});
  }
  if(req.method==='GET'&&url.pathname==='/reports/summary'){
    const orders=LocalStore.recentOrders(Number(url.searchParams.get('limit')||1000)),stock=LocalStore.stockSnapshot(1000);
    return send(res,200,{ok:true,testOnly:true,sales:Reports.salesSummary(orders),stock:Reports.stockValuation(stock)});
  }
  if(req.method==='POST'&&url.pathname==='/support/bundle'){
    const data=SupportDiagnostics.snapshot(ROOT,{integrations:IntegrationGateway.allStates(),local:LocalStore.stats()});const file=SupportDiagnostics.writeBundle(ROOT,data);return send(res,200,{ok:true,testOnly:true,file});
  }
  if(req.method==='GET'&&url.pathname==='/customer-display/state'){
    return send(res,200,{ok:true,testOnly:true,state:customerDisplayState});
  }
  if(req.method==='POST'&&url.pathname==='/customer-display/state'){
    const b=await body(req);customerDisplayState={...customerDisplayState,...b,updatedAt:new Date().toISOString()};return send(res,200,{ok:true,testOnly:true});
  }
  if(req.method==='GET'&&url.pathname==='/builder/state'){
    return send(res,200,{ok:true,testOnly:true,builder:OpenAIBuilder.state()});
  }
  if(req.method==='POST'&&url.pathname==='/builder/chat'){
    const b=await body(req);const result=await OpenAIBuilder.ask(b.message,b.context||{});return send(res,200,{ok:true,testOnly:true,result});
  }
  if(req.method==='GET'&&url.pathname==='/customer/360'){
    return send(res,200,{ok:true,testOnly:true,profile:LocalStore.customer360(url.searchParams.get('q')||'')});
  }
  if(req.method==='POST'&&url.pathname==='/delivery/lookup'){
    const b=await body(req),address=DeliveryLookup.buildAddressPlan(b);
    const zones=Array.isArray(b.zones)?b.zones:[
      {name:'Local',postcodePrefixes:['G1','G2','G3','G4'],feePence:250,minimumOrderPence:1000,estimatedMinutes:35}
    ];
    return send(res,200,{ok:true,testOnly:true,address,quote:DeliveryLookup.localZoneQuote(address.postcode,zones),maps:IntegrationGateway.connectorState('google_maps')});
  }
  if(req.method==='POST'&&url.pathname==='/marketplace/normalise'){
    const b=await body(req);return send(res,200,{ok:true,testOnly:true,order:MarketplaceAdapters.inbound(b.source,b.payload||{})});
  }
  if(req.method==='POST'&&url.pathname==='/marketplace/dry-run'){
    const b=await body(req);return send(res,200,{ok:true,testOnly:true,result:MarketplaceAdapters.sandboxDispatch(b.source,b.action,b.payload||{})});
  }
  if(req.method==='GET'&&url.pathname==='/local/customers'){
    return send(res,200,{ok:true,customers:LocalStore.searchCustomers(url.searchParams.get('q')||'',Number(url.searchParams.get('limit')||50))});
  }
  if(req.method==='POST'&&url.pathname==='/local/customer'){
    const b=await body(req);const id=LocalStore.saveCustomer(b.customer||{});LocalStore.audit(b.staffId||null,'customer.save','customer',id,{source:'test-epos'});return send(res,200,{ok:true,id});
  }
  if(req.method==='POST'&&url.pathname==='/test/incoming-call'){
    const b=await body(req);const call={id:'test-call-'+Date.now(),call_id:'test-call-'+Date.now(),caller_number:String(b.number||''),customer_name:String(b.name||''),caller_type:String(b.callerType||'unknown'),event_type:'incoming',received_at:new Date().toISOString(),customer:b.customer||{name:String(b.name||''),phone:String(b.number||'')}};const id=LocalStore.saveCall(call);return send(res,200,{ok:true,testOnly:true,id,call});
  }
  if(req.method==='GET'&&url.pathname==='/local/orders'){
    return send(res,200,{ok:true,orders:LocalStore.recentOrders(Number(url.searchParams.get('limit')||50))});
  }
  if(req.method==='POST'&&url.pathname==='/local/order'){
    const staff=requireStaffPermission(req,res,'sale');if(!staff)return;
    const b=await body(req);const id=LocalStore.saveOrder(b.order||{});LocalStore.audit(b.staffId||null,'order.save','order',id,{source:'test-epos'});return send(res,200,{ok:true,id});
  }
  if(req.method==='POST'&&url.pathname==='/local/queue'){
    const b=await body(req);const id=LocalStore.queue(b.connector,b.action,b.entityId,b.payload);return send(res,200,{ok:true,id,summary:LocalStore.queueSummary()});
  }
  if(req.method==='GET'&&url.pathname==='/ai/state'){
    return send(res,200,{ok:true,assistant:DexterAI.state()});
  }
  if(req.method==='POST'&&url.pathname==='/ai/chat'){
    const b=await body(req);try{return send(res,200,{ok:true,...await DexterAI.chat(b.message,b.context||{})})}catch(e){return send(res,409,{ok:false,error:e.message})}
  }
  if(req.method==='GET'&&url.pathname==='/integrations'){
    return send(res,200,{ok:true,testOnly:true,connectors:IntegrationGateway.allStates(),config:IntegrationGateway.safeConfig()});
  }
  if(req.method==='POST'&&url.pathname==='/phone/session'){
    const b=await body(req);const session=PhoneOrders.makePhoneOrderSession(b.call||{});return send(res,200,{ok:true,session,card:PhoneOrders.callerCard(session)});
  }
  if(req.method==='POST'&&url.pathname==='/phone/fulfilment'){
    const b=await body(req);const session=PhoneOrders.chooseFulfilment(b.session||{},b.mode);return send(res,200,{ok:true,session,orderDraft:PhoneOrders.toOrderDraft(session)});
  }
  if(req.method==='POST'&&url.pathname==='/phone/lookup-plan'){
    const b=await body(req);return send(res,200,{ok:true,...IntegrationGateway.phoneLookupPlan(b.number)});
  }
  if(req.method==='POST'&&url.pathname==='/orders/normalise'){
    const b=await body(req);return send(res,200,{ok:true,order:IntegrationGateway.normaliseOrder(b.source,b.payload||{})});
  }
  if(url.pathname==='/health'){
    const p=await printerStatus(cfg.printer?.name);return send(res,200,{ok:true,service:'Dexters Windows Hub',runtime:'node',version:BUILD_VERSION,siteId:cfg.siteId,deviceId:cfg.deviceId,deviceName:cfg.deviceName,hostname:os.hostname(),platform:process.platform,node:process.version,printer:{configured:cfg.printer?.name||null,connected:!!p,status:p},offlineQueue:queueCount(),integrations:{whatsapp:{enabled:!!cfg.apps?.whatsapp?.enabled},bonline:{enabled:!!cfg.apps?.bonline?.enabled},square:{enabled:!!cfg.apps?.square?.enabled,mode:cfg.apps?.square?.mode||null}},timestamp:new Date().toISOString()});
  }
  if(req.method==='POST'&&url.pathname==='/apps/launch'){
    const b=await body(req),name=String(b.name||'');const app=cfg.apps?.[name];if(!app?.enabled)return send(res,409,{ok:false,error:'Integration disabled'});
    if(name==='square')return send(res,200,{ok:true,launched:'square',mode:app.mode||'bridge',bridgeUrl:app.bridgeUrl||null});
    launch(app.command,app.arguments||'');log('app-launch '+name);return send(res,200,{ok:true,launched:name});
  }
  if(req.method==='GET'&&url.pathname==='/hardware/printers'){
    const staff=requireStaffPermission(req,res,'integration_admin');if(!staff)return;
    try{
      const out=await runPS("Get-Printer | Select-Object Name,PrinterStatus,DriverName,PortName,WorkOffline | ConvertTo-Json -Compress");
      let printers=JSON.parse(out||'[]');if(!Array.isArray(printers))printers=[printers];
      return send(res,200,{ok:true,testOnly:true,printers});
    }catch(e){return send(res,409,{ok:false,error:e.message})}
  }
  if(req.method==='GET'&&url.pathname==='/payments/state'){
    return send(res,200,{ok:true,testOnly:true,payments:PaymentGateway.state()});
  }
  if(req.method==='POST'&&url.pathname==='/payments/square'){
    const staff=requireStaffPermission(req,res,'sale');if(!staff)return;
    const b=await body(req);
    try{return send(res,200,{ok:true,result:await PaymentGateway.squareCharge(Number(b.amountPence||0),b.reference||'')})}
    catch(e){return send(res,409,{ok:false,error:e.message})}
  }
  if(req.method==='POST'&&url.pathname==='/hardware/action'){
    const staff=requireStaffPermission(req,res,'integration_admin');if(!staff)return;
    const b=await body(req),action=String(b.action||''),printer=cfg.printer?.name||'';
    const p=await printerStatus(printer);
    if(!p)return send(res,409,{ok:false,error:'Configured receipt printer is not available on this device'});
    try{
      if(action==='test-print'){HardwareService.testReceipt(printer);LocalStore.audit(staff.staff_id,'hardware.test_print','printer',printer,{});return send(res,200,{ok:true,action,message:'Test receipt sent to '+printer})}
      if(action==='open-drawer'){HardwareService.openDrawer(printer,Number(cfg.printer?.drawerPulsePin||0));LocalStore.audit(staff.staff_id,'hardware.open_drawer','printer',printer,{});return send(res,200,{ok:true,action,message:'Drawer pulse sent through '+printer})}
      return send(res,400,{ok:false,error:'Unknown hardware action'});
    }catch(e){return send(res,409,{ok:false,error:e.message})}
  }
  if(req.method==='POST'&&url.pathname==='/hardware/receipt'){
    const staff=requireStaffPermission(req,res,'sale');if(!staff)return;
    const b=await body(req),printer=cfg.printer?.name||'';
    const p=await printerStatus(printer);
    if(!p)return send(res,409,{ok:false,error:'Configured receipt printer is not available on this device'});
    try{
      HardwareService.printReceipt(printer,String(b.text||''),b.openDrawer===true,Number(cfg.printer?.drawerPulsePin||0));
      LocalStore.audit(staff.staff_id,'hardware.receipt','printer',printer,{openDrawer:b.openDrawer===true,orderId:b.orderId||''});
      return send(res,200,{ok:true,printed:true,drawerPulsed:b.openDrawer===true});
    }catch(e){return send(res,409,{ok:false,error:e.message})}
  }
  if(req.method==='POST'&&url.pathname==='/queue'){
    const b=await body(req);queue(b);return send(res,200,{ok:true,queued:true,count:queueCount()});
  }
  if(url.pathname==='/diagnostics'){
    let logTail='';try{logTail=fs.readFileSync(LOG_PATH,'utf8').split(/\r?\n/).slice(-40).join('\n');}catch{}
    return send(res,200,{ok:true,configPath:CONFIG_PATH,logPath:LOG_PATH,queuePath:QUEUE_PATH,queueCount:queueCount(),logTail});
  }
  return send(res,404,{ok:false,error:'Not found'});
}
const seededDrinks=seedPreloadedFile(PRELOADED_DRINKS,'drinks');const seededSnacks=seedPreloadedFile(PRELOADED_SNACKS,'snacks');const seededAlcohol=seedPreloadedFile(PRELOADED_ALCOHOL,'alcohol');const cfg=loadConfig();const port=Number(cfg.listenPort||17654);
const server=http.createServer((req,res)=>Promise.resolve(handle(req,res)).catch(e=>{log('ERROR '+(e.stack||e.message));send(res,500,{ok:false,error:e.message});}));
server.listen(port,'127.0.0.1',()=>log('DextersHub Node started on 127.0.0.1:'+port));
process.on('uncaughtException',e=>log('UNCAUGHT '+(e.stack||e.message)));
process.on('unhandledRejection',e=>log('UNHANDLED '+String(e)));
