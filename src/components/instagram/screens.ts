/**
 * The Instagram sub-navigation.
 *
 * Kept out of the component file so fast refresh keeps working — a module that
 * exports both components and constants defeats it.
 */
export type InstagramScreen = 'overview' | 'composer' | 'posts' | 'audience'

export const INSTAGRAM_SCREENS: Array<{ key: InstagramScreen; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'composer', label: 'Composer' },
  { key: 'posts', label: 'Posts' },
  { key: 'audience', label: 'Audience' },
]
