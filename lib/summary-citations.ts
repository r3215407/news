export type SummaryPart = { text: string; sourceIndex: number | null };

export function parseSummaryCitations(summary: string, sourceCount: number): SummaryPart[] {
  return summary.split(/(\[\d+\]|【\d+】)/g).filter(Boolean).map((text) => {
    const match = /^\[(\d+)\]$|^【(\d+)】$/.exec(text);
    const sourceIndex = match ? Number(match[1] ?? match[2]) - 1 : -1;
    return { text, sourceIndex: sourceIndex >= 0 && sourceIndex < sourceCount ? sourceIndex : null };
  });
}
