import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/projects";

export const Route = createFileRoute("/post")({
  head: () => ({
    meta: [
      { title: "Post a home project — Quote Slip" },
      { name: "description", content: "Describe your project, add a photo and a date, and start receiving bids." },
      { property: "og:title", content: "Post a home project — Quote Slip" },
      { property: "og:description", content: "Describe your project, add a photo and a date, and start receiving bids." },
    ],
  }),
  component: PostProject,
});

const schema = z.object({
  title: z.string().trim().min(3, "Give your project a short title").max(120),
  category: z.string().min(1),
  description: z.string().trim().min(10, "Describe the job in a bit more detail").max(3000),
  location: z.string().trim().min(2, "Add your city").max(100),
  desired_date: z.string().min(1, "Pick a date"),
});

function PostProject() {
  const { user, loading, displayName } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", category: "Painting", description: "", location: "", desired_date: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  if (loading) return null;
  if (!user)
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <div className="frosted rounded-2xl p-8 text-center">
          <h1 className="font-display text-3xl">Post a project</h1>
          <p className="mt-2 text-muted-foreground">Sign in first so contractors know who they're bidding for.</p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign in or create an account</Link>
          </Button>
        </div>
      </main>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    if (file && file.size > 10 * 1024 * 1024) return void toast.error("Photo must be under 10 MB");
    setBusy(true);
    let image_url: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("project-photos").upload(path, file, { contentType: file.type });
      if (error) {
        setBusy(false);
        return void toast.error("Photo upload failed. Try a different image.");
      }
      image_url = `storage:${path}`;
    }
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...parsed.data, owner_id: user!.id, owner_name: displayName || "Homeowner", image_url })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return void toast.error("Couldn't post your project. Try again.");
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Your project is live! Bids will show up here.");
    navigate({ to: "/projects/$id", params: { id: data.id } });
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-12">
      <h1 className="font-display text-4xl">Post a project</h1>
      <p className="mt-2 text-muted-foreground">Tell local pros what you need. It's free to post.</p>
      <form onSubmit={submit} className="frosted mt-8 space-y-5 rounded-2xl p-6">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Photo</span>
          <div className="mt-1.5 flex items-center gap-4">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted ring-1 ring-border">
              {preview ? <img src={preview} alt="Preview" className="h-full w-full object-cover" /> : <Upload className="size-5 text-muted-foreground" />}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">What do you need done?</span>
          <input value={form.title} onChange={set("title")} maxLength={120} placeholder="Paint small room, 9×9×9 ft" className="field mt-1.5" />
        </label>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
            <select value={form.category} onChange={set("category")} className="field mt-1.5">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">City</span>
            <input value={form.location} onChange={set("location")} maxLength={100} placeholder="Portland, OR" className="field mt-1.5" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Done by</span>
            <input type="date" value={form.desired_date} onChange={set("desired_date")} className="field mt-1.5" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Details</span>
          <textarea
            rows={5}
            value={form.description}
            onChange={set("description")}
            maxLength={3000}
            placeholder="Room is 9 ft × 9 ft with 9 ft ceilings. Walls and ceiling, I'll supply the paint…"
            className="field mt-1.5 resize-none"
          />
        </label>
        <Button type="submit" disabled={busy} size="lg" className="w-full">
          {busy ? "Posting…" : "Post project"}
        </Button>
      </form>
    </main>
  );
}
