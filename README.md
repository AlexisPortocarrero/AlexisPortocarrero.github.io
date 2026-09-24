# alexisportocarrero.github.io

Portafolio personal. Una sola página estática: `index.html`, `css/style.css`, `js/main.js`.
Animación con GSAP 3 + ScrollTrigger (CDN), sin build.

- `images/alexis.svg`, `images/bed-base.svg`, `images/bed-blanket.svg`: el personaje chibi y su cama. Se insertan en `index.html` (el personaje dos veces: actor fijo y copia en la sección de proyectos). Si cambias un SVG hay que volver a insertarlo; los ids de los grupos (`#head`, `#eye-l`, `#mattress-flap-l`, etc.) los usa la animación.
- `images/cand/a|b|c/`: los tres estilos chibi que se evaluaron (se usa el C). `images/*-realista.svg`: la versión anterior, no chibi.
- `images/poster/` y `images/preview/`: capturas estáticas y previews animadas (WebP) de cada proyecto. Los GIF originales se conservan en `images/` como fuente.
- `images/CV_Alexis_Portocarrero_2026-2.pdf`: CV enlazado desde "Sobre mí".

Para probar en local: `python -m http.server 8765` y abrir http://localhost:8765/.
Atajos: `#videojuegos`, `#software` y `#todo` abren la sección de proyectos en esa rama.
