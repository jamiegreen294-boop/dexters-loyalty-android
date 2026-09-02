const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.DEXTERS_QA_MODULES+'/\x40electric-sql/pglite');
const ID=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const root=path.join(__dirname,'../..');
async function createDb(storage){
 const db=new PGlite(storage);await db.exec(fs.readFileSync(__dirname+'/schema.sql','utf8'));await db.exec(fs.readFileSync(__dirname+'/existing-functions.sql','utf8'));await db.exec(fs.readFileSync(root+'/supabase/sql/universal-qr.sql','utf8'));
 await db.query("insert into profiles values ($1,'Test Customer','123456','customer'),($2,'Test Staff','654321','staff'),($3,'Other Customer','111111','customer')",[ID(1),ID(2),ID(3)]);
 await db.query('insert into loyalty_accounts(user_id,stamps) values ($1,4)',[ID(1)]);await db.query('insert into loyalty_points_accounts(user_id,points) values ($1,1000)',[ID(1)]);
 await db.query("insert into loyalty_menu_categories values ($1,'Chicken Tenders'),($2,'Dexter’s Street Subs')",[ID(10),ID(11)]);
 await db.query("insert into loyalty_menu_items values ($1,$2,'Chicken Tenders'),($3,$4,'Chicken Mayo Melt')",[ID(20),ID(10),ID(21),ID(11)]);
 await db.query("insert into spin_wheel_spins(id,user_id,prize_name,is_win) values ($1,$2,'Chicken Tenders',true)",[ID(30),ID(1)]);
 await db.query("insert into loyalty_points_redemptions(id,user_id,item_name,category_name,points_cost,status) values ($1,$2,'Chicken Mayo Melt','Dexter’s Street Subs',650,'pending'),($3,$2,'Another reward','Hot Rolls',650,'pending')",[ID(31),ID(1),ID(34)]);
 await db.query("insert into loyalty_deal_claims(id,customer_id,deal_key,expires_at) values ($1,$2,'yearly-2026-09-back-to-routine',now()+interval '1 day'),($3,$2,'yearly-2026-09-back-to-routine',now()-interval '1 day')",[ID(32),ID(1),ID(33)]);
 await db.query("insert into customer_individual_offers(id,customer_id,title,reward_value,status) values ($1,$2,'Free Sub','Chicken Mayo Melt','active')",[ID(35),ID(1)]);
 await db.query("select set_config('test.actor',$1,false)",[ID(2)]);
 return db;
}
async function rpc(db,action,raw='',request=null,amount=null){const r=await db.query('select public.universal_qr_action($1,$2,$3,$4) result',[action,raw,request,amount]);return r.rows[0].result;}
async function run(){
 const storage=fs.mkdtempSync(require('os').tmpdir()+'/dexters-qr-db-');const db=await createDb(storage);let checks=0;const check=(value,msg)=>{assert(value,msg);checks++;};
 let d=await rpc(db,'lookup','DEXTERS:123456');check(d.stamps===4&&d.points===1000,'Customer lookup');
 await db.exec('set role anon');await assert.rejects(()=>rpc(db,'lookup','123456'),/permission denied/);checks++;await db.exec('reset role');
 await db.query("select set_config('test.actor',$1,false)",[ID(1)]);await assert.rejects(()=>rpc(db,'lookup','123456'),/Staff access/);checks++;
 d=await rpc(db,'wallet');check(d.rewards.length===3,'Wallet only current customer rewards');
 await db.query("select set_config('test.actor',$1,false)",[ID(3)]);d=await rpc(db,'wallet');check(d.rewards.length===0,'Wallet ownership');
 await db.query("select set_config('test.actor',$1,false)",[ID(2)]);
 await db.exec("set role authenticated");
 d=await rpc(db,'points','123456',ID(100),'12.80');check(d.points_added===12&&d.points===1012,'Full-pound award');
 d=await rpc(db,'points','123456',ID(100),'12.80');check(d.points===1012,'Retry awards once');
 await assert.rejects(()=>rpc(db,'points','123456',ID(100),'13'),/another action/);checks++;
 for(const amount of [0,-1,10001,1.001]){await assert.rejects(()=>rpc(db,'points','123456',ID(101),amount),/Invalid order/);checks++;}
 for(const raw of ['evil123456','DEXTERS:123456<script>','DEXTERS_POINTS:no','https://example.test/123456']){await assert.rejects(()=>rpc(db,'lookup',raw),/Invalid/);checks++;}
 d=await rpc(db,'lookup','DEXTERS_SPIN:'+ID(30));check(d.category==='Chicken Tenders'&&d.item==='Chicken Tenders','Authoritative spin category');
 d=await rpc(db,'lookup','DEXTERS_DEAL:'+ID(32));check(d.category==='Dexter’s Street Subs'&&d.item.includes('Chips'),'Existing deal category/items');
 d=await rpc(db,'lookup','DEXTERS-OFFER:'+ID(35));check(d.category==='Dexter’s Street Subs','Legacy offer QR compatibility');
 d=await rpc(db,'lookup','DEXTERS_DEAL:'+ID(33));check(d.status==='expired','Expired deal blocked');
 d=await rpc(db,'redeem','DEXTERS_DEAL:'+ID(33),ID(103));check(d.ok===false,'Expired redemption blocked');
 // Cancel means lookup only: database unchanged.
 await rpc(db,'lookup','DEXTERS_POINTS:'+ID(31));d=await rpc(db,'lookup','DEXTERS_POINTS:'+ID(31));check(d.status==='valid','Preview does not redeem');
 const results=await Promise.all([rpc(db,'redeem','DEXTERS_POINTS:'+ID(31),ID(104)),rpc(db,'redeem','DEXTERS_POINTS:'+ID(31),ID(105))]);
 check(results.filter(x=>x.ok).length===1,'Competing redemption requests accepted once');
 d=await rpc(db,'lookup','123456');check(d.points===362,'Deduct exactly 650 points');
 await assert.rejects(()=>rpc(db,'redeem','DEXTERS_POINTS:'+ID(34),ID(106)),/enough points/);checks++;
 d=await rpc(db,'lookup','DEXTERS_POINTS:'+ID(34));check(d.status==='valid','Insufficient-balance error rolls back');
 for(const kind of ['SPIN','DEAL','OFFER']){const n={SPIN:30,DEAL:32,OFFER:35}[kind];d=await rpc(db,'redeem','DEXTERS_'+kind+':'+ID(n),ID(n+100));check(d.ok,kind+' redeems');d=await rpc(db,'redeem','DEXTERS_'+kind+':'+ID(n),ID(n+200));check(!d.ok,kind+' replay blocked');}
 d=await rpc(db,'stamp','123456',ID(300));d=await rpc(db,'stamp','123456',ID(300));check(d.stamps===5,'Stamp retry only adds one');
 for(let n=0;n<4;n++)await rpc(db,'stamp','123456',ID(301+n));
 await assert.rejects(()=>rpc(db,'stamp','123456',ID(309)),/redeem first/);checks++;
 await db.exec('reset role');await db.query("select set_config('test.actor',$1,false)",[ID(1)]);
 d=await rpc(db,'wallet');const coffee=d.rewards.find(x=>x.kind==='coffee');check(!!coffee,'Ninth stamp issues real coffee reward');
 await db.query("select set_config('test.actor',$1,false)",[ID(2)]);d=await rpc(db,'redeem',coffee.raw,ID(310));check(d.ok,'Coffee redeem resets stamps');
 d=await rpc(db,'lookup','123456');check(d.stamps===0,'Coffee balance reset');
 for(let n=0;n<9;n++)await rpc(db,'stamp','123456',ID(320+n));
 d=await rpc(db,'redeem',coffee.raw,ID(340));check(!d.ok,'Old coffee QR cannot redeem next stamp cycle');
 await db.query("select set_config('test.denied','add_stamps',false)");await assert.rejects(()=>rpc(db,'stamp','123456',ID(350)),/Not authorised/);checks++;
 // Persistence across SQL connections is represented by repeated transactions; PGlite is a single-connection engine.
 await db.close();const restarted=new PGlite(storage);await restarted.query("select set_config('test.actor',$1,false)",[ID(2)]);d=await rpc(restarted,'lookup','DEXTERS_SPIN:'+ID(30));check(d.status==='used','Used QR remains blocked after database restart');await restarted.close();fs.rmSync(storage,{recursive:true,force:true});console.log('PASS '+checks+' database checks; real existing redemption functions plus new QR SQL.');
}
module.exports={createDb,rpc,ID};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
