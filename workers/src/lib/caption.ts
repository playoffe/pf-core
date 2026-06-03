import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import type { TriggerType } from '../queue.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CaptionStyle = 'hype' | 'humble' | 'motivational' | 'funny' | 'ai' | 'custom';

export interface CaptionContext {
  triggerType: TriggerType;
  playerName: string;
  opponentName?: string;
  score?: string;            // e.g. "11-7, 8-11, 11-9"
  tournamentName: string;
  categoryName: string;
  playerRank?: number;
  winStreak?: number;
  /** Only used when captionStyle === 'custom' */
  customTemplate?: string;
}

// ── Pre-built templates ───────────────────────────────────────────────────────

const TEMPLATES: Record<Exclude<CaptionStyle, 'ai' | 'custom'>, string> = {
  hype: [
    "LET'S GO! 🔥 Took down {opponent} {score} at {tournament}! Feeling unstoppable. 💪 #{category} #pickleball #matchwin",
    "WINNER! Beat {opponent} {score} at {tournament}. {category} — no one stopping us now! 🏆 #pickleball",
  ][Math.floor(Math.random() * 2)],
  humble: [
    "Good match today. Beat {opponent} {score} at {tournament} ({category}). Grateful for every game. 🏓 #pickleball",
    "Hard-fought win over {opponent} — {score} at {tournament}. Every point counts. #{category} #pickleball",
  ][Math.floor(Math.random() * 2)],
  motivational: [
    "One step closer. {score} over {opponent} at {tournament}. The grind never stops. 💪 #{category} #pickleball",
    "Results follow effort. Beat {opponent} {score} at {tournament}. Keep showing up. 🏓 #{category}",
  ][Math.floor(Math.random() * 2)],
  funny: [
    "Sorry not sorry, {opponent} 😂 {score} and it wasn't even close at {tournament}. #{category} #pickleball",
    "My opponents keep underestimating me. {opponent} just found out the hard way — {score} 🤣 #{category}",
  ][Math.floor(Math.random() * 2)],
};

// ── Placeholder substitution ──────────────────────────────────────────────────

function fillTemplate(template: string, ctx: CaptionContext): string {
  return template
    .replace(/\{player\}/g, ctx.playerName)
    .replace(/\{opponent\}/g, ctx.opponentName ?? 'my opponent')
    .replace(/\{score\}/g, ctx.score ?? '')
    .replace(/\{tournament\}/g, ctx.tournamentName)
    .replace(/\{category\}/g, ctx.categoryName)
    .replace(/\{rank\}/g, ctx.playerRank != null ? `#${ctx.playerRank}` : '')
    .replace(/\{streak\}/g, ctx.winStreak != null ? `${ctx.winStreak} in a row` : '');
}

// ── AI caption via Claude ─────────────────────────────────────────────────────

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for AI captions');
    }
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

async function generateAICaption(ctx: CaptionContext): Promise<string> {
  const client = getAnthropic();

  const triggerDesc =
    ctx.triggerType === 'match_win'           ? `won a match against ${ctx.opponentName ?? 'their opponent'} with score ${ctx.score ?? ''}` :
    ctx.triggerType === 'category_complete'   ? `completed the ${ctx.categoryName} category` :
    ctx.triggerType === 'tournament_complete' ? `finished the ${ctx.tournamentName} tournament` :
    'achieved something great';

  const prompt = [
    `Write a short, authentic social media caption (max 220 characters) for a pickleball player named "${ctx.playerName}" who just ${triggerDesc} at "${ctx.tournamentName}".`,
    `Category: ${ctx.categoryName}.`,
    ctx.playerRank != null ? `Their current global ranking is #${ctx.playerRank}.` : '',
    ctx.winStreak != null  ? `They are on a ${ctx.winStreak}-match win streak.` : '',
    'Include 1-3 relevant hashtags. Be natural and conversational — avoid clichés.',
    'Return only the caption text, nothing else.',
  ].filter(Boolean).join(' ');

  const msg = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  return text.trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateCaption(
  style: CaptionStyle,
  ctx: CaptionContext,
): Promise<string> {
  if (style === 'ai') {
    try {
      return await generateAICaption(ctx);
    } catch (err) {
      console.error('[caption] AI generation failed, falling back to humble:', err);
      return fillTemplate(TEMPLATES.humble, ctx);
    }
  }

  if (style === 'custom' && ctx.customTemplate) {
    return fillTemplate(ctx.customTemplate, ctx);
  }

  const template = TEMPLATES[style as keyof typeof TEMPLATES] ?? TEMPLATES.humble;
  return fillTemplate(template, ctx);
}
