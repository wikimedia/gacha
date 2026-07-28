import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// Card foil effects (ShinyOverlay) play PNG frame sequences by swapping one
// <img>'s src every animation tick. Vite's dev server serves /public assets
// with `Cache-Control: no-cache`, so each frame swap triggers a conditional
// request (304) on every loop — thousands of them. These sequence frames never
// change within a session, so serve them immutable in dev; the browser then
// replays straight from memory cache with no request after the first.
function cacheCardFrames(): Plugin {
  // Matches numbered frames in any *-intro/ or *-loop/ dir, plus the static
  // gold overlay. Other /public assets keep Vite's default revalidation.
  const FRAME_RE = /(?:-intro|-loop)\/[^/]+\.png(?:\?|$)|\/gold-overlay\.png(?:\?|$)/i
  const IMMUTABLE = 'public, max-age=31536000, immutable'
  return {
    name: 'cache-card-frames-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && FRAME_RE.test(req.url)) {
          // Force immutable even though Vite's static handler runs later and
          // would otherwise set `no-cache`.
          const setHeader = res.setHeader.bind(res)
          ;(res as { setHeader: typeof res.setHeader }).setHeader = (name, value) =>
            String(name).toLowerCase() === 'cache-control'
              ? setHeader('Cache-Control', IMMUTABLE)
              : setHeader(name, value)
          res.setHeader('Cache-Control', IMMUTABLE)
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), cacheCardFrames()],
})
