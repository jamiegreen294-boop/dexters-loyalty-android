const fs=require('fs');
const p='dist/index.html';
let s=fs.readFileSync(p,'utf8');
s=s.replace('Bought in Dexter’s? Scan the one-time QR printed on your receipt to add your reward points.','For eligible orders placed through the Dexter’s Loyalty App only. If your points were not added automatically when the order was marked Collected, scan the one-time QR printed on your receipt.');
s=s.replace('1 point for every full £1 spent. Each receipt QR can only be claimed once.','1 point for every full £1 spent on eligible Dexter’s Loyalty App orders. If points were already added automatically, scanning the QR will show “Points already collected for this order.” Each order can only receive its points once.');
s=s.replace('Use the QR printed at the bottom of your Dexter’s receipt.','Use the QR printed at the bottom of your eligible Dexter’s Loyalty App order receipt.');
s=s.replace('Scan the QR printed on your Dexter’s receipt.','Scan the QR printed on your eligible Dexter’s Loyalty App order receipt.');
fs.writeFileSync(p,s);
console.log('Updated receipt points wording for app-only fallback');