export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-iron-600">{messages.join(" ")}</p>;
}
