export function matchesRequest(payment: any, request: any, location: string): boolean {
  return payment?.status === 'COMPLETED' && payment?.amount_money?.currency === 'GBP' &&
    Number.isSafeInteger(payment?.amount_money?.amount) && payment.amount_money.amount === request.amount_pence &&
    payment.reference_id === request.id && payment.location_id === location;
}
export function finalStatus(body: any): string {
  if (body.approved === true) return 'approved';
  return /CANCEL/i.test(String(body.error_code || '')) ? 'cancelled' : 'failed';
}
