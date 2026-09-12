const fs=require('fs');
const js=fs.readFileSync('web/pos-money-owed.js','utf8');
const must=[
 'credit_search_customers','credit_account_detail','credit_create_customer','credit_add_charge','credit_record_payment',
 'accounts@dextersspot.co.uk','mailto:','https://wa.me/','Money Owed'
];
for(const s of must){if(!js.includes(s))throw new Error('Missing Money Owed integration marker: '+s)}
const post=fs.readFileSync('postprocess-pos-money-owed.cjs','utf8');
if(!post.includes('pos-money-owed.js'))throw new Error('POS injector missing Money Owed script');
console.log('Money Owed POS checks passed');
