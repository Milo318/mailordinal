import {
  DEPARTMENTS,
  MESSAGE_TYPES,
  SENSITIVITY_LEVELS,
  TIME_WINDOWS,
  type ChoiceAnswer,
  type DecisionAnalysis,
  type MailInput,
  type MessageType,
  type ScoreAnswer,
} from "@/domain/mail";

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalize<T extends string>(values: Record<T, number>): Record<T, number> {
  const total = Object.values<number>(values).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    Object.entries<number>(values).map(([key, value]) => [key, value / total]),
  ) as Record<T, number>;
}

function choiceAnswer<T extends string>(probabilities: Record<T, number>): ChoiceAnswer<T> {
  const normalized = normalize(probabilities);
  const ordered = (Object.entries(normalized) as Array<[T, number]>).toSorted(
    (left, right) => right[1] - left[1],
  );
  const first = ordered[0] ?? [Object.keys(normalized)[0] as T, 0];
  const second = ordered[1]?.[1] ?? 0;
  return {
    type: "choice",
    choice: first[0],
    probabilities: normalized,
    confidence: clamp(first[1] - second + 0.25),
  };
}

function distribute<T extends readonly string[]>(
  options: T,
  preferred: T[number],
  preferredWeight = 0.78,
): Record<T[number], number> {
  const remainder = (1 - preferredWeight) / Math.max(options.length - 1, 1);
  return Object.fromEntries(
    options.map((option) => [option, option === preferred ? preferredWeight : remainder]),
  ) as Record<T[number], number>;
}

function scoreAnswer(target: number): ScoreAnswer {
  const raw = Object.fromEntries(
    [0, 1, 2, 3].map((level) => [
      String(level),
      Math.max(0.04, 1.15 - Math.abs(level - target)),
    ]),
  );
  const probabilities = normalize(raw);
  const score = Object.entries(probabilities).reduce(
    (sum, [level, probability]) => sum + Number(level) * probability,
    0,
  );
  const ordered = Object.values(probabilities).toSorted((a, b) => b - a);
  return {
    type: "score",
    score,
    confidence: clamp((ordered[0] ?? 0) - (ordered[1] ?? 0) + 0.35),
    legend: {
      "0": "No material impact; informational only",
      "1": "Minor inconvenience or routine delay",
      "2": "Meaningful operational, customer, or commercial impact",
      "3": "Critical outage, legal deadline, security exposure, or substantial financial impact",
    },
    probabilities,
  };
}

function detectDepartment(text: string) {
  const scores = Object.fromEntries(
    DEPARTMENTS.map((department) => [department, 0.08]),
  ) as Record<(typeof DEPARTMENTS)[number], number>;
  const keywordGroups: Array<[(typeof DEPARTMENTS)[number], string[], number]> = [
    ["sales", ["quote", "pricing", "licenses", "angebot", "preis"], 2.2],
    ["sales", ["demo", "purchase"], 0.65],
    [
      "support",
      [
        "production down",
        "outage",
        "blocked from signing in",
        "cannot sign in",
        "error",
        "bug",
        "broken",
        "fehler",
        "störung",
      ],
      2.5,
    ],
    ["support", ["login", "support", "incident"], 0.9],
    [
      "finance",
      ["invoice", "payment", "refund", "bank", "rechnung", "zahlung", "konto"],
      2.1,
    ],
    ["people", ["candidate", "application", "hiring", "bewerbung", "lebenslauf"], 2.2],
    [
      "legal",
      ["contract", "dpa", "legal", "privacy", "compliance", "vertrag", "datenschutz"],
      2.4,
    ],
    ["partnerships", ["partnership", "reseller", "alliance", "kooperation"], 2.3],
    ["partnerships", ["partner", "integration"], 0.45],
  ];
  for (const [department, keywords, weight] of keywordGroups) {
    if (includesAny(text, keywords)) scores[department] += weight;
  }
  if (Math.max(...Object.values(scores)) <= 0.08) scores.general += 0.7;
  return choiceAnswer(scores);
}

function detectMessageType(text: string): MessageType {
  if (
    includesAny(text, ["following up", "again", "still waiting", "erneut", "nachfrage"])
  ) {
    return "follow_up";
  }
  if (includesAny(text, ["complaint", "unacceptable", "disappointed", "beschwerde"])) {
    return "complaint";
  }
  if (includesAny(text, ["approve", "approval", "sign off", "genehmigen", "freigabe"])) {
    return "approval";
  }
  if (includesAny(text, ["please", "could you", "send", "need", "bitte", "benötigen"])) {
    return "request";
  }
  if (text.includes("?")) return "question";
  return "information";
}

/**
 * Transparent local policy for the public demo and tests. Its answers are
 * always labelled as demo output and are never presented as Jev inference.
 */
export function analyzeWithDemoPolicy(
  input: MailInput,
  now = new Date(),
): DecisionAnalysis {
  const text = `${input.subject}\n${input.body}`.toLowerCase();
  const type = detectMessageType(text);
  const replyRequired = clamp(
    0.12 +
      (text.includes("?") ? 0.44 : 0) +
      (includesAny(text, ["please", "could you", "let us know", "bitte", "können sie"])
        ? 0.24
        : 0) +
      (includesAny(text, ["confirm", "reply", "respond", "who owns", "bestätigen"])
        ? 0.5
        : 0) +
      (type === "follow_up" ? 0.4 : 0),
  );
  const actionRequired = clamp(
    0.1 +
      (includesAny(text, [
        "need",
        "please",
        "issue",
        "approve",
        "send",
        "benötigen",
        "bitte",
      ])
        ? 0.58
        : 0) +
      (["request", "complaint", "approval", "follow_up"].includes(type) ? 0.2 : 0),
  );
  const blocked = includesAny(text, [
    "blocked",
    "cannot continue",
    "production down",
    "outage",
    "still cannot",
    "können nicht",
    "steht still",
  ])
    ? 0.9
    : 0.12;
  const followUp = type === "follow_up" ? 0.92 : 0.08;

  let timeWindow: (typeof TIME_WINDOWS)[number] = "none";
  if (includesAny(text, ["immediately", "urgent", "today", "asap", "sofort", "heute"])) {
    timeWindow = "immediate";
  } else if (includesAny(text, ["tomorrow", "24 hours", "morgen", "24 stunden"])) {
    timeWindow = "within_24h";
  } else if (includesAny(text, ["friday", "this week", "freitag", "diese woche"])) {
    timeWindow = "this_week";
  }

  let sensitivity: (typeof SENSITIVITY_LEVELS)[number] = "normal";
  if (includesAny(text, ["bank", "invoice", "payment", "refund", "iban", "rechnung"])) {
    sensitivity = "financial";
  } else if (includesAny(text, ["contract", "legal", "dpa", "compliance", "vertrag"])) {
    sensitivity = "legal";
  } else if (
    includesAny(text, [
      "password",
      "credential",
      "breach",
      "vulnerability",
      "security incident",
      "unauthorized access",
      "cve-",
    ])
  ) {
    sensitivity = "security";
  } else if (
    includesAny(text, ["candidate", "personal data", "health data", "resume", "bewerbung"])
  ) {
    sensitivity = "personal_data";
  }

  let impactTarget = 0.5;
  if (blocked > 0.7) impactTarget = 2.9;
  else if (actionRequired > 0.7 && timeWindow !== "none") impactTarget = 2.05;
  else if (actionRequired > 0.6 || replyRequired > 0.65) impactTarget = 1.35;

  return {
    source: "demo",
    model: "mailordinal-demo-policy-1",
    evaluatedAt: now.toISOString(),
    usage: { inputTokens: 0, outputTokens: 0 },
    answers: {
      department: detectDepartment(text),
      reply_required: { type: "noul", noul: replyRequired },
      action_required: { type: "noul", noul: actionRequired },
      message_type: choiceAnswer(distribute(MESSAGE_TYPES, type)),
      customer_blocked: { type: "noul", noul: blocked },
      is_follow_up: { type: "noul", noul: followUp },
      time_window: choiceAnswer(distribute(TIME_WINDOWS, timeWindow)),
      delay_impact: scoreAnswer(impactTarget),
      sensitivity: choiceAnswer(distribute(SENSITIVITY_LEVELS, sensitivity)),
    },
  };
}
