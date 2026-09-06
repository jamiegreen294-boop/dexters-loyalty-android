window.DEXTERS_CONFIG = Object.freeze({
  supabaseUrl: 'https://bpnkouymdvcogeaqjmxl.supabase.co',
  supabasePublishableKey: 'sb_publishable_v6rJbF4IfGZTKtbuQtmsmQ_lS3sXWFa',
  functionBase: 'https://bpnkouymdvcogeaqjmxl.supabase.co/functions/v1',
  routes: {
    collection: '/collection-order-test.html',
    kds: '/kds-order-test.html',
    sunday: '/sunday/customer.html',
    sundayAdmin: '/sunday/admin.html',
    ownerHub: '/hub-test.html',
    adminSettings: '/hub-admin-test.html',
    accounts: '/accounts-test.html',
    foodSafety: 'https://dexters-food-safety.vercel.app',
    recipeCosting: 'https://dexters-recipe-costing.vercel.app',
    staff: '/hub-test.html',
    menuAdmin: '/collection-order-test.html',
    askDexter: 'https://wa.me/'
  },
  functions: {
    collection: 'collection-orders-api',
    collectionAmend: 'collection-order-amend-test-api',
    sunday: 'sunday-roast-api',
    points: 'loyalty-points-api',
    offers: 'customer-offers-admin',
    news: 'app-news-api',
    receiptPoints: 'receipt-points-claim',
    deleteAccount: 'delete-my-account',
    stripeSundayCheckout: 'stripe-sunday-checkout',
    printer: 'printer-api',
    orderIntake: 'order-intake',
    kds: 'dexters-kds'
  },
  featureRules: {
    pointsPerPound: 1,
    pointValuePence: 1,
    coffeeStampsRequired: 9,
    spinDailyLimit: 1,
    spinPrizeExpiryDays: 30,
    sundayAdultPrice: 14.99,
    sundayKidsPrice: 9.99
  }
});
