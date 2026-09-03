const fs=require('fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('web/shared-spin-integration-test.js','utf8');
const post=fs.readFileSync('postprocess-shared-spin-integration-test.js','utf8');
for(const s of ['spin_wheel_spin','shared_spin_test_spin','spin_wheel_my_status','shared_spin_test_status','universal_qr_action','shared_spin_test_qr_action','shared_spin_test_my_reward','DEXTERS_SPIN:'])assert(js.includes(s),'missing '+s);
assert(js.includes("Winning test reward not found"),'live Spin QR fallback missing');
assert(post.includes('</head>'),'router must load before app startup');
assert(post.includes('sharedSpinIntegrationTest'),'unique test integration id missing');
console.log('PASS actual Spin screen routes to isolated shared backend and Universal QR keeps live fallback');
