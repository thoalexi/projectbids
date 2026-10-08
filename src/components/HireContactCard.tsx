import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MapPin, Phone, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Contact = { user_id: string; name: string; phone: string; email: string; address: string; notes: string };

export function HireContactCard({
  projectId,
  userId,
  userEmail,
  defaultName,
  isOwner,
  otherName,
  neighborhood,
}: {
  projectId: string;
  userId: string;
  userEmail: string;
  defaultName: string;
  isOwner: boolean;
  otherName: string;
  neighborhood: string;
}) {
  const qc = useQueryClient();
  const key = ["hire-contacts", projectId];
  const { data: contacts = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("hire_contacts").select("user_id, name, phone, email, address, notes").eq("project_id", projectId);
      if (error) throw error;
      return data as Contact[];
    },
  });
  const mine = contacts.find((c) => c.user_id === userId);
  const theirs = contacts.find((c) => c.user_id !== userId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: defaultName, phone: "", email: userEmail, address: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mine) setForm({ name: mine.name, phone: mine.phone, email: mine.email, address: mine.address, notes: mine.notes });
  }, [mine?.user_id, mine?.phone, mine?.address]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const phone = form.phone.trim();
    if (phone.replace(/\D/g, "").length < 10) return toast.error("Enter a phone number with area code");
    if (isOwner && form.address.trim().length < 5) return toast.error("Enter the job's street address");
    setSaving(true);
    const { error } = await supabase.from("hire_contacts").upsert(
      {
        project_id: projectId,
        user_id: userId,
        name: form.name.trim().slice(0, 80),
        phone: phone.slice(0, 30),
        email: form.email.trim().slice(0, 200),
        address: isOwner ? form.address.trim().slice(0, 300) : "",
        notes: isOwner ? form.notes.trim().slice(0, 500) : "",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,user_id" },
    );
    setSaving(false);
    if (error) return toast.error("Couldn't save your contact info. Please try again.");
    setEditing(false);
    qc.invalidateQueries({ queryKey: key });
  }

  const showForm = !mine || editing;
  const tel = theirs?.phone.replace(/[^\d+]/g, "");

  return (
    <section className="frosted rounded-2xl p-6 ring-1 ring-success/30">
      <h2 className="text-lg font-semibold">{isOwner ? "Your hired pro" : "You're hired! Job details"}</h2>

      <div className="mt-4 rounded-xl bg-card/60 p-4 ring-1 ring-border">
        <p className="text-xs font-medium text-muted-foreground">{isOwner ? "Contractor" : "Homeowner"}</p>
        <p className="mt-1 font-semibold">{theirs?.name || otherName}</p>
        {theirs ? (
          <div className="mt-3 space-y-3 text-sm">
            {!isOwner && theirs.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p>{theirs.address}</p>
                  <a className="text-xs text-primary underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theirs.address)}`}>Open in Maps</a>
                </div>
              </div>
            )}
            {!isOwner && theirs.notes && <p className="rounded-lg bg-background/40 p-2 text-muted-foreground">Arrival notes: {theirs.notes}</p>}
            <div className="flex flex-wrap gap-2">
              {tel && <Button asChild size="sm"><a href={`tel:${tel}`}><Phone className="size-4" /> Call {theirs.phone}</a></Button>}
              {tel && <Button asChild size="sm" variant="secondary"><a href={`sms:${tel}`}><MessageSquare className="size-4" /> Text</a></Button>}
              {theirs.email && <Button asChild size="sm" variant="secondary"><a href={`mailto:${theirs.email}`}><Mail className="size-4" /> Email</a></Button>}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {isOwner ? "Waiting for your pro to share their phone and email." : `Waiting for the homeowner to share the address in ${neighborhood}.`}
          </p>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Your contact info {isOwner ? "(only your hired pro sees this)" : "(only this homeowner sees this)"}</p>
          {mine && !editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>}
        </div>
        {showForm ? (
          <form onSubmit={save} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium text-muted-foreground">Name</span>
                <input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field mt-1.5" /></label>
              <label className="block"><span className="text-xs font-medium text-muted-foreground">Phone</span>
                <input type="tel" value={form.phone} maxLength={30} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(404) 555-0123" className="field mt-1.5" /></label>
            </div>
            <label className="block"><span className="text-xs font-medium text-muted-foreground">Email</span>
              <input type="email" value={form.email} maxLength={200} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field mt-1.5" /></label>
            {isOwner && (
              <>
                <label className="block"><span className="text-xs font-medium text-muted-foreground">Job street address</span>
                  <input value={form.address} maxLength={300} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Peachtree St NE, Atlanta, GA 30303" className="field mt-1.5" /></label>
                <label className="block"><span className="text-xs font-medium text-muted-foreground">Arrival notes (optional)</span>
                  <input value={form.notes} maxLength={500} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Gate code, parking, best time to call" className="field mt-1.5" /></label>
              </>
            )}
            <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : "Share with " + (isOwner ? "my pro" : "the homeowner")}</Button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{mine!.phone} · {mine!.email}{isOwner && mine!.address ? ` · ${mine!.address}` : ""}</p>
        )}
      </div>
    </section>
  );
}
