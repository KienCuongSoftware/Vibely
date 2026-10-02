/**
 * Discovery data without the given LIVE (it ended while the page was open).
 * @param {import('../api/liveContracts.js').LiveDiscovery|null} discovery
 * @param {string} liveId
 */
export function removeFromDiscovery(discovery, liveId) {
  if (!discovery) return discovery
  const keep = (live) => live.id !== liveId
  return {
    ...discovery,
    featured: discovery.featured.filter(keep),
    recommended: discovery.recommended.filter(keep),
    sections: discovery.sections.map((section) => ({ ...section, items: section.items.filter(keep) })),
    recommendedHosts: discovery.recommendedHosts.filter(keep),
  }
}
