/**
 * opencode plugin for FordLLM
 *
 * This plugin also handles token refresh, fetching a client token every 60s to
 * avoid token expiry.
 *
 * This plugin also handles parameter translation on a per-model basis
 */

// Azure AD client credentials constants (from env)
const TENANT_ID = process.env.FORDLLM_TENANT_ID;
const CLIENT_ID = process.env.FORDLLM_CLIENT_ID;
const CLIENT_SECRET = process.env.FORDLLM_CLIENT_SECRET;
const SCOPE = process.env.FORDLLM_SCOPE;

// Refresh token this many ms before reported expiry
const REFRESH_EARLY_MS = 60_000;

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms when we should refresh
let inFlightToken: Promise<string> | null = null;

// OpenCode client
let opencode: any = null;

function safeToast(message: string) {
  try {
    return opencode?.tui?.showToast?.({
      body: {
        message,
        variant: "error",
      },
    });
  } catch {
    return undefined;
  }
}

async function fetchNewToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    scope: SCOPE!,
    grant_type: "client_credentials",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    safeToast(`[FordLLM] Token fetch failed: ${res.status}: ${text}`);
    throw new Error(`token_fetch_failed:${res.status}`);
  }
  const json: any = await res.json();
  if (!json?.access_token || typeof json?.expires_in !== "number") {
    safeToast(`[FordLLM] Invalid token response: ${JSON.stringify(json)}`);
    throw new Error("token_response_invalid");
  }
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000 - REFRESH_EARLY_MS;
  return cachedToken!;
}

async function getAccessToken(): Promise<string | null> {
  if (!cachedToken || Date.now() >= tokenExpiresAt) {
    if (!inFlightToken) {
      inFlightToken = (async () => {
        try {
          return await fetchNewToken();
        } finally {
          inFlightToken = null;
        }
      })();
    }
    try {
      return await inFlightToken;
    } catch {
      return null;
    }
  }
  return cachedToken;
}

/**
 * Transform input items for the Responses API.
 * FordLLM requires MessageItem.content to be an array of content parts,
 * but the AI SDK sends content as a plain string.
 */
function transformForResponsesApi(body: any) {
  // Convert string content to array of content parts.
  // FordLLM requires MessageItem.content to be list[ContentPart].
  if (Array.isArray(body.input)) {
    for (const item of body.input) {
      if (typeof item !== "object" || item === null) continue;

      if (typeof item.content === "string") {
        const contentType =
          item.role === "assistant" ? "output_text" : "input_text";
        item.content = [{ type: contentType, text: item.content }];
      }
    }
  }

  // FordLLM requires text.format even when no structured output is requested.
  if (body.text && typeof body.text === "object" && !body.text.format) {
    body.text.format = { type: "text" };
  }
}

function applyModelSpecificFiltering(body: any) {
  if (!body || typeof body !== "object") return;
  const model = (body as any).model;
  if (typeof model !== "string") return;
  switch (true) {
    case model.includes("gpt-5"): {
      delete (body as any).max_tokens;
      (body as any).top_p = null;
      break;
    }
    case model == "gpt-oss":
    case model.includes("qwen3"):
    case model.includes("kimi"): {
      if ("stream_options" in body) {
        delete (body as any).stream_options;
      }
      delete (body as any).max_tokens;
      break;
    }
    default:
      break;
  }
}

/**
 * Transform streaming response to fix missing tool_calls index field.
 * Some providers (Gemini 3) don't include the index field required by
 * the Vercel AI SDK's OpenAI-compatible parser.
 */
function patchToolCallIndexes(payload: any): boolean {
  let changed = false;
  const choices = Array.isArray(payload?.choices) ? payload.choices : [];

  for (const choice of choices) {
    const delta = choice?.delta;
    if (!delta || typeof delta !== "object") continue;
    const tc = (delta as any).tool_calls;
    if (!tc) continue;

    if (Array.isArray(tc)) {
      (delta as any).tool_calls = tc.map((call: any, idx: number) => {
        if (
          call &&
          typeof call === "object" &&
          typeof call.index !== "number"
        ) {
          changed = true;
          return { ...call, index: idx };
        }
        return call;
      });
      continue;
    }

    // Some providers may emit a single tool call object.
    if (tc && typeof tc === "object") {
      changed = true;
      (delta as any).tool_calls = [{ ...tc, index: 0 }];
    }
  }

  return changed;
}

function transformNdjsonStream(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        if (buffer.includes("\r")) buffer = buffer.replace(/\r\n/g, "\n");

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) {
            controller.enqueue(encoder.encode("\n"));
            continue;
          }

          let out = line;
          try {
            const json = JSON.parse(line);
            if (json && typeof json === "object" && "extra_content" in json) {
              delete (json as any).extra_content;
            }
            patchToolCallIndexes(json);
            out = JSON.stringify(json);
          } catch {
            // Keep original line.
          }
          controller.enqueue(encoder.encode(out + "\n"));
        }
      },
      flush(controller) {
        if (buffer) controller.enqueue(encoder.encode(buffer));
      },
    }),
  );
}

function transformSseStream(stream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        if (buffer.includes("\r")) buffer = buffer.replace(/\r\n/g, "\n");

        let sepIdx: number;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const eventText = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          if (!eventText) {
            controller.enqueue(encoder.encode("\n"));
            continue;
          }

          const lines = eventText.split("\n");
          const dataLines: string[] = [];
          const otherLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).replace(/^\s/, ""));
            } else {
              otherLines.push(line);
            }
          }

          if (dataLines.length === 0) {
            controller.enqueue(encoder.encode(eventText + "\n\n"));
            continue;
          }

          const dataPayload = dataLines.join("\n");
          if (dataPayload === "[DONE]") {
            const rebuilt =
              otherLines.concat(["data: [DONE]"]).join("\n") + "\n\n";
            controller.enqueue(encoder.encode(rebuilt));
            continue;
          }

          try {
            const json = JSON.parse(dataPayload);
            if (json && typeof json === "object" && "extra_content" in json) {
              delete (json as any).extra_content;
            }
            if (json && typeof json === "object" && !("usage" in json)) {
              json.usage = {};
            }
            patchToolCallIndexes(json);
            const outPayload = JSON.stringify(json);

            const rebuilt =
              otherLines.concat([`data: ${outPayload}`]).join("\n") + "\n\n";
            controller.enqueue(encoder.encode(rebuilt));
          } catch {
            // Keep event unchanged on parse failure.
            controller.enqueue(encoder.encode(eventText + "\n\n"));
          }
        }
      },
      flush(controller) {
        if (buffer) controller.enqueue(encoder.encode(buffer));
      },
    }),
  );
}

function transformStreamingResponse(
  response: Response,
  opts: { force: boolean },
): Response {
  const contentType = response.headers.get("content-type") || "";
  const isEventStream = contentType.includes("text/event-stream");
  const isNdjson = contentType.includes("application/x-ndjson");

  if (!opts.force && !isEventStream && !isNdjson) return response;
  if (!response.body) return response;

  const body = isNdjson
    ? transformNdjsonStream(response.body)
    : transformSseStream(response.body);

  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export const FordllmPlugin = async ({
  project,
  client,
  $,
  directory,
  worktree,
}) => {
  opencode = client;
  return {
    auth: {
      provider: "fordllm",
      loader: async () => {
        return {
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            let requestModel = "";
            let isStream = false;

            if (init?.body) {
              try {
                if (typeof init.body !== "string") {
                  throw new Error("request body is not a string");
                }

                const body = JSON.parse(init.body);
                requestModel =
                  typeof body?.model === "string" ? body.model : "";
                isStream = body?.stream === true;

                try {
                  applyModelSpecificFiltering(body);
                } catch (modelErr: any) {
                  safeToast(
                    `[FordLLM] Failed to apply model specific filtering: ${modelErr?.message || String(modelErr)}`,
                  );
                }

                const url =
                  typeof input === "string"
                    ? input
                    : input instanceof URL
                      ? input.href
                      : (input as Request).url;
                if (url.includes("/responses")) {
                  transformForResponsesApi(body);
                }

                init.body = JSON.stringify(body);
              } catch (e: any) {
                safeToast(
                  `[FordLLM] Failed to sanitize: ${e?.message || String(e)}`,
                );
              }
            }

            // Ensure Authorization header
            const token = await getAccessToken();
            if (!token) {
              return new Response(
                JSON.stringify({ error: "token_unavailable" }),
                { status: 401 },
              );
            }
            const headers = new Headers(init?.headers || {});
            headers.set("Authorization", `Bearer ${token}`);
            init = { ...(init || {}), headers };

            const response = await fetch(input, init);
            const needsStreamTransform =
              isStream &&
              (requestModel.toLowerCase().includes("gemini") ||
                requestModel.includes("kimi") ||
                requestModel === "gpt-oss" ||
                requestModel === "qwen3-coder");

            if (!needsStreamTransform) return response;

            return transformStreamingResponse(response, {
              force: true,
            });
          },
        };
      },
      methods: [
        {
          label: "Set FordLLM environment variables",
          type: "none",
        },
      ],
    },
  };
};
