// ---------------------------------------------------------------------------
// The panel's own web server.
//
// The built totem could be loaded straight off disk with `file://`, and it
// would render — but the app talks to Supabase, and a `file://` page sends
// `Origin: null`, which is not an origin any project's CORS list contains. It
// would paint a menu and fail every query, which is the worst possible way for
// this to break.
//
// So the shell serves its own bundle over loopback: a real origin, real
// caching, and the same URL shape the browser build already runs under. Bound
// to 127.0.0.1 — nothing on the restaurant's network can reach it.
// ---------------------------------------------------------------------------

const { createServer } = require('node:http')
const { createReadStream } = require('node:fs')
const { stat } = require('node:fs/promises')
const { join, normalize, extname } = require('node:path')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

/** @returns {Promise<string>} the origin the window should load */
function serveDist(root) {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const path = decodeURIComponent((req.url ?? '/').split('?')[0])
      // normalize() collapses `..`, so a request cannot climb out of the bundle
      // into the rest of the panel's disk.
      const rel = normalize(path).replace(/^([/\\])+/, '')
      let file = join(root, rel)
      try {
        const info = await stat(file)
        if (info.isDirectory()) file = join(file, 'index.html')
        await stat(file)
      } catch {
        // The totem is one screen driven by state, not routes — but a stray
        // deep link (or a service worker probe) should land on the app, not a
        // 404 that reads to staff as a broken panel.
        file = join(root, 'index.html')
      }
      res.writeHead(200, {
        'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
        // The shell ships the bundle; a stale cached index would survive an
        // update the operator believes they installed.
        'cache-control': extname(file) === '.html' ? 'no-store' : 'public, max-age=31536000',
      })
      createReadStream(file).pipe(res)
    })
    server.on('error', reject)
    // Port 0: the OS picks a free one, so two panels or a leftover process
    // never collide on a hardcoded number.
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`)
    })
  })
}

module.exports = { serveDist }
