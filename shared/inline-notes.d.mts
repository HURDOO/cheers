export interface InlineTextToken {
  type: "text";
  value: string;
}

export interface InlineNoteToken {
  type: "note";
  value: string;
  number: number;
}

export interface NoteTextPart {
  type: "text";
  value: string;
}

export interface NoteLinkPart {
  type: "link";
  value: string;
}

export function parseInlineNotes(value: string): Array<InlineTextToken | InlineNoteToken>;
export function linkifyHttpUrls(value: string): Array<NoteTextPart | NoteLinkPart>;
