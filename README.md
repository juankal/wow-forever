# Juankal · WoW Forever

Diario personal del paladín Juankal en Ashenlight. Aplicación estática en español, con diseño oscuro, navegación para escritorio y móvil y almacenamiento en el navegador.

**Aplicación:** [juankal.github.io/wow-forever](https://juankal.github.io/wow-forever/)

**Repositorio:** [juankal/wow-forever](https://github.com/juankal/wow-forever)

## Funciones

- Dashboard con prioridades del día, avance de Onyxia, equipo y balance de Reals.
- Prioridades diarias, semanales y de una sola vez: prioridad alta/media/baja, especialización, notas y acceso a una sección.
- Sets independientes de Retribution y Holy, 17 ranuras, estadísticas, talentos, alternativas, comparación de atributos y decisiones de botín. Al equipar una alternativa, el objeto anterior se conserva.
- Misiones con filtros, estado, evidencia, NPC, coordenadas, comandos TomTom, fuente y capturas comprimidas.
- Seguimiento de Tier 0/0.5, acceso a Onyxia y cadena de paladín de nivel 50.
- Planes de mazmorras, roles, botín y bloqueos manuales con su zona horaria.
- Registro de Reals por ingreso/gasto, origen y fecha. El balance parte de cero; registra el saldo inicial como ingreso. Los gastos nuevos requieren saldo suficiente.
- Enlaces a MythicSim y Forever Sims; registro manual de resultados DPS y cálculo de delta absoluto y porcentual.
- Checklists, profesiones, montura épica, diario y capturas.
- Exportación/importación JSON con validación de estructura, protección ante cuota agotada y recuperación de registros inválidos.

## Datos y respaldos

El estado se guarda en `localStorage` bajo `wowforever.juankal.diario.v1`. Los datos de arranque proceden del archivo original de Juan Carlos del 16/11/2026; mantienen las advertencias sobre cifras y rutas no verificadas en el juego. El original de Downloads no se modifica ni se publica como archivo adicional.

Las tareas diarias empiezan un nuevo período a las **00:00 de America/Lima**, y las semanales, los **lunes a las 00:00**, por defecto. Puedes cambiar zona horaria IANA, hora e inicio de semana en **Prioridades → Configurar reinicios**. La app vuelve a abrir las tareas del nuevo período y conserva las marcas anteriores. Cambiar la frecuencia de una prioridad reinicia sus marcas para esa tarea. Estos horarios son personales; no representan resets oficiales de Forever.

Los datos guardados son específicos del navegador y del origen del sitio. **No se sincronizan entre PC y móvil**. Exporta un JSON en un dispositivo e impórtalo en el otro. Importar reemplaza todo el registro después de confirmar; no combina cambios. La importación admite hasta 8 MB y solo cambia el registro activo cuando la escritura persistente tiene éxito. Si el navegador bloquea el almacenamiento, puedes continuar en memoria y exportar antes de cerrar. Si encuentra un registro inválido, lo conserva y ofrece descargarlo para recuperación; Exportar descarga tus cambios actuales.

El repositorio y el sitio son públicos. Las ediciones no se envían a GitHub ni a los simuladores. Conserva tus respaldos en privado y evita añadir información sensible a los datos de arranque del código. Borrar los datos del navegador o utilizar sesiones privadas puede eliminar tu progreso. Las capturas consumen la cuota del navegador: expórtalas con el resto del diario y elimina las que ya no necesites.

No hay integración con la armería ni ejecución de comandos dentro del juego. La app **registra** resultados DPS; los cálculos de combate se realizan en los simuladores externos. Los límites de Reals, recompensas, rutas y resets deben confirmarse en el cliente de Forever.

## Desarrollo

Requiere Node.js 24 y npm. La aplicación publicada no necesita framework, paquetes de runtime, fuentes remotas ni backend.

```powershell
npm ci
npx playwright install chromium
npm run dev
```

Abre [127.0.0.1:4173](http://127.0.0.1:4173). Usa HTTP, porque los módulos JavaScript no se cargan de forma fiable mediante `file://`.

```powershell
npm run check
npm run test:e2e
npm run build
```

Las pruebas cubren períodos diarios/semanales, zonas horarias, persistencia, validación y restauración de respaldos, almacenamiento bloqueado/corrupto, cambios de equipo, misiones, Reals, DPS, formularios, navegación e inexistencia de desbordamiento horizontal en escritorio y móvil. Los screenshots se guardan en `test-results/` y no se versionan.

La suite incluye 7 pruebas de lógica y 30 pruebas de navegador (15 flujos en escritorio y 15 en móvil), incluida la compresión y persistencia de capturas.

## Estructura

| Ruta                          | Responsabilidad                                          |
| ----------------------------- | -------------------------------------------------------- |
| `index.html`                  | Shell accesible, navegación y carga de recursos locales  |
| `assets/styles.css`           | Diseño oscuro y responsive                               |
| `assets/crest.svg`            | Emblema vectorial local                                  |
| `assets/data.js`              | Datos de arranque y compatibilidad del respaldo original |
| `assets/model.js`             | Validación, períodos, prioridades, Reals y deltas DPS    |
| `assets/app.js`               | Vistas, formularios, persistencia e interacciones        |
| `scripts/serve.mjs`           | Servidor local sin dependencias                          |
| `scripts/build.mjs`           | Preparación de `dist/` con recursos públicos             |
| `tests/`                      | Pruebas de lógica y flujos de navegador                  |
| `.github/workflows/pages.yml` | Verificación y publicación automática                    |

## Publicación

GitHub Pages está configurado con **GitHub Actions** como origen. Cada push a `main` ejecuta las pruebas de lógica y de navegador, prepara `dist/` y publica únicamente si todo pasa. Los pull requests ejecutan las comprobaciones sin publicar. También puedes lanzar el workflow manualmente desde Actions.

Solo `index.html`, `assets/` y `.nojekyll` entran en el artefacto público. Las rutas de recursos son relativas para funcionar bajo `/wow-forever/`; las secciones usan hashes y se pueden recargar o compartir sin reglas de servidor adicionales.

Proyecto personal no afiliado a Blizzard Entertainment.
