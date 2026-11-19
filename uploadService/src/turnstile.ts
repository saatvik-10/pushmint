type VerificationResult = "valid" | "invalid" | "unavailable";

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string,
  options: {
    secretKey?: string;
    expectedHostname?: string;
    fetcher?: typeof fetch;
  } = {},
): Promise<VerificationResult> {
  const secretKey = options.secretKey ?? process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return "unavailable";

  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await (options.fetcher ?? fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!response.ok) return "unavailable";

    const result = (await response.json()) as SiteverifyResponse;
    if (!result.success || result.action !== "deploy") return "invalid";
    if (
      options.expectedHostname &&
      result.hostname?.toLowerCase() !== options.expectedHostname.toLowerCase()
    ) {
      return "invalid";
    }
    return "valid";
  } catch {
    return "unavailable";
  }
}
