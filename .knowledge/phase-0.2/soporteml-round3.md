Buen avance: el sitio ya está publicado y el `<main>` más las secciones etiquetadas funcionan (el lector anuncia "main" y cada sección por su nombre). Gracias.

Quedan **3 fallos de contraste**, y son los mismos tres elementos. Datos medidos con una herramienta externa, no adivinados:

- Selector: `.bg-muted\/50.py-1` (los tres chips de "Trust badges" en el hero)
- Color del texto medido: **#a3a7ae**
- Color de fondo medido: **#f4f5f7**
- Contraste: **2.21:1** (necesita 4.5:1)

El problema no parece ser el token: `--muted-foreground` está en `220 10% 38%`, que da 5.15:1 y está bien. Pero el texto de esos chips se computa como `#a3a7ae`, mucho más claro. O sea: **algo está sobrescribiendo el color heredado** en ese bloque.

Encontrá QUÉ lo sobrescribe y corregilo. Sospechosos posibles:
- una regla `.landing-page ...` que aplique un color más claro a ese contenedor
- una opacidad en el `motion.div` padre
- `--muted-foreground` de `.dark` aplicándose por error en tema claro
- una clase `text-muted-foreground/xx` con opacidad

Requisitos:
1. Arreglá la causa, no los tres chips uno por uno.
2. No cambies el diseño, el copy ni el layout.
3. No toques documentación (nada de CHANGELOG, roadmap ni AGENTS).
4. Publicá al terminar.

Cuando termines, decime en una línea qué sobrescribía el color y qué cambiaste. No necesito que lo verifiques: yo lo mido después.
