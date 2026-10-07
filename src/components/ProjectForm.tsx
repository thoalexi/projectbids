import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/projects";
import { QUESTIONS, type Answers } from "@/lib/questions";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().trim().min(3, "Give your project a short title").max(120),
  category: z.string().min(1),
  description: z.string().trim().min(10, "Describe the job in a bit more detail").max(3000),
  location: z.string().trim().min(2, "Add your city").max(100),
  desired_date: z.string().min(1, "Pick a date"),
});

export type ProjectValues = z.infer<typeof schema> & { image_url: string | null; answers: Answers };

type Props = {
  userId: string;
  initial?: Partial<ProjectValues>;
  initialPreview?: string | null;
  submitLabel: string;
  busyLabel: string;
  onSubmit: (v: ProjectValues) => Promise<void>;
};

export function ProjectForm({ userId, initial, initialPreview, submitLabel, busyLabel, onSubmit }: Props) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    category: initial?.category ?? "Painting",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    desired_date: initial?.desired_date ?? "",
  });
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? {});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview ?? null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message);
    const missing = QUESTIONS.find((q) => !answers[q.id]);
    if (missing) return void toast.error(`Please answer: ${missing.label}`);
    if (file && file.size > 10 * 1024 * 1024) return void toast.error("Photo must be under 10 MB");
    setBusy(true);
    let image_url = initial?.image_url ?? null;
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("project-photos").upload(path, file, { contentType: file.type });
      if (error) {
        setBusy(false);
        return void toast.error("Photo upload failed. Try a different image.");
      }
      image_url = `storage:${path}`;
    }
    await onSubmit({ ...parsed.data, image_url, answers });
    setBusy(false);
  }

  return (
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
              setPreview(f ? URL.createObjectURL(f) : initialPreview ?? null);
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

      {QUESTIONS.map((q) => (
        <fieldset key={q.id}>
          <legend className="text-sm font-medium">{q.label}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {q.options.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => setAnswers({ ...answers, [q.id]: o })}
                aria-pressed={answers[q.id] === o}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
                  answers[q.id] === o ? "bg-primary text-primary-foreground ring-primary/40" : "bg-secondary text-secondary-foreground ring-border hover:bg-card",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Details</span>
        <textarea
          rows={5}
          value={form.description}
          onChange={set("description")}
          maxLength={3000}
          placeholder="Room is 9 ft × 9 ft with 9 ft ceilings. Walls and ceiling…"
          className="field mt-1.5 resize-none"
        />
      </label>
      <Button type="submit" disabled={busy} size="lg" className="w-full">
        {busy ? busyLabel : submitLabel}
      </Button>
    </form>
  );
}
