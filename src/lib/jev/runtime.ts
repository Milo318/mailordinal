import "server-only";

export type ProviderMode = "jev" | "demo";

export function getProviderMode(): ProviderMode {
  return process.env.MAILORDINAL_PROVIDER === "jev" ? "jev" : "demo";
}

export function getProviderStatus() {
  const mode = getProviderMode();
  return {
    mode,
    ready: mode === "demo" || Boolean(process.env.TYPESAFE_API_KEY),
    model: mode === "jev" ? (process.env.TYPESAFE_MODEL ?? "jev-latest") : "demo-policy-1",
  } as const;
}
