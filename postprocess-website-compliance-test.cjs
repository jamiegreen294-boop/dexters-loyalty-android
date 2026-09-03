const fs=require('fs');
const p='dist/website-test.html';
if(!fs.existsSync(p)) process.exit(0);
let s=fs.readFileSync(p,'utf8');

s=s.replace('The exact trading address will only be added once the correct version has been confirmed.','10a Dundasvale Court, Glasgow, G4 0JS');

if(!s.includes('id="dexterAi"')){
 const ai=`<section class="section" id="dexterAi"><div class="wrap"><div class="eyebrow">Dexter AI on WhatsApp</div><h2>Ask Dexter more than just what’s on the menu.</h2><div class="grid3"><article class="card"><h3>💬 Food & Dexter’s help</h3><p>Ask about the menu, collection, catering, rewards and general Dexter’s information. For allergens, payments or order confirmation, always use the current written information or a member of the Dexter’s team.</p></article><article class="card"><h3>😂 Jokes, stories & games</h3><p>Dexter can tell jokes and stories, play simple chat games, answer general-knowledge questions and have a bit of banter.</p></article><article class="card"><h3>👻 Horror mode</h3><p>Ask for spooky stories, creepy tales and Halloween chat when you’re in the mood for something darker.</p></article></div><div class="card" style="margin-top:15px;border-color:#ffd36d55"><h3>⚠ The 9pm warning</h3><p><strong>After 9pm Dexter gets very sarcastic. You have been warned.</strong> 😈</p><p style="font-size:13px">That warning is a joke, not a service restriction. Important food-safety, allergen, payment and order information should still be treated seriously.</p><a class="btn" href="https://wa.me/441414735249">Chat with Dexter on WhatsApp</a></div></div></section>`;
 s=s.replace('<section class="section" id="legal">',ai+'<section class="section" id="legal">');
}

if(!s.includes('Copyright & site use')){
 s=s.replace('</div></footer>',`<p><strong>Dundasvale Cafe Ltd</strong> · Company No. SC686266 · Registered office: 10a Dundasvale Court, Glasgow, Scotland, G4 0JS.</p><p>© ${new Date().getFullYear()} Dundasvale Cafe Ltd trading as Dexter’s. Dexter’s branding, original text, graphics and site code are used by or for Dexter’s. Third-party trade marks remain the property of their respective owners. No third-party photos or creative content should be copied or reused without permission or an applicable licence.</p><p><a style="color:inherit" href="/privacy.html">Privacy</a> · <a style="color:inherit" href="/terms.html">Terms</a> · <a style="color:inherit" href="/allergens.html">Allergens</a> · <a style="color:inherit" href="/rewards-promo-terms.html">Promotion terms</a> · <strong>Copyright & site use</strong></p></div></footer>`);
}

if(!s.includes('id="cookieLawNote"')){
 s=s.replace('</main>',`<section class="section" id="cookieLawNote"><div class="wrap"><div class="card"><h2>Cookies & privacy</h2><p>This test site is designed to work without advertising or behavioural-tracking cookies. If Dexter’s later adds optional analytics, advertising or similar non-essential technologies, they must stay off until the visitor has made an appropriate consent choice. Necessary login/security storage may still be used for features that require it.</p><a class="btn alt" href="/privacy.html">Privacy & data protection</a></div></div></section></main>`);
}

fs.writeFileSync(p,s);
console.log('Added website interaction, business disclosure, copyright and cookie-law test content');
