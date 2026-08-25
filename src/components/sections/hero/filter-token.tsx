"use client";

import { useRef, useState } from "react";
import { TriangleAlert, X } from "lucide-react";

import type { ParsedFilter } from "@/types";
import { useTranslation } from "@/components/language/use-translation";

type FilterTokenProps = {
  filter: ParsedFilter;
  onRemove: (id: string) => void;
  onUpdate: (id: string, label: string) => void;
};

/**
 * One criterion the workspace understood, as an editable token.
 *
 * A confidently-parsed token carries a small Lime dot — the accent's
 * "intelligent parsing" role, used at the smallest possible scale. Anything
 * the parser was unsure of switches to the warning role and gains an icon and
 * the word "Unclear", because the two greens sit close enough in hue that
 * colour alone can never be the signal (Design System §6.5).
 */
export function FilterToken({ filter, onRemove, onUpdate }: FilterTokenProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(filter.label);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onUpdate(filter.id, trimmed);
    else setDraft(filter.label);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="border-border-interactive bg-wash inline-flex h-9 items-center rounded-full border pr-1 pl-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              setDraft(filter.label);
              setEditing(false);
            }
          }}
          aria-label={t("hero.filterToken.editFilterAria", {
            label: filter.label,
          })}
          className="text-body-s text-fg w-32 bg-transparent"
        />
      </span>
    );
  }

  const isUnclear = filter.unclear === true;

  return (
    <span
      className={[
        "group inline-flex h-9 items-center rounded-full border pr-1 pl-3 transition-colors duration-150",
        isUnclear
          ? "border-warning-border bg-warning-bg"
          : "border-border-subtle bg-wash hover:border-border-default",
      ].join(" ")}
    >
      {isUnclear ? (
        <TriangleAlert
          aria-hidden="true"
          className="text-warning mr-1.5 size-3.5 shrink-0"
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-intel mr-2 size-1 shrink-0 rounded-full"
        />
      )}

      <button
        type="button"
        onClick={() => {
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        aria-label={t("hero.filterToken.editFilterAria", {
          label: filter.label,
        })}
        className={[
          "text-body-s rounded-full transition-colors duration-150",
          isUnclear ? "text-warning" : "text-fg-secondary group-hover:text-fg",
        ].join(" ")}
      >
        {filter.label}
      </button>

      <button
        type="button"
        onClick={() => onRemove(filter.id)}
        aria-label={t("hero.filterToken.removeFilterAria", {
          label: filter.label,
        })}
        className="text-fg-muted hover:bg-subtle hover:text-fg ml-1.5 flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}
