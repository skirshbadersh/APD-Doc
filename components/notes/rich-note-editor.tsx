"use client";

import { useRef, useEffect, useCallback } from "react";
import { markdownToHtml, htmlToMarkdown } from "@/lib/rich-text";

interface RichNoteEditorProps {
  value: string; // markdown format
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  rows?: number;
}

/**
 * Rich text note editor using contenteditable.
 * Stores markdown (**bold**) internally, renders as actual bold visually.
 */
export function RichNoteEditor({ value, onChange, readOnly = false, rows = 16 }: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const internalUpdate = useRef(false);

  // Sync value → DOM only when the value changes externally
  useEffect(() => {
    if (internalUpdate.current) {
      internalUpdate.current = false;
      return;
    }
    const el = editorRef.current;
    if (!el) return;

    const html = markdownToHtml(value);
    if (el.innerHTML !== html) {
      // Save cursor position
      const sel = window.getSelection();
      const hadFocus = document.activeElement === el;
      let savedOffset = 0;
      if (hadFocus && sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        savedOffset = preRange.toString().length;
      }

      el.innerHTML = html;

      // Restore cursor if we had focus (best effort)
      if (hadFocus) {
        try {
          restoreCursor(el, savedOffset);
        } catch {
          // cursor restoration failed, not critical
        }
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    internalUpdate.current = true;
    const md = htmlToMarkdown(el.innerHTML);
    onChange(md);
  }, [onChange]);

  // Handle paste — strip formatting except bold
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Ctrl+B to toggle bold
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      document.execCommand("bold", false);
      handleInput();
    }
  }, [handleInput]);

  const minHeight = rows * 24; // ~24px per line

  return (
    <div
      ref={editorRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      className={`w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-y-auto ${
        readOnly ? "opacity-70 cursor-default" : ""
      }`}
      style={{ minHeight: `${minHeight}px`, maxHeight: `${minHeight + 200}px`, whiteSpace: "pre-wrap", wordWrap: "break-word" }}
    />
  );
}

/** Best-effort cursor restoration by character offset */
function restoreCursor(el: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let current = 0;
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const len = node.textContent?.length ?? 0;
    if (current + len >= offset) {
      const range = document.createRange();
      range.setStart(node, offset - current);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    current += len;
  }
}
