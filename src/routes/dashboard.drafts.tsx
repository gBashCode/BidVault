import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

dayjs.extend(utc);

export const Route = createFileRoute("/dashboard/drafts")({
  head: () => ({
    meta: [
      { title: "Drafts — BidVault" },
      { name: "description", content: "Unpublished tender drafts awaiting completion and review." },
    ],
  }),
  component: DashboardDrafts,
});

function DashboardDrafts() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState<Date>();
  const [revealTime, setRevealTime] = useState<Date>();

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const res = await apiClient.get("/v1/tenders");
      return res.data;
    },
  });

  const drafts = tenders.filter((t: any) => t.status === "DRAFT");

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        submissionDeadline: submissionDeadline?.toISOString(),
        revealTime: revealTime?.toISOString(),
      };
      const res = await apiClient.post("/v1/tenders", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Draft created successfully");
      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setSubmissionDeadline(undefined);
      setRevealTime(undefined);
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: any) => {
      toast.error("Failed to create draft", {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  const handleCreate = () => {
    if (!title || !submissionDeadline || !revealTime) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (submissionDeadline > revealTime) {
      toast.error("Submission deadline must be before reveal time.");
      return;
    }
    createMutation.mutate();
  };

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/v1/tenders/${id}/publish`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tender published successfully");
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: any) => {
      toast.error("Failed to publish tender", {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/v1/tenders/${id}`);
    },
    onSuccess: () => {
      toast.success("Tender deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: any) => {
      toast.error("Failed to delete tender", {
        description: err.response?.data?.message || err.message,
      });
    },
  });

  const summaryMetrics = [
    { k: "Total drafts", v: drafts.length.toString(), sub: "unpublished" },
    { k: "Combined est. value", v: "Pending", sub: "calculating..." },
    { k: "Avg. completion", v: "100 %", sub: "weighted" },
    {
      k: "Oldest draft",
      v: drafts.length > 0 ? dayjs(drafts[drafts.length - 1].createdAt).format("MMM D") : "N/A",
      sub: "latest",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[220px_1fr] gap-0">
        <DashboardSidebar />
        <main className="border-l border-border">
          {/* hero header */}
          <div className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-grid-fine opacity-[0.4]" />
            <div className="relative mx-auto max-w-[1280px] px-6 py-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    Operate · Drafts
                  </div>
                  <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                    Tender drafts
                  </h1>
                  <p className="mt-2 max-w-2xl text-[14px] text-muted-foreground">
                    Tenders still being authored. Complete all required sections before publishing
                    to the sealed-bid network.
                  </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="btn-ember inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold cursor-pointer">
                      New draft
                    </button>
                  </DialogTrigger>
                  <DialogContent className="glass-card sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="font-display">Create Tender Draft</DialogTitle>
                      <DialogDescription>
                        Draft a new tender. You can publish it to the network later.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                          Title
                        </label>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Project title..."
                          className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Tender summary..."
                          className="w-full h-20 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none resize-none"
                        />
                      </div>
                      <DateTimePicker
                        label="Submission Deadline"
                        date={submissionDeadline}
                        setDate={setSubmissionDeadline}
                      />
                      <DateTimePicker
                        label="Reveal Time"
                        date={revealTime}
                        setDate={setRevealTime}
                      />
                    </div>
                    <DialogFooter>
                      <button
                        disabled={createMutation.isPending}
                        onClick={handleCreate}
                        className="btn-ember h-9 px-4 rounded-md text-[13px] font-semibold cursor-pointer"
                      >
                        {createMutation.isPending ? "Creating..." : "Save Draft"}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1280px] px-6 py-10">
            {/* ── summary metrics ────────────────────────────────── */}
            <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
              {summaryMetrics.map((x) => (
                <div key={x.k} className="bg-card px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {x.k}
                  </div>
                  <div className="tabular mt-1 font-display text-2xl font-semibold">{x.v}</div>
                  <div className="font-mono text-[10.5px] text-muted-foreground">{x.sub}</div>
                </div>
              ))}
            </div>

            {/* ── drafts list ────────────────────────────────────── */}
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center p-10 border border-border rounded-xl bg-surface/50">
                  <p className="text-sm text-muted-foreground">
                    No drafts found. Create a new draft above.
                  </p>
                </div>
              ) : (
                drafts.map((d: any) => (
                  <DraftCard
                    key={d.id}
                    draft={d}
                    onPublish={() => publishMutation.mutate(d.id)}
                    isPublishing={publishMutation.isPending && publishMutation.variables === d.id}
                    onDelete={() => deleteMutation.mutate(d.id)}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === d.id}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  onPublish,
  isPublishing,
  onDelete,
  isDeleting,
}: {
  draft: any;
  onPublish: () => void;
  isPublishing: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const progressColor = "bg-primary";
  const badgeColor = "bg-primary/15 text-primary";
  const completion = 100;

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
      <div className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_auto]">
        {/* left: info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-semibold tracking-tight">{draft.title}</h3>
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${badgeColor}`}
            >
              {completion}%
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{draft.id}</span>
            <span>Created {dayjs(draft.createdAt).format("YYYY-MM-DD HH:mm")}</span>
            <span>Sub. Deadline {dayjs(draft.submissionDeadline).format("YYYY-MM-DD HH:mm")}</span>
            <span>Reveal {dayjs(draft.revealTime).format("YYYY-MM-DD HH:mm")}</span>
          </div>

          {/* progress bar */}
          <div className="max-w-md space-y-1">
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>Sections 11 / 11</span>
              <span>{completion}% complete</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all ${progressColor}`}
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </div>

        {/* right: actions */}
        <div className="flex items-start gap-2 md:flex-col md:items-end md:justify-center">
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className={`inline-flex h-8 items-center rounded-md px-3 text-[12px] font-semibold transition-colors btn-ember cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </button>
          <button className="h-8 rounded-md border border-border bg-card px-3 text-[12px] hover:bg-muted cursor-pointer">
            Edit
          </button>
          <button
            className="h-8 rounded-md border border-border bg-card px-3 text-[12px] text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
            onClick={onDelete}
            disabled={isDeleting || isPublishing}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DateTimePicker({
  date,
  setDate,
  label,
}: {
  date?: Date;
  setDate: (d?: Date) => void;
  label: string;
}) {
  const [time, setTime] = useState<string>(date ? format(date, "HH:mm") : "00:00");

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined);
      return;
    }
    const [hours, minutes] = time.split(":");
    selectedDate.setHours(parseInt(hours || "0"), parseInt(minutes || "0"), 0, 0);
    setDate(selectedDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (date) {
      const newDate = new Date(date);
      const [hours, minutes] = newTime.split(":");
      newDate.setHours(parseInt(hours || "0"), parseInt(minutes || "0"), 0, 0);
      setDate(newDate);
    }
  };

  return (
    <div className="space-y-2 flex flex-col">
      <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full h-9 flex items-center justify-start text-left font-normal rounded-md border border-border bg-surface px-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none hover:bg-surface/80 transition-colors cursor-pointer",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP p") : <span>Pick a date</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 glass-card border-border/50 shadow-xl" align="start">
          <Calendar mode="single" selected={date} onSelect={handleSelect} initialFocus />
          <div className="p-3 border-t border-border/50 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <input
              type="time"
              value={time}
              onChange={handleTimeChange}
              className="bg-surface/50 border border-border rounded-md px-2 py-1 text-sm outline-none focus:border-primary/50 w-full font-mono text-foreground cursor-pointer"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
