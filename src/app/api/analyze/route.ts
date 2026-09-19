import { ZodError } from "zod";

import { createEvaluatedMail } from "@/domain/evaluate-mail";
import { analyzeWithDemoPolicy } from "@/lib/jev/demo-provider";
import { analyzeWithJev, DecisionProviderError } from "@/lib/jev/provider";
import { getProviderMode } from "@/lib/jev/runtime";
import { mailInputSchema } from "@/lib/jev/schema";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 24_000;

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function responseHeaders(rateLimit?: { remaining: number; resetAt: number }) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store, max-age=0",
  };
  if (rateLimit) {
    headers["X-RateLimit-Remaining"] = String(rateLimit.remaining);
    headers["X-RateLimit-Reset"] = String(Math.ceil(rateLimit.resetAt / 1_000));
  }
  return headers;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json(
      { error: "Cross-origin requests are not accepted." },
      { status: 403, headers: responseHeaders() },
    );
  }

  const configuredLimit = Number.parseInt(
    process.env.MAILORDINAL_RATE_LIMIT_PER_MINUTE ?? "20",
    10,
  );
  const limit = Number.isFinite(configuredLimit) ? Math.max(configuredLimit, 1) : 20;
  const rateLimit = checkRateLimit(getClientKey(request), limit);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many analysis requests. Please try again shortly." },
      { status: 429, headers: responseHeaders(rateLimit) },
    );
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { error: "Email payload is too large." },
      { status: 413, headers: responseHeaders(rateLimit) },
    );
  }

  try {
    const rawInput: unknown = await request.json();
    const input = mailInputSchema.parse(rawInput);
    const now = new Date();
    const mode = getProviderMode();

    if (mode === "jev" && !process.env.TYPESAFE_API_KEY) {
      return Response.json(
        { error: "Live Jev mode is selected, but TYPESAFE_API_KEY is not configured." },
        { status: 503, headers: responseHeaders(rateLimit) },
      );
    }

    const analysis =
      mode === "jev"
        ? await analyzeWithJev(input, {
            apiKey: process.env.TYPESAFE_API_KEY ?? "",
            model: process.env.TYPESAFE_MODEL ?? "jev-latest",
            now,
          })
        : analyzeWithDemoPolicy(input, now);

    const mail = createEvaluatedMail(crypto.randomUUID(), input, analysis, now);
    return Response.json({ mail }, { status: 201, headers: responseHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "The email payload is invalid.",
          fields: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400, headers: responseHeaders(rateLimit) },
      );
    }

    if (error instanceof DecisionProviderError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: responseHeaders(rateLimit) },
      );
    }

    return Response.json(
      { error: "The email could not be analyzed." },
      { status: 500, headers: responseHeaders(rateLimit) },
    );
  }
}
