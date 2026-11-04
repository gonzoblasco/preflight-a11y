Continuemos. El paso 1 quedó a medias: los cambios de contraste se aplicaron a la documentación pero **no a src/index.css**. El archivo sigue con `--muted-foreground: 220 10% 46%` y no tiene `--primary-strong`.

Corregí eso y terminá los tres pasos. Reglas de esta tanda:

1. **No te detengas para verificar.** No tenés Preflight, no lo necesitás. Aplicá el cambio; si no podés medirlo, marcalo `UNVERIFIED` y seguí. Yo verifico después con una herramienta externa.
2. **Editá el código, no la documentación.** No crees ni modifiques CHANGELOG.md, roadmap.md ni AGENTS.md. Solo `src/index.css` y `src/pages/Landing.tsx`.
3. **No toques la identidad visual.** El ámbar conserva su matiz.

## Lo que falta

**A) src/index.css — contraste (esto es lo que no aterrizó)**
- `--muted-foreground` en `:root`: de `220 10% 46%` a un valor que dé >= 4.5:1 sobre `#f4f5f7`. Probá `220 10% 38%`.
- `--muted-foreground` en `.dark`: de `215 15% 55%` a un valor que dé >= 4.5:1 sobre `222 28% 7%`. Probá `215 15% 68%`.
- El ámbar `45 93% 47%` usado como TEXTO sobre fondos claros (`#f5f0e1`, `#f4f5f7`) da 1.73:1. Necesitás una variante de texto más oscura, mismo matiz: agregá `--primary-strong: 45 93% 27%` y usala solo donde el ámbar es color de texto, no de fondo.
- No cambies `--primary` (el fondo de los botones): eso es la marca.

**B) src/pages/Landing.tsx — landmarks**
- Envolvé el contenido en UN `<main>`. El `<nav>` y el `<footer>` quedan afuera.
- Agregá `aria-label` a cada `<section>` que tenga un encabezado, con el texto de ese encabezado.

**C) Publicá.** Necesito que el sitio quede publicado para poder verificarlo.

Cuando termines, decime en una lista: qué archivo cambió, qué valor exacto pusiste en cada token, y si publicaste.
