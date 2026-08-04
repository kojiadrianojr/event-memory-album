export type FetchWithRetryOptions = {
  maxAttempts?: number;
  fetchFn?: typeof fetch;
};

export type FetchWithRetryResult =
  | { ok: true; response: Response }
  | { ok: false; errorMessage: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(response: Response): number {
  const header = response.headers.get("Retry-After");
  if (!header) return 1;
  const seconds = parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 1;
}

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit = 3
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= tasks.length) break;
      results[index] = await tasks[index]();
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchWithRetryOptions
): Promise<FetchWithRetryResult> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const fetchFn = options?.fetchFn ?? fetch;
  let sawRateLimit = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchFn(input, init);

      if (response.status === 429) {
        sawRateLimit = true;
        if (attempt < maxAttempts) {
          await sleep(parseRetryAfterSeconds(response) * 1000);
          continue;
        }
        return { ok: false, errorMessage: "Rate limited. Try again." };
      }

      return { ok: true, response };
    } catch {
      if (attempt < maxAttempts) {
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 4000));
        continue;
      }
      return { ok: false, errorMessage: "Network error." };
    }
  }

  return {
    ok: false,
    errorMessage: sawRateLimit ? "Rate limited. Try again." : "Network error.",
  };
}
