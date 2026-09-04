(function(global){
  "use strict";

  function normaliseSlug(value){
    return String(value||"").trim().toLowerCase().replace(/[^a-z0-9-]/g,"").replace(/^-+|-+$/g,"");
  }

  function createTenantContext(config){
    if(!config || !config.id) throw new Error("Business configuration requires an id");
    const businessId = String(config.databaseBusinessId || "").trim();
    const slug = normaliseSlug(config.id);

    return Object.freeze({
      slug,
      businessId,
      config:Object.freeze({...config}),
      isReady(){ return Boolean(businessId); },
      assertReady(){
        if(!businessId) throw new Error("This business has not been provisioned in the database yet");
      },
      scopeQuery(query){
        this.assertReady();
        return query.eq("business_id", businessId);
      },
      stampInsert(row){
        this.assertReady();
        return {...row,business_id:businessId};
      },
      matches(row){
        return Boolean(row && row.business_id===businessId);
      }
    });
  }

  global.WhiteLabelTenant={normaliseSlug,createTenantContext};
})(window);
