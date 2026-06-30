// Post-procesa dist/index.html para inyectar las etiquetas PWA.
//
// Necesario porque con `web.output: "single"`, expo-router NO usa
// `app/+html.tsx`, así que el <head> generado no incluye manifest,
// theme-color ni el registro del service worker. Este script se ejecuta
// después de `expo export -p web`.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const INDEX = resolve(process.cwd(), "dist", "index.html");

const HEAD_TAGS = `
    <meta name="description" content="Acompañamiento para tu bienestar emocional: registra cómo te sientes, regula con ejercicios breves y accede a apoyo cuando lo necesites." />
    <meta name="theme-color" content="#2F6D6E" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Cauce" />`;

const SW_SCRIPT = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
      // iOS Safari hace auto-zoom al enfocar inputs con fuente < 16px, lo que
      // descoloca la vista del chat. maximum-scale=1 desactiva SOLO ese zoom
      // automático: desde iOS 10 Safari lo ignora para el pinch manual del
      // usuario, así que la accesibilidad no se pierde. No se aplica en
      // Android, donde sí bloquearía el pinch.
      (function () {
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
          var vp = document.querySelector('meta[name="viewport"]');
          if (vp) vp.setAttribute('content', vp.getAttribute('content') + ', maximum-scale=1');
        }
      })();
    </script>`;

async function main() {
  let html = await readFile(INDEX, "utf8");

  // Idempotente: no duplicar si ya fue parchado.
  if (html.includes('rel="manifest"')) {
    console.log("[patch-web-html] index.html ya contiene tags PWA, omitiendo.");
    return;
  }

  // Forzar lang="es".
  html = html.replace('<html lang="en">', '<html lang="es">');

  // Inyectar tags PWA antes de cerrar </head>.
  html = html.replace("</head>", `${HEAD_TAGS}\n  </head>`);

  // Inyectar registro del SW antes de cerrar </body>.
  html = html.replace("</body>", `${SW_SCRIPT}\n  </body>`);

  await writeFile(INDEX, html, "utf8");
  console.log("[patch-web-html] index.html parchado con tags PWA + service worker.");
}

main().catch((err) => {
  console.error("[patch-web-html] error:", err);
  process.exit(1);
});
