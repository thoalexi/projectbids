import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";

function SetupForm({ onReady }: { onReady: (setupIntentId: string) => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const result = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
    if (result.error) {
      setError(result.error.message ?? "That payment method could not be saved.");
      setBusy(false);
      return;
    }
    if (!result.setupIntent || result.setupIntent.status !== "succeeded") {
      setError("The payment method is not ready yet. Please try again.");
      setBusy(false);
      return;
    }
    try {
      await onReady(result.setupIntent.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your bid could not be submitted.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!stripe || busy} className="w-full">
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        {busy ? "Saving and submitting…" : "Save card & submit bid"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Your card is stored securely by our payment provider. Beam Bids never sees the card number.</p>
    </form>
  );
}

export function PaymentMethodSetup({ clientSecret, onReady }: { clientSecret: string; onReady: (setupIntentId: string) => Promise<void> }) {
  return (
    <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "stripe" } }}>
      <SetupForm onReady={onReady} />
    </Elements>
  );
}