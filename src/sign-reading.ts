export interface SignReading {
  readable: boolean;
  lines: string[];
}

export function parseSignReading(text: string): SignReading {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || !("readable" in value) || !("lines" in value)) {
    throw new Error("The sign response had an unexpected format.");
  }
  const { readable, lines } = value;
  if (typeof readable !== "boolean" || !Array.isArray(lines) || lines.length > 8 ||
      !lines.every((line) => typeof line === "string" && line.length <= 100)) {
    throw new Error("The sign response had an unexpected format.");
  }
  const visibleLines = lines.map((line: string) => line.trim()).filter(Boolean);
  return { readable: readable && visibleLines.length > 0, lines: readable ? visibleLines : [] };
}
