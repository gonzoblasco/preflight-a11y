# Fase 0.2 — Runbook: ¿el fix prompt funciona en un builder real?

**Tiempo:** ~25 minutos de tu tiempo, repartidos en 3 builders.
**Costo en modelos:** cero. No se llama a ningún LLM.
**Qué decide:** si Preflight vende una *reparación* o solo un *informe*. Es el gate del roadmap.

---

## Antes de empezar: qué tenés en la carpeta

| Archivo | Qué es |
|---|---|
| `source.html` | La página de prueba (landing "Kova", forma típica de sitio generado por IA). Baseline: **7/100 F, 8 hallazgos, 5 bloqueantes**. |
| `prompt.md` | **El prompt a pegar.** 4.581 caracteres, 8 pasos. Es la salida literal del producto. |
| `results/` | Donde quedan los JSON de verificación. |

El prompt no está retocado a mano. Si está mal, está mal el producto — y eso es exactamente lo que queremos saber.

---

## Paso 1 — v0 (15 min)

1. Abrí <https://v0.app> e iniciá sesión.
2. Nuevo chat. **Pegá primero `source.html` completo** en el mensaje, con este encabezado:

   > Here is the complete HTML of my page. Do not change it yet. Reply "ready".

   v0 necesita tener el documento en contexto antes de las instrucciones.
3. Cuando responda "ready", **pegá `prompt.md` completo**, sin editar nada.
4. Si pide aclaraciones, respondé solo con: *"Apply the steps as written. Do not ask questions."*
5. Copiá el HTML que devuelve y guardalo como:

   ```
   .knowledge/phase-0.2/v0.html
   ```

**Anotá mientras lo hacés** (esto no lo mide ningún script):
- ¿Truncó el prompt o se quejó de longitud?
- ¿Respetó los bloques de código, o devolvió HTML suelto?
- ¿Cuántos turnos necesitó?

---

## Paso 2 — Cursor (5 min)

1. Abrí `source.html` en Cursor (archivo local, sin repo).
2. Seleccioná todo el archivo → `Cmd+K` (inline edit).
3. Pegá `prompt.md` como instrucción.
4. Aceptá el diff y guardá como `.knowledge/phase-0.2/cursor.html`.

**Anotá:** ¿aplicó los 8 pasos o solo los primeros? ¿mantuvo el `<style>` block?

---

## Paso 3 — Lovable (5 min)

1. Proyecto nuevo, modo "import from code" si está disponible; si no, pegá `source.html` como primer mensaje con *"This is my current page, do not change anything yet"*.
2. Después pegá `prompt.md`.
3. Descargá o copiá el código resultante → `.knowledge/phase-0.2/lovable.html`.

**Anotá:** Lovable tiende a reescribir el diseño. Si cambia el layout, eso **es** un resultado, no un fallo tuyo.

> Si Lovable o v0 te bloquean por cuenta/plan, **no fuerces nada**: verificá solo los dos que puedas. El gate exige 2 de 3, no 3 de 3.

---

## Paso 4 — Verificar (1 comando)

En `projects/preflight`:

```bash
npx tsx scripts/verify-repair.mjs --all
```

Para uno solo:

```bash
npx tsx scripts/verify-repair.mjs .knowledge/phase-0.2/v0.html --label v0
```

### Qué te va a decir

```
  v0
    score      7 F → 91 B
    blocking   5 → 1
    closed     7/8 (88%)
    persisted  color-contrast
    introduced (ninguna)
    content    intact
```

**Cómo leerlo:**

| Línea | Qué significa | Cuándo es rojo |
|---|---|---|
| `score` | Nota del motor, mismo que produjo el prompt | Si no sube |
| `blocking` | Hallazgos que impiden completar una tarea | Si no baja a 0 o 1 |
| `closed` | Reglas que dejaron de fallar | **Menos de 5/8 = no cumple** |
| `persisted` | Lo que el builder no pudo arreglar | Informativo: es el límite real |
| `introduced` | Regresiones nuevas | **Cualquiera es grave** |
| `content` | Si borró texto/imágenes/links para "ganar" | **`DAMAGED` invalida el resultado** |

`content: DAMAGED` es el caso trampa: un builder puede cerrar todos los hallazgos borrando la página. El verificador lo detecta y **no cuenta como reparación**.

---

## Paso 5 — El veredicto

El script lo imprime solo:

```
  GATE PASSED — 2 of 3 builders closed >= 5/8 findings without damaging the page.
```

o

```
  GATE NOT PASSED — 1 of 3 builders meet both conditions (>= 5/8 closed, layout intact).
```

**Qué hacer con cada resultado:**

| Resultado | Consecuencia |
|---|---|
| **PASA** (≥2 de 3) | El claim queda probado. Se sigue a Fase 0.3 (deploy y concurrencia). El precio y el pitch se mantienen. |
| **NO PASA, pero cierran ≥3/8** | El prompt vende *diagnóstico*, no reparación. Se baja el claim en la landing, se reescribe el pitch, y el producto se reposiciona como informe con prompt de cortesía. |
| **NO PASA, cierran <3/8** | El prompt no sirve como artefacto. Se pivota: se elimina de la propuesta de valor y el producto es un informe visual de lo que escucha un lector. |
| **`content: DAMAGED` en ≥2** | Los builders "arreglan" destruyendo. Eso mata el formato de "devolvé el HTML completo" y obliga a cambiar el formato del prompt (parches por selector, no documento entero). |

---

## Lo que quiero que me traigas

Solo esto, sin interpretar:

1. Los archivos `v0.html`, `cursor.html`, `lovable.html` que puedas generar.
2. Las tres anotaciones de comportamiento (truncado, fences, turnos).
3. La salida de `verify-repair.mjs --all`.

Con eso yo escribo el resultado de la Fase 0.2 en `.knowledge/` y actualizo el roadmap, el README y la landing según el veredicto. **No necesito que juzgues nada** — el script mide, vos solo pegás.

---

## Si algo falla técnicamente

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `Missing source.html` | Corriste desde otro directorio | `cd projects/preflight` primero |
| `ERR_MODULE_NOT_FOUND` | Lo corriste con `node` en vez de `npx tsx` | Usá `npx tsx` |
| `No HTML document found` | El builder devolvió solo un fragmento | Guardá lo que devolvió igual: es un dato (truncó el documento) |
| El scan tarda >30s | El HTML es enorme o tiene un bucle | Anotalo: el tamaño del artefacto es un límite real del producto |
