/**
 * Thin client for the RentUp API.
 *
 * In the browser, requests go to the same origin and `next.config.ts` rewrites
 * `/v1/*` to the API, so the auth cookies stay first-party. On the server they
 * go straight to `API_URL`.
 */
const SERVER_BASE = process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Set for the refresh call itself, so a 401 there cannot loop. */
  skipRefresh?: boolean;
};

function buildUrl(path: string, query: ApiOptions["query"]) {
  const base = typeof window === "undefined" ? SERVER_BASE : "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return `${base}/v1${path}${search ? `?${search}` : ""}`;
}

// Several requests can hit an expired token at once. They share one refresh,
// because the API rotates the refresh token on every use.
let refreshing: Promise<boolean> | null = null;

function refreshSession() {
  refreshing ??= api("/auth/refresh", { method: "POST", skipRefresh: true })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T = unknown>(
  path: string,
  { body, query, skipRefresh, headers, ...init }: ApiOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    credentials: "include",
    headers:
      body === undefined
        ? headers
        : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (
    response.status === 401 &&
    !skipRefresh &&
    typeof window !== "undefined" &&
    (await refreshSession())
  ) {
    return api<T>(path, { body, query, headers, ...init, skipRefresh: true });
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? response.statusText,
      error?.details,
    );
  }
  return payload as T;
}

/** The three-step upload: ask for a URL, PUT the file, then use the `key`. */
export async function uploadFile(uploadUrlPath: string, file: File) {
  const { uploadUrl, key } = await api<{ uploadUrl: string; key: string }>(
    uploadUrlPath,
    {
      method: "POST",
      body: { contentType: file.type, sizeBytes: file.size },
    },
  );
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    throw new ApiError(response.status, "UPLOAD_FAILED", "Upload failed");
  }
  return key;
}

export const DATA_CHANGED_EVENT = "rentup-data-changed";

export const WRITE_FAILED_EVENT = "rentup-write-failed";

/** Shows the failure toast for a write the user is waiting on. */
export function reportWriteFailure(error: unknown) {
  window.dispatchEvent(
    new CustomEvent(WRITE_FAILED_EVENT, {
      detail: error instanceof Error ? error.message : "Please try again.",
    }),
  );
}

/**
 * Runs store writes against the API in order, then asks the stores to reload.
 * Stores update optimistically, so a failure is announced to the user and the
 * reload puts the screen back to what the server holds.
 */
export function syncWrites(
  writes: { path: string; body?: unknown; method?: string }[],
) {
  void writes
    .reduce<Promise<unknown>>(
      (previous, { path, body, method = "POST" }) =>
        previous.then(() => api(path, { method, body })),
      Promise.resolve(),
    )
    .catch(reportWriteFailure)
    .finally(() => window.dispatchEvent(new Event(DATA_CHANGED_EVENT)));
}

export function syncWrite(path: string, body?: unknown, method = "POST") {
  syncWrites([{ path, body, method }]);
}
