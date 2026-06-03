// Group Slide graphic template for Satori.
// One slide per group in a group-stage draw carousel.
// Dimensions: 1080×1080 (square, matches Instagram carousel spec).
//
// Layout:
//   PLAYOFFE logo (top-left)          [1 / 3] (top-right)
//   ─────────────────────────────────────────────────
//   GROUP A               ← large, brand purple
//   ─────────────────────────────────────────────────
//   ● Sam Chen
//   ● Jordan Kim
//   ● Taylor Brown
//   ● Morgan Lee
//   ─────────────────────────────────────────────────
//   Winter Classic 2026  ·  Intermediate Men's Singles

export interface GroupSlideTemplateData {
  tournamentName: string;
  categoryName: string;
  groupName: string;       // "Group A", "Group B", …
  players: string[];       // full names, ordered by seed / join date
  slideIndex: number;      // 0-based
  totalSlides: number;     // total number of groups in this carousel
  platform: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

function text(content: string, style: Record<string, unknown>): Node {
  return { type: 'span', props: { style, children: content } };
}
function div(style: Record<string, unknown>, ...children: Node[]): Node {
  const mergedStyle = children.length > 0 && !('display' in style)
    ? { display: 'flex', ...style }
    : style;
  return {
    type: 'div',
    props: { style: mergedStyle, children: children.length === 0 ? undefined : children },
  };
}

export function buildGroupSlideElement(data: GroupSlideTemplateData): Node {
  const { tournamentName, categoryName, groupName, players, slideIndex, totalSlides } = data;

  // Scale player font based on count so they always fit
  const playerFontSize = players.length <= 4 ? 32 : players.length <= 6 ? 28 : 24;

  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1080px',
      background: '#0f172a',
      padding: '56px 64px',
      fontFamily: 'Inter',
      position: 'relative',
    },

    // Subtle left accent bar in brand purple
    div({
      position: 'absolute',
      top: '0px',
      left: '0px',
      width: '6px',
      height: '1080px',
      background: 'linear-gradient(180deg, #7c3aed 0%, rgba(124,58,237,0.2) 100%)',
    }),

    // ── Header row ───────────────────────────────────────────────────────────
    div(
      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' },

      // PLAYOFFE brand
      div(
        { display: 'flex', alignItems: 'center', gap: '6px' },
        text('PLAY', { fontSize: '20px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.5px' }),
        text('OFFE', { fontSize: '20px', fontWeight: 700, color: '#7c3aed', letterSpacing: '-0.5px' }),
      ),

      // Slide indicator
      div(
        {
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: '999px',
          padding: '6px 16px',
          gap: '4px',
        },
        text(`${slideIndex + 1}`, {
          fontSize: '16px',
          fontWeight: 700,
          color: '#a78bfa',
        }),
        text(` / ${totalSlides}`, {
          fontSize: '16px',
          color: '#64748b',
        }),
      ),
    ),

    // ── Group name block ─────────────────────────────────────────────────────
    div(
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '1',
        gap: '0px',
      },

      // Top divider
      div({ width: '100%', height: '1px', background: 'rgba(100,116,139,0.2)', marginBottom: '48px' }),

      // Group label
      text(groupName.toUpperCase(), {
        fontSize: '100px',
        fontWeight: 700,
        color: '#7c3aed',
        letterSpacing: '-3px',
        marginBottom: '48px',
      }),

      // Bottom divider
      div({ width: '100%', height: '1px', background: 'rgba(100,116,139,0.2)', marginBottom: '40px' }),

      // Players list
      div(
        { display: 'flex', flexDirection: 'column', width: '100%', gap: '20px' },
        ...players.slice(0, 8).map((name, idx) =>
          div(
            { display: 'flex', alignItems: 'center', gap: '16px' },
            // Seed number
            div(
              {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.25)',
                flexShrink: '0',
              },
              text(String(idx + 1), { fontSize: '14px', fontWeight: 700, color: '#7c3aed' }),
            ),
            text(name, {
              fontSize: `${playerFontSize}px`,
              fontWeight: idx === 0 ? 600 : 400,
              color: idx === 0 ? '#ffffff' : '#cbd5e1',
              letterSpacing: '-0.5px',
            }),
          ),
        ),
      ),

      // Second divider
      div({ width: '100%', height: '1px', background: 'rgba(100,116,139,0.2)', marginTop: '40px' }),
    ),

    // ── Footer ───────────────────────────────────────────────────────────────
    div(
      { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      text(tournamentName, { fontSize: '18px', color: '#475569', letterSpacing: '-0.3px' }),
      text(categoryName, { fontSize: '16px', color: '#334155' }),
    ),
  );
}
