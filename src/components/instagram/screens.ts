import { BarChart3, Images, PenSquare, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The Instagram sub-navigation.
 *
 * Kept out of the component file so fast refresh keeps working — a module that
 * exports both components and constants defeats it.
 */
export type InstagramScreen = 'overview' | 'composer' | 'posts' | 'audience'

export const INSTAGRAM_SCREENS: Array<{
  key: InstagramScreen
  label: string
  icon: LucideIcon
}> = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'composer', label: 'Composer', icon: PenSquare },
  { key: 'posts', label: 'Posts', icon: Images },
  { key: 'audience', label: 'Audience', icon: Users },
]

/** Page title and description for each screen, mirroring the website sections. */
export const INSTAGRAM_SCREEN_META: Record<
  InstagramScreen,
  { title: string; description: string }
> = {
  overview: {
    title: 'Instagram Overview',
    description: 'How the account performed over the selected window.',
  },
  composer: {
    title: 'Composer',
    description: 'Write, stage and publish a post to @tamidnyu.',
  },
  posts: {
    title: 'Posts',
    description: 'How each recent post performed, highest reach first.',
  },
  audience: {
    title: 'Audience',
    description: 'Who follows the account, by city, country, age or gender.',
  },
}
