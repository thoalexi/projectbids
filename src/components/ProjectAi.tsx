import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { askFollowUps, compareBids, type AiQuestion, type Comparison } from "@/lib/ai.functions";

export function toAiQuestions(v: unknown): AiQuestion[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x.question === "string").map((x) => ({ question: x.question, answer: String(x.answer ?? "") }));
}

/** Draft step: AI asks about missing details, owner answers, then the project goes live. */
export function FollowUpStep({ projectId, initial, onDone }: { projectId: string; initial: AiQuestion[]; onDone: () => void }) {
  const ask = useServerFn(askFollowUps);
  const [qs, setQs] = useState<AiQuestion[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const load = () => {
    setLoading(true);
    setFailed(false);
    ask({ data: { projectId } })
      .then(setQs)
      .catch((e: Error) => {
        setFailed(true);
        toast.error(e.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (initial.length === 0 && !started.current) {
      started.current = true;
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publish() {
    setBusy(true);
    const ai_questions = qs.map((q) => ({ question: q.question, answer: q.answer.trim().slice(0, 500) }));
    const { error } = await supabase.from("projects").update({ ai_questions, status: "open" }).eq("id", projectId);
    setBusy(false);
    if (error) return void toast.error("Couldn't publish. Try again.");
    toast.success("Your project is live! Bids will show up here.");
    onDone();
  }

  return (
    <div className="frosted rounded-2xl p-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">One more step</span>
      </div>
      <h2 className="font-display mt-2 text-2xl">A few quick questions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Answers help contractors price your job accurately. Skip any you're not sure about.
      </p>
      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Reading your project…</p>
      ) : (
        <div className="mt-5 space-y-4">
          {failed && (
            <Button variant="secondary" size="sm" onClick={load}>Try asking again</Button>
          )}
          {qs.map((q, i) => (
            <label key={i} className="block">
              <span className="text-sm font-medium">{q.question}</span>
              <input
                value={q.answer}
                maxLength={500}
                onChange={(e) => setQs(qs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                className="field mt-1.5"
              />
            </label>
          ))}
          <Button onClick={publish} disabled={busy} size="lg" className="w-full">
            {busy ? "Publishing…" : "Publish project"}
          </Button>
        </div>
      )}
    </div>
  );
}

const ROWS: [keyof Comparison["bids"][number], string][] = [
  ["total", "Total"],
  ["materials", "Materials"],
  ["demo", "Demo"],
  ["disposal", "Disposal"],
  ["timeline", "Timeline"],
  ["earliest_start", "Earliest start"],
  ["warranty", "Warranty"],
];

export function BidComparison({ projectId, saved }: { projectId: string; saved: Comparison | null }) {
  const compare = useServerFn(compareBids);
  const [data, setData] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      setData(await compare({ data: { projectId } }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data)
    return (
      <Button onClick={run} disabled={busy} variant="secondary" className="mt-6 w-full">
        <Sparkles className="size-4" /> {busy ? "Comparing bids…" : saved ? "Show bid comparison" : "Compare bids"}
      </Button>
    );

  return (
    <div className="mt-6 rounded-xl bg-card/70 p-4 ring-1 ring-border">
      <h3 className="text-sm font-semibold">Side-by-side comparison</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium" />
              {data.bids.map((b) => <th key={b.bid_id} className="py-1.5 pr-3 font-semibold text-foreground">{b.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, label]) => (
              <tr key={k} className="border-t border-border">
                <td className="py-1.5 pr-3 text-xs text-muted-foreground">{label}</td>
                {data.bids.map((b) => <td key={b.bid_id} className="py-1.5 pr-3">{b[k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.warnings.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {data.warnings.map((w, i) => (
            <li key={i} className="flex gap-2 text-xs text-secondary-foreground">
              <AlertTriangle className="size-3.5 shrink-0 text-accent" /> {w}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Compiled by AI from the contractors' bids — double-check details with each pro.</p>
    </div>
  );
}
