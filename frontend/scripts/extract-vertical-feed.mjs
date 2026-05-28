import fs from 'node:fs'

const path = new URL('../src/pages/FeedPage.jsx', import.meta.url)
const out = new URL('../src/components/feed/VerticalVideoFeed.jsx', import.meta.url)
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
const header = lines.slice(0, 55).join('\n')
const helpers = lines.slice(55, 180).join('\n')
let component = lines.slice(181, 1678).join('\n')
component = component.replace(
  'function ForYouFeedPage({ token, user, onLogout, authReady })',
  'export function VerticalVideoFeed({ token, user, onLogout, authReady, feedMode = "latest", activeMenuId = "latest" })',
)
fs.writeFileSync(out, `${header}\n${helpers}\n\n${component}\n`, 'utf8')
console.log('written', out.pathname)
