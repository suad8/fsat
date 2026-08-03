import { Fragment, type ReactNode } from "react";

/**
 * عارض Markdown مبسّط.
 *
 * مكتوب يدويًا بدل استخدام مكتبة لسببين:
 *
 *  • **الأمان**: لا يمرّر أي HTML خام إطلاقًا. النص يُقسَّم ويُبنى كعناصر
 *    React، فلا يمكن لمحتوى محرَّر من لوحة التحكم أن يحقن سكربتًا — وهذا
 *    ما يجعل تعطيل مكتبات مثل dangerouslySetInnerHTML غير ضروري أصلاً.
 *
 *  • **الحجم**: مكتبات Markdown الكاملة تضيف عشرات الكيلوبايتات لعرض
 *    صفحات سياسات بسيطة.
 *
 *  المدعوم: العناوين، الفقرات، القوائم المرقّمة وغير المرقّمة، الاقتباسات،
 *  الجداول، الخط الفاصل، النص العريض، والروابط.
 */

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "divider" };

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "") {
      index += 1;
      continue;
    }

    // --- خط فاصل ---
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      blocks.push({ type: "divider" });
      index += 1;
      continue;
    }

    // --- عنوان ---
    const heading = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 2 | 3 | 4,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    // --- اقتباس ---
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    // --- جدول ---
    if (trimmed.startsWith("|") && index + 1 < lines.length) {
      const separator = lines[index + 1].trim();
      if (/^\|[\s:|-]+\|$/.test(separator)) {
        const header = splitRow(trimmed);
        index += 2;

        const rows: string[][] = [];
        while (index < lines.length && lines[index].trim().startsWith("|")) {
          rows.push(splitRow(lines[index].trim()));
          index += 1;
        }

        blocks.push({ type: "table", header, rows });
        continue;
      }
    }

    // --- قائمة ---
    const unordered = /^[-*]\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed);

    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index].trim();
        const match = isOrdered
          ? /^\d+[.)]\s+(.*)$/.exec(current)
          : /^[-*]\s+(.*)$/.exec(current);

        if (!match) break;
        items.push(match[1].trim());
        index += 1;
      }

      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    // --- فقرة: تُجمع الأسطر المتتالية حتى سطر فارغ ---
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "") {
      const current = lines[index].trim();
      // نتوقّف عند بداية أي كتلة أخرى
      if (
        /^(#{2,4})\s/.test(current) ||
        current.startsWith(">") ||
        current.startsWith("|") ||
        /^[-*]\s/.test(current) ||
        /^\d+[.)]\s/.test(current)
      ) {
        break;
      }
      paragraph.push(current);
      index += 1;
    }

    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    } else {
      // حماية من حلقة لا نهائية إن لم يطابق السطر أي نمط
      index += 1;
    }
  }

  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * التنسيق داخل السطر: **عريض** و [نص](رابط).
 * يعيد عناصر React لا نصًا، فلا مجال لحقن HTML.
 */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4] !== undefined && match[5] !== undefined) {
      const href = match[5];
      // بروتوكولات آمنة فقط — يمنع javascript: و data:
      const safe = /^(https?:\/\/|\/|mailto:|tel:)/i.test(href);

      nodes.push(
        safe ? (
          <a
            key={key++}
            href={href}
            className="text-accent-700 font-bold underline underline-offset-2"
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {match[4]}
          </a>
        ) : (
          <Fragment key={key++}>{match[4]}</Fragment>
        ),
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const blocks = parse(content);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h2" | "h3" | "h4";
            const size =
              block.level === 2
                ? "text-xl md:text-2xl mt-10 first:mt-0"
                : block.level === 3
                  ? "text-lg md:text-xl mt-8"
                  : "text-base md:text-lg mt-6";
            return (
              <Tag key={index} className={size}>
                {inline(block.text)}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p key={index} className="text-primary-700 leading-[1.9]">
                {inline(block.text)}
              </p>
            );

          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={index}
                className={
                  block.ordered
                    ? "text-primary-700 me-5 list-decimal space-y-2 leading-[1.9]"
                    : "text-primary-700 me-5 list-disc space-y-2 leading-[1.9]"
                }
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="ps-1">
                    {inline(item)}
                  </li>
                ))}
              </Tag>
            );
          }

          case "quote":
            return (
              <blockquote
                key={index}
                className="border-accent-500 bg-accent-50/60 text-primary-700 space-y-2 rounded-e-lg border-s-4 px-5 py-4 text-sm leading-relaxed"
              >
                {block.lines.map((line, lineIndex) => (
                  <p key={lineIndex}>{inline(line)}</p>
                ))}
              </blockquote>
            );

          case "table":
            return (
              <div
                key={index}
                className="border-border overflow-x-auto rounded-lg border"
              >
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken">
                    <tr>
                      {block.header.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          scope="col"
                          className="text-primary-700 px-4 py-3 text-right font-bold"
                        >
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="text-primary-600 px-4 py-3"
                          >
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "divider":
            return <hr key={index} className="border-border my-8" />;
        }
      })}
    </div>
  );
}
