/** Maps Explore API tab slug → i18n key under `exploreCategories.*` (fallback: API name). */
export const EXPLORE_CATEGORY_I18N_KEYS = {
  'for-you': 'exploreCategories.forYou',
  music: 'exploreCategories.music',
  dance: 'exploreCategories.dance',
  beauty: 'exploreCategories.beauty',
  fashion: 'exploreCategories.fashion',
  food: 'exploreCategories.food',
  travel: 'exploreCategories.travel',
  sports: 'exploreCategories.sports',
  fitness: 'exploreCategories.fitness',
  gaming: 'exploreCategories.gaming',
  comedy: 'exploreCategories.comedy',
  pets: 'exploreCategories.pets',
  education: 'exploreCategories.education',
  technology: 'exploreCategories.technology',
  news: 'exploreCategories.news',
  lifestyle: 'exploreCategories.lifestyle',
  family: 'exploreCategories.family',
  automotive: 'exploreCategories.automotive',
  art: 'exploreCategories.art',
  finance: 'exploreCategories.finance',
  anime: 'exploreCategories.anime',
  horror: 'exploreCategories.horror',
  romance: 'exploreCategories.romance',
  action: 'exploreCategories.action',
  thriller: 'exploreCategories.thriller',
  scifi: 'exploreCategories.scifi',
  movies: 'exploreCategories.movies',
  documentary: 'exploreCategories.documentary',
  meme: 'exploreCategories.meme',
  prank: 'exploreCategories.prank',
  challenge: 'exploreCategories.challenge',
  reaction: 'exploreCategories.reaction',
  asmr: 'exploreCategories.asmr',
  motivation: 'exploreCategories.motivation',
  diy: 'exploreCategories.diy',
  nature: 'exploreCategories.nature',
  photography: 'exploreCategories.photography',
  magic: 'exploreCategories.magic',
  cosplay: 'exploreCategories.cosplay',
  books: 'exploreCategories.books',
  science: 'exploreCategories.science',
  history: 'exploreCategories.history',
  language: 'exploreCategories.language',
  health: 'exploreCategories.health',
  kids: 'exploreCategories.kids',
  wedding: 'exploreCategories.wedding',
  relationships: 'exploreCategories.relationships',
  career: 'exploreCategories.career',
  realestate: 'exploreCategories.realestate',
  camping: 'exploreCategories.camping',
  fishing: 'exploreCategories.fishing',
  farming: 'exploreCategories.farming',
  unboxing: 'exploreCategories.unboxing',
  review: 'exploreCategories.review',
  podcast: 'exploreCategories.podcast',
  instruments: 'exploreCategories.instruments',
  kpop: 'exploreCategories.kpop',
  vpop: 'exploreCategories.vpop',
  mukbang: 'exploreCategories.mukbang',
  streetfood: 'exploreCategories.streetfood',
  spirituality: 'exploreCategories.spirituality',
  viral: 'exploreCategories.viral',
  other: 'exploreCategories.other',
}

export function localizeExploreTabName(tab, t) {
  if (!tab) return ''
  if (tab.slug === 'all') return t('explorePage.all')
  if (tab.kind === 'for_you' || tab.slug === 'for-you') return t('explorePage.forYou')
  const key = EXPLORE_CATEGORY_I18N_KEYS[tab.slug]
  if (key) {
    const translated = t(key)
    if (translated && translated !== key) return translated
  }
  return tab.name || tab.slug || ''
}
