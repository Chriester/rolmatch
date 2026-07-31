// Inyecta metadatos Open Graph en el index.html exportado (lo llama
// deploy.yml tras el build). La web es SPA (web.output: single): los
// crawlers de WhatsApp/Discord/Telegram no ejecutan JS, así que la vista
// previa del enlace compartido sale de estos tags estáticos.

const fs = require('fs');

const file = process.argv[2] ?? '.vercel/output/static/index.html';

const TAGS = [
  '<meta property="og:site_name" content="rolder"/>',
  '<meta property="og:type" content="website"/>',
  '<meta property="og:title" content="rolder — encuentra tu mesa de rol"/>',
  '<meta property="og:description" content="Matchmaking de rol de mesa online en español: haz match con mesas y jugadores, organiza sesiones y chatea con tu grupo."/>',
  '<meta property="og:image" content="https://rolmatch.vercel.app/icon-1024.png"/>',
  '<meta property="og:url" content="https://rolmatch.vercel.app"/>',
  '<meta name="twitter:card" content="summary"/>',
  '<meta name="description" content="Matchmaking de rol de mesa online en español: haz match con mesas y jugadores, organiza sesiones y chatea con tu grupo."/>',
  '<meta name="theme-color" content="#0B0B12"/>',
].join('');

const html = fs.readFileSync(file, 'utf8');
if (html.includes('og:site_name')) {
  console.log('OG ya presente, sin cambios');
} else {
  fs.writeFileSync(file, html.replace('</head>', `${TAGS}</head>`));
  console.log(`OG inyectado en ${file}`);
}
