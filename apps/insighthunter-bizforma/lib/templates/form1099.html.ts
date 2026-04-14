export function form1099Template(payeeName: string, amount: string) {
  return `<!doctype html><html><body><h1>Form 1099 Summary</h1><p>Payee: ${payeeName}</p><p>Amount: ${amount}</p></body></html>`;
}
