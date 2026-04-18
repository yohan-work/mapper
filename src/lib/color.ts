const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function randomName(): string {
  const adjectives = ["민첩한", "즐거운", "용감한", "반짝이는", "느긋한", "호기심많은"];
  const animals = ["여우", "수달", "펭귄", "고양이", "너구리", "사슴"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = animals[Math.floor(Math.random() * animals.length)];
  return `${a} ${n}`;
}
