import { splitInlineCode } from "../explain/inline";

/** Renders text where `backticks` mark code. */
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {splitInlineCode(text).map((part, i) => (part.code ? <code key={i}>{part.text}</code> : part.text))}
    </>
  );
}
