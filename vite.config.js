import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// index.html-এর %SITE_URL% (শেয়ার প্রিভিউয়ের ছবি/লিংকের জন্য) বসায়: VITE_SITE_URL দিলে সেটা,
// না দিলে Netlify যে URL env ভ্যারিয়েবল দেয় সেটা (নিজে নিজেই সাইটের লিংক)।
function siteUrlPlugin() {
  return {
    name: 'site-url',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const url = (process.env.VITE_SITE_URL || process.env.URL || '').replace(/\/$/, '')
        return html.replaceAll('%SITE_URL%', url)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
})
