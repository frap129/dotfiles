import type { Plugin } from "@opencode-ai/plugin";
import { randomBytes, createHash } from "node:crypto";

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTHORIZE_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";
const REDIRECT_URI = "https://console.anthropic.com/oauth/code/callback";
const SCOPES = "org:create_api_key user:profile user:inference";
const CLAUDE_CODE_VERSION = "2.1.76";
const BILLING_SALT = "59cf53e54c78";

// --- OAuth helpers ---

function base64url(buf: Buffer): string {
  return buf.toString("base64url").replace(/=+$/, "");
}

function createAuthorizationRequest() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const params = new URLSearchParams({
    code: "true",
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: verifier,
  });
  return { url: `${AUTHORIZE_URL}?${params}`, verifier };
}

function parseAuthCode(raw: string): string {
  const hashIdx = raw.indexOf("#");
  return hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
}

async function exchangeCodeForTokens(rawCode: string, verifier: string) {
  const code = parseAuthCode(rawCode.trim());
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "anthropic",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Token exchange failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    access: data.access_token,
    refresh: data.refresh_token,
    expires: Date.now() + data.expires_in * 1000,
  };
}

// --- Token refresh with 429 retry ---

async function refreshTokenWithRetry(refresh: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "anthropic",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refresh,
          client_id: CLIENT_ID,
        }).toString(),
      });
      if (res.status === 429) {
        const wait = Math.min(1000 * Math.pow(2, attempt), 16000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Token refresh failed: ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const wait = Math.min(1000 * Math.pow(2, attempt), 16000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr ?? new Error("Token refresh failed after retries");
}

// --- Billing header ---

function sampleCodeUnits(text: string, indices: number[]): string {
  return indices
    .map((i) => (i < text.length ? text.charCodeAt(i).toString(16) : "30"))
    .join("");
}

function billingHeader(firstUserMsg: string): string {
  const sampled = sampleCodeUnits(firstUserMsg, [4, 7, 20]);
  const hash = createHash("sha256")
    .update(`${BILLING_SALT}${sampled}${CLAUDE_CODE_VERSION}`)
    .digest("hex")
    .slice(0, 3);
  return `x-anthropic-billing-header: cc_version=${CLAUDE_CODE_VERSION}.${hash}; cc_entrypoint=cli; cch=00000;`;
}

function firstUserText(messages: any[]): string {
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text" && block.text) return block.text;
      }
    }
  }
  return "";
}

// --- Plugin ---

const plugin: Plugin = async ({ client }) => {
  return {
    auth: {
      provider: "anthropic",
      async loader(getAuth, _provider) {
        const auth = await getAuth();
        if (auth.type !== "oauth" || !auth.refresh) return { apiKey: "" };

        // Zero out cost for max plan
        for (const model of Object.values(_provider.models)) {
          (model as any).cost = {
            input: 0,
            output: 0,
            cache: { read: 0, write: 0 },
          };
        }

        return {
          apiKey: "",
          async fetch(input: any, init: any) {
            const auth = await getAuth();
            if (auth.type !== "oauth") return fetch(input, init);

            // Refresh token if needed
            if (!auth.access || (auth.expires ?? 0) < Date.now()) {
              const json = await refreshTokenWithRetry(auth.refresh);
              await client.auth.set({
                path: { id: "anthropic" },
                body: {
                  type: "oauth",
                  refresh: json.refresh_token,
                  access: json.access_token,
                  expires: Date.now() + json.expires_in * 1000,
                },
              });
              auth.access = json.access_token;
            }

            // Build headers
            const headers = new Headers();
            if (input instanceof Request) {
              input.headers.forEach((v, k) => headers.set(k, v));
            }
            if (init?.headers) {
              if (init.headers instanceof Headers) {
                init.headers.forEach((v: string, k: string) =>
                  headers.set(k, v),
                );
              } else if (Array.isArray(init.headers)) {
                for (const [k, v] of init.headers) {
                  if (v !== undefined) headers.set(k, String(v));
                }
              } else {
                for (const [k, v] of Object.entries(init.headers)) {
                  if (v !== undefined) headers.set(k, String(v));
                }
              }
            }

            headers.set("authorization", `Bearer ${auth.access}`);
            headers.set("user-agent", `claude-code/${CLAUDE_CODE_VERSION}`);
            headers.set("anthropic-beta", "oauth-2025-04-20");
            headers.set("x-app", "cli");
            headers.delete("x-api-key");

            // Inject billing header into system messages
            let body = init?.body;
            if (body && typeof body === "string") {
              try {
                const parsed = JSON.parse(body);
                const userMsg = firstUserText(parsed.messages ?? []);
                const billing = billingHeader(userMsg);

                if (!parsed.system) {
                  parsed.system = [{ type: "text", text: billing }];
                } else if (Array.isArray(parsed.system)) {
                  parsed.system = [
                    { type: "text", text: billing },
                    ...parsed.system,
                  ];
                } else if (typeof parsed.system === "string") {
                  parsed.system = [
                    { type: "text", text: billing },
                    { type: "text", text: parsed.system },
                  ];
                }
                body = JSON.stringify(parsed);
              } catch {
                // not JSON, pass through
              }
            }

            // Build final request
            let requestInput = input;
            let requestUrl: URL | null = null;
            try {
              if (typeof input === "string" || input instanceof URL) {
                requestUrl = new URL(input.toString());
              } else if (input instanceof Request) {
                requestUrl = new URL(input.url);
              }
            } catch {
              requestUrl = null;
            }

            if (requestUrl && requestUrl.pathname === "/v1/messages") {
              requestUrl.searchParams.set("beta", "true");
              requestInput =
                input instanceof Request
                  ? new Request(requestUrl.toString(), input)
                  : requestUrl;
            }

            return fetch(requestInput, { ...init, body, headers });
          },
        };
      },
      methods: [
        {
          type: "oauth" as const,
          label: "Claude Pro/Max",
          authorize() {
            const { url, verifier } = createAuthorizationRequest();
            return Promise.resolve({
              url,
              instructions:
                "Open the link above to authenticate with your Claude account. " +
                "After authorizing, you'll receive a code — paste it below.",
              method: "code" as const,
              async callback(code: string) {
                try {
                  const tokens = await exchangeCodeForTokens(code, verifier);
                  return {
                    type: "success" as const,
                    access: tokens.access,
                    refresh: tokens.refresh,
                    expires: tokens.expires,
                  };
                } catch (err) {
                  console.error(
                    "anthropic-oauth: token exchange failed:",
                    err instanceof Error ? err.message : err,
                  );
                  return { type: "failed" as const };
                }
              },
            });
          },
        },
      ],
    },
  };
};

export default plugin;
