const fs = require('fs');

async function main() {
  try {
    const res = await fetch('https://icpaas.in');
    const html = await res.text();
    fs.writeFileSync('scripts/icpaas_home.html', html);
    const forms = [...html.matchAll(/<form[^>]*action=["']([^"']*)["'][^>]*>/gi)].map(m => m[0]);
    console.log('Forms:', forms);
    const inputs = [...html.matchAll(/<input[^>]*name=["']([^"']*)["'][^>]*>/gi)].map(m => m[0]);
    console.log('Inputs:', inputs);
    const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
    console.log('Scripts:', scripts);
  } catch (e) {
    console.error(e);
  }
}
main();
