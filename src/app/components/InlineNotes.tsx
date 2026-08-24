import { Fragment, useId, useState } from "react";
import { linkifyHttpUrls, parseInlineNotes } from "../../../shared/inline-notes.mjs";

function TextWithBreaks({ value }: { value: string }) {
  return value.split("\n").map((line, index, lines) => (
    <Fragment key={`${index}-${line}`}>
      {line}
      {index < lines.length - 1 && <br />}
    </Fragment>
  ));
}

function InlineNote({ value, number }: { value: string; number: number }) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const noteId = `inline-note-${generatedId.replaceAll(":", "")}`;

  return (
    <span className={`inline-note ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="inline-note__marker"
        aria-label={`주석 ${number}`}
        aria-describedby={noteId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        [{number}]
      </button>
      <span id={noteId} role="note" className="inline-note__popover">
        {linkifyHttpUrls(value).map((part, index) => part.type === "link" ? (
          <a key={`${index}-${part.value}`} href={part.value} target="_blank" rel="noreferrer">
            {part.value}
          </a>
        ) : (
          <TextWithBreaks key={`${index}-${part.value}`} value={part.value} />
        ))}
      </span>
    </span>
  );
}

export function InlineNotes({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/u);
  let noteNumber = 0;

  return (
    <div className={`annotated-text ${className}`.trim()}>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}>
          {parseInlineNotes(paragraph).map((token, tokenIndex) => token.type === "note" ? (
            <InlineNote
              key={`note-${paragraphIndex}-${tokenIndex}`}
              value={token.value}
              number={++noteNumber}
            />
          ) : (
            <TextWithBreaks key={`text-${tokenIndex}`} value={token.value} />
          ))}
        </p>
      ))}
    </div>
  );
}
