/** Things the site must never show (spec #6, user story 39). */
const NEVER_SHOW: { item: string; pattern: RegExp }[] = [
  { item: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.]+|mailto:/i },
  { item: "phone", pattern: /tel:|\+\d[\d\s/-]{6,}\d|\b0\d{2,4}[\s/-]?\d{4,}\b/ },
  {
    item: "street address",
    pattern: /\b\w*(straße|strasse|str\.|weg|platz|gasse)\s+\d+|\b\d+\s+\w+\s+(street|st\.|road|avenue|ave\.)/i,
  },
  { item: "CV", pattern: /\bCV\b|curriculum vitae|\bresum[eé]\b|lebenslauf/i },
  { item: "dj-urska", pattern: /dj[-\s]?urska/i },
  { item: "tado-cli", pattern: /tado[-\s]?cli/i },
  { item: "lisp-skills", pattern: /lisp[-\s]?skills/i },
  { item: "swimming coaching", pattern: /swim\w*\s+(coach|train(er|ing)\s+(kids|children|others))/i },
];

export function neverShowItemsIn(text: string): string[] {
  return NEVER_SHOW.filter(({ pattern }) => pattern.test(text)).map(({ item }) => item);
}
