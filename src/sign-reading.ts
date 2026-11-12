export interface SignReading {
  readable: boolean;
  lines: string[];
  arrows?: SignArrow[];
}

export interface SignArrow {
  label: string;
  direction: "left" | "right";
}

function isSignArrow(value: unknown): value is SignArrow {
  return !!value && typeof value === "object" && "label" in value && "direction" in value &&
    typeof value.label === "string" && value.label.length <= 100 && value.label.trim() !== "" &&
    (value.direction === "left" || value.direction === "right");
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
  const reading: SignReading = { readable: readable && visibleLines.length > 0, lines: readable ? visibleLines : [] };
  if ("arrows" in value) {
    if (!Array.isArray(value.arrows) || value.arrows.length > 8 || !value.arrows.every(isSignArrow)) {
      throw new Error("The sign response had an unexpected arrow format.");
    }
    if (reading.readable) {
      reading.arrows = value.arrows.map(({ label, direction }) => ({ label: label.trim(), direction }));
    }
  }
  return reading;
}
