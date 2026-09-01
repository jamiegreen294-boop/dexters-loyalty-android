// Test-only direct printer queue hook for Sunday customer tickets.
// Keeps the visible KDS layout unchanged; it only replaces the browser print action.
async function printCustomerOrder(id){
  const o=lastAll.find(x=>x.id===id);
  if(!o){alert('Customer order not found. Refresh and try again.');return}
  const number='SR-'+String(o.order_number).padStart(3,'0');
  try{
    const d=await sapi({action:'print_customer_order',id:o.id});
    if(!d?.queued)throw Error('Printer did not accept the ticket.');
    alert(number+' sent to the existing Epson printer queue.');
  }catch(e){
    alert('Could not send '+number+' to the Epson printer: '+(e?.message||e));
  }
}
