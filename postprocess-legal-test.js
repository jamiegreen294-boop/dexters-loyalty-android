const fs=require('fs');
const legalFiles=[
  'legal.css',
  'legal.html',
  'privacy.html',
  'cookie-policy.html',
  'terms.html',
  'allergens.html',
  'complaints.html',
  'spin-to-win-terms.html',
  'rewards-promo-terms.html',
  'sunday-roast-policy.html',
  'staff-compliance.html',
  'catering.html'
];
for(const f of legalFiles) fs.copyFileSync('web/'+f,'dist/'+f);

const catering=`<section id="dextersCateringHome" style="max-width:700px;margin:18px auto;padding:0 18px"><div class="card" style="border:1px solid #ffd43b55;background:linear-gradient(145deg,rgba(255,212,59,.10),rgba(255,138,0,.04));text-align:left"><div style="display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap"><div style="min-width:0;flex:1"><div style="font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#ffd43b">Catering & Events</div><h2 style="margin:5px 0 7px">Feeding a team, party or event?</h2><p class="muted" style="margin:0">Choose from Dexter’s current menu for meetings, parties, team meals and events. Catering orders require at least <strong>48 hours’ notice</strong> and are confirmed subject to availability.</p></div><div style="font-size:36px" aria-hidden="true">🍽️</div></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><a class="btn" href="/catering.html" style="text-decoration:none">Catering & Events</a><a class="btn secondary" href="https://wa.me/441414735249?text=Hi%20Dexter%20AI%2C%20I%27d%20like%20to%20ask%20about%20catering" style="text-decoration:none">Ask Dexter on WhatsApp</a></div><p class="muted" style="font-size:12px;margin:10px 0 0">For allergies or intolerances, check our allergen information before confirming an order.</p></div></section>`;

const footer=`<section id="dextersCustomerInfo" style="max-width:700px;margin:18px auto 110px;padding:0 18px"><div class="card" style="text-align:center"><h2>Customer information</h2><p class="muted">Food safety, privacy, rewards, complaints and ordering information.</p><p style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><a href="/legal.html"><strong>Legal & Policies</strong></a><a href="/allergens.html">Allergen information</a><a href="/privacy.html">Privacy & data protection</a><a href="/cookie-policy.html">Cookies & local storage</a><a href="/terms.html">Terms & conditions</a><a href="/spin-to-win-terms.html">Spin to Win terms</a><a href="/rewards-promo-terms.html">Receipt reward terms</a><a href="/sunday-roast-policy.html">Sunday Roast policy</a><a href="/complaints.html">Complaints</a><a href="/catering.html">Catering & Events</a></p></div></section>`;

const staffCompliance=`<script id="dextersStaffComplianceLink">(function(){function add(){var page=document.getElementById('staffPage');if(!page||document.getElementById('dextersStaffComplianceCard'))return;var card=document.createElement('div');card.className='card';card.id='dextersStaffComplianceCard';card.innerHTML='<h2>⚖️ Legal & Compliance</h2><p class="muted">Staff checklist for allergens, customer rights, UK GDPR, promotions, refunds and security.</p><a class="btn" href="/staff-compliance.html" style="display:inline-block;text-decoration:none">Open staff compliance checklist</a>';page.appendChild(card)}add();setTimeout(add,300);setTimeout(add,1200);new MutationObserver(function(){setTimeout(add,0)}).observe(document.body,{childList:true,subtree:true})})();</script>`;

let p='dist/index.html',s=fs.readFileSync(p,'utf8');
if(!s.includes('id="dextersCateringHome"'))s=s.replace('</body>',catering+'</body>');
if(!s.includes('id="dextersCustomerInfo"'))s=s.replace('</body>',footer+'</body>');
if(!s.includes('id="dextersStaffComplianceLink"'))s=s.replace('</body>',staffCompliance+'</body>');
fs.writeFileSync(p,s);

function addNotice(file){
  if(!fs.existsSync(file))return;
  let h=fs.readFileSync(file,'utf8');
  if(h.includes('dextersAllergenNotice'))return;
  const n=`<section id="dextersAllergenNotice" class="card" style="border-left:4px solid #ffd43b"><h2>Allergy or intolerance?</h2><p>Check <a href="/allergens.html">Dexter’s allergen information</a> <strong>before completing your order</strong>. If the item-specific information you need is not shown, call <a href="tel:+441414735249">0141 473 5249</a> or contact Dexter’s before ordering so the current written allergen information can be checked. Staff must never guess.</p></section>`;
  h=h.replace('</main>',n+'</main>');
  fs.writeFileSync(file,h);
}
addNotice('dist/collection-order-test.html');
addNotice('dist/sunday/customer.html');

for(const f of legalFiles){
  if(!fs.existsSync('dist/'+f)) throw new Error('Missing legal build output: '+f);
}
if(!s.includes('/staff-compliance.html')) throw new Error('Missing staff compliance link');
console.log('Added customer legal, staff compliance, allergen, promotion and catering information');