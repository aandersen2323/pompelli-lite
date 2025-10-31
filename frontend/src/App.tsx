import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createJob, fetchHistory, fetchJob, fetchTemplates, type Job } from './api';
import { VariationCard } from './components/VariationCard';

type StoredHistory = Array<Pick<Job, 'id' | 'results' | 'createdAt' | 'templateId' | 'input'>>;

const HISTORY_KEY = 'pomelli-lite:history';

function loadLocalHistory(): StoredHistory {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredHistory;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse local history', error);
    return [];
  }
}

export default function App() {
  const [input, setInput] = useState('');
  const [templateId, setTemplateId] = useState('default');
  const [variationCount, setVariationCount] = useState(3);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [localHistory, setLocalHistory] = useState<StoredHistory>(() => loadLocalHistory());
  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(localHistory.slice(0, 20)));
  }, [localHistory]);

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    onSuccess(data) {
      if (!templateId && data.templates.length > 0) {
        setTemplateId(data.templates[0].id);
      }
    },
  });

  const remoteHistoryQuery = useQuery({
    queryKey: ['remote-history'],
    queryFn: fetchHistory,
    refetchInterval: 60_000,
  });

  const jobQuery = useQuery({
    queryKey: ['job', activeJobId],
    queryFn: () => fetchJob(activeJobId ?? ''),
    enabled: Boolean(activeJobId),
    refetchInterval: (data) =>
      data?.job && data.job.status !== 'done' && data.job.status !== 'failed'
        ? 1_000
        : false,
  });

  useEffect(() => {
    const job = jobQuery.data?.job;
    if (!job) return;
    if (job.status === 'done') {
      setLocalHistory((prev) => [{
        id: job.id,
        results: job.results,
        createdAt: job.createdAt,
        templateId: job.templateId,
        input: job.input,
      }, ...prev.filter((item) => item.id !== job.id)]);
      setActiveJobId(job.id);
    }
  }, [jobQuery.data?.job]);

  const mutation = useMutation({
    mutationFn: ({ text, template, n }: { text: string; template: string; n: number }) =>
      createJob(text, template, n),
    onSuccess(data) {
      setActiveJobId(data.jobId);
      queryClient.invalidateQueries({ queryKey: ['remote-history'] });
    },
  });

  const activeResults = useMemo(() => {
    if (activeJobId) {
      const job = jobQuery.data?.job;
      if (job?.id === activeJobId && job.status === 'done') {
        return job.results;
      }
      const stored = localHistory.find((item) => item.id === activeJobId);
      return stored?.results ?? [];
    }
    return [];
  }, [activeJobId, jobQuery.data?.job, localHistory]);

  const templates = templatesQuery.data?.templates ?? [];

  const combinedHistory = useMemo(() => {
    const remote = remoteHistoryQuery.data?.jobs ?? [];
    const merged = [...localHistory];
    remote.forEach((job) => {
      if (!merged.find((local) => local.id === job.id)) {
        merged.push({
          id: job.id,
          results: job.results,
          createdAt: job.createdAt,
          templateId: job.templateId,
          input: job.input,
        });
      }
    });
    return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 20);
  }, [localHistory, remoteHistoryQuery.data?.jobs]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (input.trim().length === 0) return;
    mutation.mutate({ text: input, template: templateId, n: variationCount });
  };

  const activeJobStatus = jobQuery.data?.job?.status;
  const isLoadingJob =
    mutation.isLoading || (activeJobStatus && activeJobStatus !== 'done' && activeJobStatus !== 'failed');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-white">pomelli-lite</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Local-first playground for generating AI-powered variations. Paste text, pick a template, and explore
            alternate takes without leaving your browser.
          </p>
        </header>

        <main className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <section className="flex flex-col gap-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-slate-200">Prompt</span>
                <textarea
                  className="min-h-[160px] resize-y rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-base text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Paste a snippet you want to remix..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-slate-200">Template</span>
                  <select
                    className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm"
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-slate-200">Variations</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm"
                    value={variationCount}
                    onChange={(event) => setVariationCount(Number(event.target.value))}
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="h-11 w-full rounded-lg bg-sky-500 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    disabled={isLoadingJob || input.trim().length === 0}
                  >
                    {isLoadingJob ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </div>

              {isLoadingJob && (
                <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-sky-200">
                  Processing job… hang tight while we craft your variations.
                </div>
              )}
            </form>

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Variations</h2>
                {activeJobStatus && <span className="text-xs uppercase tracking-wide text-slate-500">{activeJobStatus}</span>}
              </div>
              {activeResults.length === 0 && (
                <p className="text-sm text-slate-500">
                  Generate a prompt to see variations appear here. They will show up instantly once the worker completes a
                  job.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {activeResults.map((result, index) => (
                  <VariationCard key={`${activeJobId}-${index}`} text={result} />
                ))}
              </div>
            </section>
          </section>

          <aside className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-semibold text-white">History</h2>
            <p className="text-xs text-slate-500">
              Stored locally for quick access. Hosted mode can sync jobs from the server when enabled.
            </p>
            <div className="flex flex-col gap-2">
              {combinedHistory.length === 0 && <span className="text-sm text-slate-500">No jobs yet.</span>}
              {combinedHistory.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className="rounded-lg border border-transparent bg-slate-950/60 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-sky-500 hover:text-white"
                  onClick={() => setActiveJobId(job.id)}
                >
                  <span className="block font-medium text-slate-100">{new Date(job.createdAt).toLocaleTimeString()}</span>
                  <span className="line-clamp-2 text-xs text-slate-400">{job.input}</span>
                </button>
              ))}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
