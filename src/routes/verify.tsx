import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { BadgeCheck, ImagePlus, LoaderCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ProjectImage } from "@/components/ProjectImage";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { useMyVerification } from "@/lib/verification";
import { confirmVerificationPayment, startVerificationApplication } from "@/lib/verification.functions";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Become a Verified Pro — Beam Bids" },
      { name: "description", content: "Share your past work, reviews and insurance to earn the Verified Pro badge on Beam Bids." },
      { property: "og:title", content: "Become a Verified Pro — Beam Bids" },
      { property: "og:description", content: "Earn the Verified Pro badge and unlock verified-only jobs in Atlanta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

const MAX_PHOTOS = 10;
const MIN_PHOTOS = 3;
const MAX_INSURANCE_IMAGES = 5;

function PayForm({ onPaid }: { onPaid: () => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError("");
    const result = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: window.location.href } });
    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setBusy(false);
      return;
    }
    await onPaid();
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!stripe || busy} className="w-full">
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        {busy ? "Paying…" : "Pay $5 & submit"}
      </Button>
    </form>
  );
}

function CredentialBlock(p: {
  label: string; hint?: string; checked: boolean; onChecked: (v: boolean) => void;
  detail: string; onDetail: (v: string) => void; detailPlaceholder: string; proofTitle: string;
  images: string[]; setImages: (v: string[]) => void; uploading: boolean; onUpload: (f: FileList | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between rounded-lg bg-secondary p-3 ring-1 ring-border">
        <span className="text-sm">{p.label}{p.hint && <span className="block text-xs text-muted-foreground">{p.hint}</span>}</span>
        <Switch checked={p.checked} onCheckedChange={p.onChecked} />
      </label>
      {p.checked && (
        <div className="space-y-2">
          <input value={p.detail} onChange={(e) => p.onDetail(e.target.value)} maxLength={300} placeholder={p.detailPlaceholder} className="field" />
          <p className="text-sm font-medium">{p.proofTitle}</p>
          <p className="text-xs text-muted-foreground">Required — up to {MAX_INSURANCE_IMAGES} images.</p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {p.images.map((img) => (
              <div key={img} className="relative">
                <ProjectImage url={img} alt={p.proofTitle} className="aspect-square w-full" />
                <button type="button" aria-label="Remove image" onClick={() => p.setImages(p.images.filter((x) => x !== img))} className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"><X className="size-3" /></button>
              </div>
            ))}
            {p.images.length < MAX_INSURANCE_IMAGES && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
                {p.uploading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                <input type="file" accept="image/*" multiple className="hidden" disabled={p.uploading} onChange={(e) => p.onUpload(e.target.files)} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VerifyPage() {
  const { user, displayName } = useAuth();
  const { application, status, isLoading, refetch } = useMyVerification();
  const start = useServerFn(startVerificationApplication);
  const confirm = useServerFn(confirmVerificationPayment);
  const [form, setForm] = useState({ businessName: "", trade: "", website: "", googleUrl: "", yelpUrl: "", thumbtackUrl: "", insured: false, insuranceDetails: "", licensed: false, licenseNumber: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [insuranceImages, setInsuranceImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [licenseImages, setLicenseImages] = useState<string[]>([]);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (application) {
      setForm({
        businessName: application.business_name,
        trade: application.trade ?? "",
        website: application.website ?? "",
        googleUrl: application.google_url ?? "",
        yelpUrl: application.yelp_url ?? "",
        thumbtackUrl: application.thumbtack_url ?? "",
        insured: application.insured,
        insuranceDetails: application.insurance_details ?? "",
        licensed: application.licensed,
        licenseNumber: application.license_number ?? "",
      });
      setPhotos(Array.isArray(application.portfolio_images) ? (application.portfolio_images as string[]) : []);
      setInsuranceImages(Array.isArray(application.insurance_images) ? (application.insurance_images as string[]) : []);
      setLicenseImages(Array.isArray(application.license_images) ? (application.license_images as string[]) : []);
    } else if (displayName) setForm((f) => ({ ...f, businessName: f.businessName || displayName }));
  }, [application, displayName]);

  if (!user)
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-display text-3xl">Become a Verified Pro</h1>
        <p className="mt-2 text-muted-foreground">Sign in to apply.</p>
        <Button asChild className="mt-6"><Link to="/auth" search={{ redirect: "/verify" }}>Sign in</Link></Button>
      </main>
    );
  if (isLoading) return <main className="mx-auto max-w-xl px-6 py-16 text-muted-foreground">Loading…</main>;

  async function uploadTo(files: FileList | null, current: string[], max: number, add: (paths: string[]) => void, setBusyFlag: (v: boolean) => void) {
    if (!files || !user) return;
    setBusyFlag(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, max - current.length)) {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { toast.error("Images must be under 10 MB."); continue; }
      const path = `${user.id}/verification/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("project-photos").upload(path, file, { contentType: file.type });
      if (error) toast.error("Couldn't upload an image.");
      else added.push(`storage:${path}`);
    }
    add(added);
    setBusyFlag(false);
  }

  const upload = (files: FileList | null) => uploadTo(files, photos, MAX_PHOTOS, (a) => setPhotos((p) => [...p, ...a]), setUploading);
  const uploadInsurance = (files: FileList | null) => uploadTo(files, insuranceImages, MAX_INSURANCE_IMAGES, (a) => setInsuranceImages((p) => [...p, ...a]), setUploadingInsurance);
  const uploadLicense = (files: FileList | null) => uploadTo(files, licenseImages, MAX_INSURANCE_IMAGES, (a) => setLicenseImages((p) => [...p, ...a]), setUploadingLicense);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName.trim()) return void toast.error("Add your business name");
    if (photos.length < MIN_PHOTOS) return void toast.error(`Add at least ${MIN_PHOTOS} photos of past work`);
    const links = [form.googleUrl, form.yelpUrl, form.thumbtackUrl, form.website].filter((l) => l.trim());
    if (links.some((l) => !/^https:\/\//i.test(l.trim()))) return void toast.error("Links must start with https://");
    if (![form.googleUrl, form.yelpUrl, form.thumbtackUrl].some((l) => l.trim())) return void toast.error("Add at least one Google, Yelp or Thumbtack review link");
    if (form.insured && insuranceImages.length === 0) return void toast.error("Upload your certificate of insurance (up to 5 images)");
    if (form.licensed && !form.licenseNumber.trim()) return void toast.error("Add your license number");
    if (form.licensed && licenseImages.length === 0) return void toast.error("Upload proof of your license (up to 5 images)");
    setBusy(true);
    const res = await start({ data: { ...form, portfolioImages: photos, insuranceImages, licenseImages, environment: getStripeEnvironment() } });
    setBusy(false);
    if ("error" in res && res.error) return void toast.error(res.error);
    if ("submitted" in res) { toast.success("Resubmitted for review."); refetch(); return; }
    if ("clientSecret" in res && res.clientSecret) setSecret(res.clientSecret);
  }

  async function paid() {
    const res = await confirm({ data: { environment: getStripeEnvironment() } });
    if ("error" in res && res.error) { toast.error(res.error); return; }
    setSecret(null);
    toast.success("Payment received — your application is under review.");
    refetch();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
      <h1 className="font-display text-4xl">Become a Verified Pro</h1>
      <p className="mt-2 text-muted-foreground">
        Show homeowners you're the real deal. Our team checks your past work, reviews and insurance. Once approved, the Verified Pro badge shows on every bid and you can bid on verified-only jobs.
      </p>

      {status === "approved" ? (
        <div className="frosted mt-8 flex items-center gap-3 rounded-2xl p-6">
          <BadgeCheck className="size-8 text-primary" />
          <div><p className="font-semibold">You're a Verified Pro</p><p className="text-sm text-muted-foreground">Your badge is live on all your bids.</p></div>
        </div>
      ) : status === "pending_review" ? (
        <div className="frosted mt-8 rounded-2xl p-6">
          <p className="font-semibold">Application under review</p>
          <p className="mt-1 text-sm text-muted-foreground">Thanks — your $5 fee is paid. We'll review your work and reviews, and your badge goes live once approved.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="frosted mt-8 space-y-5 rounded-2xl p-6">
          {status === "rejected" && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm ring-1 ring-destructive/30">
              <p className="font-semibold">Your application needs changes</p>
              {application?.admin_note && <p className="mt-1">{application.admin_note}</p>}
              <p className="mt-1 text-muted-foreground">Update it below and resubmit — no extra fee.</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Business name</span><input value={form.businessName} onChange={set("businessName")} maxLength={120} className="field mt-1.5" /></label>
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Trade</span><input value={form.trade} onChange={set("trade")} maxLength={60} placeholder="Painter" className="field mt-1.5" /></label>
          </div>
          <div>
            <p className="text-sm font-medium">Review links</p>
            <p className="text-xs text-muted-foreground">At least one is required so we can confirm your reviews.</p>
            <div className="mt-2 grid gap-3">
              <input value={form.googleUrl} onChange={set("googleUrl")} placeholder="Google reviews link (https://…)" className="field" />
              <input value={form.yelpUrl} onChange={set("yelpUrl")} placeholder="Yelp link (https://…)" className="field" />
              <input value={form.thumbtackUrl} onChange={set("thumbtackUrl")} placeholder="Thumbtack link (https://…)" className="field" />
              <input value={form.website} onChange={set("website")} placeholder="Business website (optional)" className="field" />
            </div>
          </div>
          <CredentialBlock
            label="I carry general liability insurance"
            checked={form.insured}
            onChecked={(v) => setForm({ ...form, insured: v })}
            detail={form.insuranceDetails}
            onDetail={(v) => setForm({ ...form, insuranceDetails: v })}
            detailPlaceholder="Insurance company & policy number"
            proofTitle="Certificate of insurance"
            images={insuranceImages}
            setImages={setInsuranceImages}
            uploading={uploadingInsurance}
            onUpload={uploadInsurance}
          />
          <CredentialBlock
            label="I hold a state or trade license"
            hint="Optional — many painters, landscapers and handymen don't need one."
            checked={form.licensed}
            onChecked={(v) => setForm({ ...form, licensed: v })}
            detail={form.licenseNumber}
            onDetail={(v) => setForm({ ...form, licenseNumber: v })}
            detailPlaceholder="License number (only our review team sees this)"
            proofTitle="Photo of your license"
            images={licenseImages}
            setImages={setLicenseImages}
            uploading={uploadingLicense}
            onUpload={uploadLicense}
          />
          <div>
            <p className="text-sm font-medium">Photos of past work</p>
            <p className="text-xs text-muted-foreground">At least {MIN_PHOTOS}, up to {MAX_PHOTOS}.</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.map((p) => (
                <div key={p} className="relative">
                  <ProjectImage url={p} alt="Past work" className="aspect-square w-full" />
                  <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((x) => x !== p))} className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"><X className="size-3" /></button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-lg bg-secondary text-muted-foreground ring-1 ring-border">
                  {uploading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
                </label>
              )}
            </div>
          </div>
          <Button type="submit" disabled={busy || uploading || uploadingInsurance || uploadingLicense} className="w-full">
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {status === "rejected" && application?.stripe_payment_intent_id ? "Resubmit for review" : "Continue to $5 payment"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">One-time $5 review fee. Your badge goes live only after our team approves it.</p>
        </form>
      )}

      <Dialog open={!!secret} onOpenChange={(o) => !o && setSecret(null)}>
        <DialogContent>
          <DialogTitle>Pay the $5 review fee</DialogTitle>
          {secret && (
            <Elements stripe={getStripe()} options={{ clientSecret: secret, appearance: { theme: "stripe" } }}>
              <PayForm onPaid={paid} />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
