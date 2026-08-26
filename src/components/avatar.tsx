const PALETTE = [
  { bg: "#e7edff", fg: "#3355d6" },
  { bg: "#fdeee6", fg: "#c2570c" },
  { bg: "#e6f6ec", fg: "#1f8a4c" },
  { bg: "#fff0f0", fg: "#c0392b" },
  { bg: "#f1eaff", fg: "#6b3fd6" },
];

function colorFor(id: string) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

export function Avatar({
  name,
  id,
  size = 24,
}: {
  name: string;
  id: string;
  size?: number;
}) {
  const { bg, fg } = colorFor(id);
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.45,
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}
