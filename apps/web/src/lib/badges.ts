/**
 * Badge definitions for the PLAYOFFE platform.
 *
 * Each badge has a slug (PK), a display label, an emoji icon, and a description.
 * Criteria are checked server-side in awardBadgesAction.
 */

export interface BadgeDef {
  slug: string;
  label: string;
  icon: string;
  description: string;
  color: string; // Tailwind text color class
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    slug: 'first_match',
    label: 'First Match',
    icon: '🎾',
    description: 'Played your first rated match',
    color: 'text-slate-300',
  },
  {
    slug: 'first_win',
    label: 'First Win',
    icon: '🏅',
    description: 'Won your first rated match',
    color: 'text-amber-300',
  },
  {
    slug: 'ten_wins',
    label: '10 Wins',
    icon: '🔟',
    description: 'Accumulated 10 match wins',
    color: 'text-blue-300',
  },
  {
    slug: 'fifty_wins',
    label: '50 Wins',
    icon: '💫',
    description: 'Accumulated 50 match wins',
    color: 'text-purple-300',
  },
  {
    slug: 'tournament_champion',
    label: 'Champion',
    icon: '🏆',
    description: 'Won a tournament category',
    color: 'text-yellow-300',
  },
  {
    slug: 'hat_trick',
    label: 'Hat-Trick',
    icon: '🎩',
    description: 'Won 3 matches in a row',
    color: 'text-green-300',
  },
  {
    slug: 'rising_star',
    label: 'Rising Star',
    icon: '⭐',
    description: 'Rating increased by 0.5 or more',
    color: 'text-yellow-200',
  },
  {
    slug: 'veteran',
    label: 'Veteran',
    icon: '🦅',
    description: 'Played 50 or more rated matches',
    color: 'text-orange-300',
  },
  {
    slug: 'well_connected',
    label: 'Well Connected',
    icon: '🤝',
    description: 'Gained 10 or more followers',
    color: 'text-cyan-300',
  },
];

export const BADGE_MAP = new Map<string, BadgeDef>(
  BADGE_DEFS.map((b) => [b.slug, b]),
);
