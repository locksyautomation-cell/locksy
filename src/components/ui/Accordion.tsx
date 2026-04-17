"use client";

import { useState } from "react";

interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {items.map((item) => (
        <div key={item.id}>
          <button
            className="flex w-full items-center justify-between px-6 py-4 text-left font-medium text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
          >
            <span>{item.title}</span>
            <svg
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                openId === item.id ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {openId === item.id && (
            <div className="px-6 pb-4 text-muted-foreground">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
