import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { matchesRequest, finalStatus } from '../../supabase/functions/dexters-checkout-sdk/validation.ts';
const request = { id: 'request-123', amount_pence: 1499 };
const payment = { status: 'COMPLETED', amount_money: { amount: 1499, currency: 'GBP' }, reference_id: request.id, location_id: 'location-1' };
test('approve only a completed Square payment matching the exact request', () => {
  assert.equal(matchesRequest(payment, request, 'location-1'), true);
  for (const changed of [
    { ...payment, status: 'APPROVED' },
    { ...payment, status: 'PENDING' },
    { ...payment, location_id: 'different-location' },
    { ...payment, reference_id: 'different-request' },
    { ...payment, amount_money: { amount: 999, currency: 'GBP' } },
    { ...payment, amount_money: { amount: 1499, currency: 'USD' } },
    { ...payment, amount_money: { amount: '1499', currency: 'GBP' } },
    null,
  ]) assert.equal(matchesRequest(changed, request, 'location-1'), false);
});
test('only boolean true approves; cancellation remains separate from failure', () => {
  assert.equal(finalStatus({ approved: true }), 'approved');
  assert.equal(finalStatus({ approved: 'true' }), 'failed');
  assert.equal(finalStatus({ error_code: 'PAYMENT_CANCELED' }), 'cancelled');
  assert.equal(finalStatus({ error_code: 'CARD_DECLINED' }), 'failed');
});
