const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">Live checkout is not configured yet.</div>;
  }
  if (clientToken.startsWith("pk_test_")) {
    return <div className="w-full border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">Payments in this preview are tests. No real money will move.</div>;
  }
  return null;
}