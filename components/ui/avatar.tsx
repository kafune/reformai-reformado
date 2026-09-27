import { initials } from "@/lib/format";

export function Avatar({
  name,
  color = "var(--rai-green-700)",
  size = 32,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight text-bone-50"
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
