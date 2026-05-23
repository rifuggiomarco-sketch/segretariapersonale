import React from "react";

interface BriefingRendererProps {
  content: string;
}

export default function BriefingRenderer({ content }: BriefingRendererProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let ulBuffer: React.ReactNode[] = [];

  const flushUl = () => {
    if (ulBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-none space-y-1 mb-4">
          {ulBuffer}
        </ul>
      );
      ulBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushUl();
      elements.push(
        <h2 key={i} className="text-2xl font-bold text-foreground mt-6 mb-3 pt-4 border-t border-border">
          {line.replace(/^## /, "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushUl();
      elements.push(
        <h3 key={i} className="text-sm font-semibold tracking-widest text-accent uppercase mt-4 mb-2">
          {line.replace(/^### /, "")}
        </h3>
      );
    } else if (/^[-•*] /.test(line)) {
      ulBuffer.push(
        <li key={i} className="text-sm text-foreground flex items-start gap-2">
          <span className="text-accent flex-shrink-0">→</span>
          <span>{line.replace(/^[-•*] /, "")}</span>
        </li>
      );
    } else if (line === "") {
      flushUl();
    } else if (line.trim()) {
      flushUl();
      elements.push(
        <p key={i} className="text-sm text-foreground mb-3 leading-relaxed">
          {line}
        </p>
      );
    }
  });

  flushUl();

  return (
    <div className="space-y-2 text-foreground">
      {elements}
    </div>
  );
}
