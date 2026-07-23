import type { SendWindow } from "./schemas";

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayByName: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return {
    day: dayByName[values.weekday ?? ""] ?? 0,
    minutes: Number(values.hour ?? 0) * 60 + Number(values.minute ?? 0),
  };
}

function parseClock(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function stableJitterMinutes(seed: string): number {
  return 3 + (Array.from(seed).reduce((total, char) => total + char.charCodeAt(0), 0) % 10);
}

export function isInsideSendWindow(date: Date, window: SendWindow): boolean {
  const local = localParts(date, window.timezone);
  return (
    window.weekdays.includes(local.day) &&
    local.minutes >= parseClock(window.start) &&
    local.minutes <= parseClock(window.end)
  );
}

export function scheduleCampaignStep(input: {
  base: Date;
  delayDays: number;
  delayHours: number;
  window: SendWindow;
  jitterSeed: string;
}): Date {
  const candidate = new Date(
    input.base.getTime() +
      input.delayDays * 86_400_000 +
      input.delayHours * 3_600_000 +
      stableJitterMinutes(input.jitterSeed) * 60_000,
  );
  candidate.setUTCSeconds(0, 0);

  for (let attempt = 0; attempt < 1_400; attempt += 1) {
    if (isInsideSendWindow(candidate, input.window)) return candidate;
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 15);
  }
  throw new Error("Aucun créneau d’envoi valide n’a été trouvé dans les deux semaines.");
}
