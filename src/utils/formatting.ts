export interface ContractSection {
  title: string;
  content: string;
}

export interface ContractMetadata {
  title: string;
  date: string;
  parties: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FormattedContract {
  formatted_text: string;
  html: string;
  sections: ContractSection[];
  metadata: ContractMetadata;
}

const headingPattern = /^(?:ARTICLE|SECTION|CLAUSE|ANNEXE|CHAPITRE|TITRE)\b|^\d+(?:[.)]\d*)*\s+|^[A-ZÉÈÀÇÂÊÎÔÛÄËÏÖÜ0-9][A-ZÉÈÀÇÂÊÎÔÛÄËÏÖÜ0-9\s,'’\-]{3,}$/u;

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;

  const slice = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(slice);
  } catch (error) {
    console.warn('[formatContract] Failed to parse JSON payload from AI response', error);
    return null;
  }
}

function normaliseWhitespace(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\u2028|\u2029/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

function extractTextFromObject(data: any): { text: string; metadata: Partial<ContractMetadata>; sections?: ContractSection[] } {
  if (data == null) return { text: '', metadata: {} };

  if (typeof data === 'string') {
    return { text: data, metadata: {} };
  }

  if (typeof data === 'object') {
    if (Array.isArray((data as any).sections)) {
      const mapped: ContractSection[] = (data as any).sections
        .map((sectionEntry: any) => ({
          title: String(sectionEntry?.title ?? sectionEntry?.heading ?? '').trim(),
          content: normaliseWhitespace(String(sectionEntry?.content ?? sectionEntry?.body ?? '')),
        }))
        .filter((sectionEntry) => sectionEntry.title || sectionEntry.content);

      const text = mapped
        .map((section) => [section.title, section.content].filter(Boolean).join('\n'))
        .join('\n\n');

      return {
        text,
        metadata: {
          title: String((data as any).title ?? (data as any).metadata?.title ?? '').trim(),
          date: String((data as any).date ?? (data as any).metadata?.date ?? '').trim(),
          parties: (data as any).metadata?.parties ?? (data as any).parties ?? {},
          ...((data as any).metadata ?? {}),
        },
        sections: mapped,
      };
    }

    if (typeof (data as any).formatted_text === 'string') {
      return {
        text: normaliseWhitespace((data as any).formatted_text),
        metadata: {
          title: String((data as any).title ?? (data as any).metadata?.title ?? '').trim(),
          date: String((data as any).metadata?.date ?? (data as any).date ?? '').trim(),
          parties: (data as any).metadata?.parties ?? (data as any).parties ?? {},
          ...((data as any).metadata ?? {}),
        },
      };
    }

    if (typeof (data as any).body === 'string') {
      return {
        text: normaliseWhitespace((data as any).body),
        metadata: {
          title: String((data as any).title ?? (data as any).metadata?.title ?? '').trim(),
          date: String((data as any).metadata?.date ?? (data as any).date ?? '').trim(),
          parties: (data as any).metadata?.parties ?? (data as any).parties ?? {},
          ...((data as any).metadata ?? {}),
        },
      };
    }

    return { text: JSON.stringify(data, null, 2), metadata: {} };
  }

  return { text: String(data), metadata: {} };
}

function buildSectionsFromText(text: string): ContractSection[] {
  const lines = normaliseWhitespace(text).split(/\n/);
  const sections: ContractSection[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentContent.length) currentContent.push('');
      continue;
    }

    if (headingPattern.test(line)) {
      if (currentTitle || currentContent.length) {
        sections.push({ title: currentTitle || 'Section', content: currentContent.join('\n').trim() });
      }
      currentTitle = line.replace(/\s+/g, ' ').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle || currentContent.length) {
    sections.push({ title: currentTitle || 'Section', content: currentContent.join('\n').trim() });
  }

  return sections.filter((section) => section.title || section.content);
}

function inferTitle(sections: ContractSection[], fallbackText: string): string {
  if (sections.length && sections[0].title) {
    return sections[0].title.replace(/^[\d.\s-]+/, '').trim();
  }
  const firstLine = fallbackText.split(/\n/).find((line) => line.trim());
  if (firstLine) {
    return firstLine.trim();
  }
  return 'Contrat généré';
}

function ensureMetadata(base: Partial<ContractMetadata>, text: string, sections: ContractSection[]): ContractMetadata {
  const parties = (base.parties && typeof base.parties === 'object') ? base.parties : {};
  const date = typeof base.date === 'string' && base.date.trim() ? base.date : new Date().toISOString().split('T')[0];
  const title = typeof base.title === 'string' && base.title.trim() ? base.title : inferTitle(sections, text);

  return {
    ...base,
    title,
    date,
    parties,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function convertMarkdownToHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  const htmlBlocks = blocks.map((block) => {
    const lines = block.split(/\n/);
    const firstLine = lines[0]?.trim() ?? '';

    const headingMatch = /^#{1,6}\s+(.*)/.exec(firstLine);
    if (headingMatch) {
      const level = Math.min(headingMatch[0].replace(/\s.*$/, '').length, 6);
      const content = escapeHtml(headingMatch[1].trim());
      const remaining = lines.slice(1).join('\n').trim();
      const paragraph = remaining
        ? `<p>${escapeHtml(remaining).replace(/\n/g, '<br />')}</p>`
        : '';
      return `<h${level}>${content}</h${level}>${paragraph}`;
    }

    if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
      const items = lines
        .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, '').trim())}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }

    if (lines.every((line) => /^\d+[.)]\s+/.test(line.trim()))) {
      const items = lines
        .map((line) => `<li>${escapeHtml(line.replace(/^\d+[.)]\s+/, '').trim())}</li>`)
        .join('');
      return `<ol>${items}</ol>`;
    }

    if (headingPattern.test(firstLine)) {
      const headingText = escapeHtml(firstLine.replace(/^\d+[.)-]*\s*/, '').trim());
      const remaining = lines.slice(1).join('\n').trim();
      const paragraph = remaining
        ? `<p>${escapeHtml(remaining).replace(/\n/g, '<br />')}</p>`
        : '';
      return `<h2>${headingText}</h2>${paragraph}`;
    }

    const escaped = lines
      .map((line) => escapeHtml(line))
      .join('<br />');
    return `<p>${escaped}</p>`;
  });

  return `<article class="contract-document">${htmlBlocks.join('\n')}</article>`;
}

export function formatContract(rawInput: unknown): FormattedContract {
  let textSource = '';
  let metadata: Partial<ContractMetadata> = {};
  let presetSections: ContractSection[] | undefined;

  if (typeof rawInput === 'string') {
    const parsed = tryParseJson(rawInput);
    if (parsed && typeof parsed === 'object') {
      const extracted = extractTextFromObject(parsed);
      textSource = extracted.text;
      metadata = extracted.metadata;
      presetSections = extracted.sections;
    } else {
      textSource = rawInput;
    }
  } else {
    const extracted = extractTextFromObject(rawInput);
    textSource = extracted.text;
    metadata = extracted.metadata;
    presetSections = extracted.sections;
  }

  const normalizedText = normaliseWhitespace(textSource);
  const sections = presetSections ?? buildSectionsFromText(normalizedText);
  const ensuredMetadata = ensureMetadata(metadata, normalizedText, sections);
  const html = convertMarkdownToHtml(normalizedText);

  return {
    formatted_text: normalizedText,
    html,
    sections,
    metadata: ensuredMetadata,
  };
}
