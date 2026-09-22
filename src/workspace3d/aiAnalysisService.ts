/**
 * AI analysis service: non-blocking job submission + polling.
 *
 * Instead of awaiting one long HTTP call, callers POST to /api/ai/jobs,
 * get a job_id, then poll GET /api/ai/jobs/{job_id} every 1000 ms until
 * the job reaches COMPLETED or FAILED.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export type AiJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AiJob {
  job_id: string;
  job_type: string;
  target_id: string;
  status: AiJobStatus;
  result: Record<string, unknown> | null;
  error: string | null;
}

async function asJson(res: Response): Promise<unknown> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function startAiJob(jobType: string, targetId: string): Promise<string> {
  const data = (await asJson(await fetch(`${BASE_URL}/api/ai/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_type: jobType, target_id: targetId }),
  }))) as { job_id: string };
  if (!data || typeof data.job_id !== 'string') throw new Error('bad job response');
  return data.job_id;
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  isCancelled?: () => boolean;
}

export async function pollAiJob(jobId: string, opts: PollOptions = {}): Promise<AiJob> {
  const intervalMs = opts.intervalMs ?? 1000;
  const timeoutMs = opts.timeoutMs ?? 120000;
  const started = Date.now();
  for (;;) {
    if (opts.isCancelled?.()) throw new Error('cancelled');
    const job = (await asJson(await fetch(`${BASE_URL}/api/ai/jobs/${jobId}`))) as AiJob;
    if (job.status === 'COMPLETED' || job.status === 'FAILED') return job;
    if (Date.now() - started > timeoutMs) throw new Error('poll timeout');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
