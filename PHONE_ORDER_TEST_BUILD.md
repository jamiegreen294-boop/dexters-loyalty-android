# Dexter's Phone Order System — Test Build

Branch: `test-phone-call-order-system-20260909`

## Already built in this test
- Call history and missed-call/callback workflow
- Caller-number customer matching logic
- Registered-customer and guest-caller flows
- Transcript entry area and simple order detection prototype
- Draft order editor with quantities/modifiers
- Mandatory staff confirmation before kitchen ticket creation
- Printable telephone-order ticket preview
- Draft database schema for calls, transcripts, recordings and telephone orders
- Recording/transcription fields kept separate so audio can remain disabled if bOnline/SIP does not permit access

## Shop setup remaining
1. Put the Yealink T31P on the Virgin router/LAN and obtain its local IP.
2. Open the Yealink web interface and check Action URL/Action URI/SIP event settings.
3. Configure supported call events to a Dexter's HTTPS endpoint.
4. Verify which events include caller ID, answered/missed/end state and extension.
5. Separately verify an authorised audio path. Call events alone do not provide call audio.
6. If audio is available, connect local/on-prem speech-to-text and send transcript segments to the draft-order parser.
7. Connect confirmed orders to the existing KDS/receipt route.
8. Apply the SQL only after validating the final customer-table foreign key and staff access model.
9. Add the required call-recording/transcription notice and retention controls before enabling audio storage.

## Safety rule
AI must never auto-send a telephone order to the kitchen solely from speech recognition. Staff confirmation remains required.
