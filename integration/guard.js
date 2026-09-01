(function(){
 const original=window.fetch.bind(window),upstream='https://bpnkouymdvcogeaqjmxl.supabase.co';
 window.fetch=async function(input,init){const request=new Request(input,init);const url=new URL(request.url,location.href);
 if(url.origin!==upstream)return original(request);
 if(url.pathname==='/functions/v1/collection-orders-test-api')url.pathname='/functions/v1/collection-orders-api';
 const body=['GET','HEAD'].includes(request.method)?undefined:await request.text();
 return original('/api/preview?path='+encodeURIComponent(url.pathname+url.search),{method:request.method,headers:request.headers,body,signal:request.signal,cache:'no-store'});
 };
})();
