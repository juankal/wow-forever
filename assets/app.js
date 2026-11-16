import {
  KEY,
  SLOTS,
  STATS,
  CHARSTATS,
  QSTATUS,
  EVIDENCE,
  DECISIONS,
  CATEGORIES,
  uid,
  quest,
  task,
  onyxCmd,
} from "./data.js";
import {
  prepareState,
  validate,
  periodKey,
  priorityDone,
  setPriorityDone,
  sortedPriorities,
  realsBalance,
  localDate,
  simDelta,
  CADENCES,
  PRIORITIES,
} from "./model.js";
let state = prepareState();
let storageError = false,
  storageRecovery = false,
  recoveryRaw = null;
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    recoveryRaw = raw;
    const parsed = JSON.parse(raw);
    validate(parsed);
    state = prepareState(parsed);
    recoveryRaw = null;
  }
} catch (error) {
  storageError = true;
  storageRecovery = recoveryRaw !== null;
  console.warn("No se pudo recuperar el diario:", error.message);
}
let page = "home",
  spec = "Ret",
  filter = "",
  qfilter = "Todos",
  chainFilter = "Todos",
  zoneFilter = "Todos",
  levelFilter = "",
  taskFilter = "Todos",
  compareA = "",
  compareB = "";
const $ = (id) => document.getElementById(id);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const val = (v) => (v === "" || v == null ? "Desconocido" : esc(v));
const safeurl = (u) => (/^https?:\/\//i.test(String(u || "")) ? esc(u) : "");
const link = (u, t) =>
  safeurl(u)
    ? `<a href="${safeurl(u)}" target="_blank" rel="noopener noreferrer">${esc(t || u)}</a>`
    : "";
function toast(s) {
  $("toast").textContent = s;
  $("toast").style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(
    () => ($("toast").style.display = "none"),
    3800,
  );
}
function head(k, t, d) {
  return `<div class="eyebrow">${k}</div><h1>${t}</h1><p class="muted">${d}</p>`;
}
function opts(values, selected) {
  return values
    .map(
      (o) => `<option ${o === selected ? "selected" : ""}>${esc(o)}</option>`,
    )
    .join("");
}
function tag(v) {
  let c = [
    "Completada",
    "Verificado en juego",
    "Equipar",
    "Lista para entregar",
    "Completado",
  ].includes(v)
    ? "ok"
    : ["Bloqueada", "Vender", "Descartar"].includes(v)
      ? "bad"
      : [
            "Pendiente",
            "En curso",
            "Por confirmar",
            "Reportado por usuario",
            "Encantar",
          ].includes(v)
        ? "warn"
        : "";
  return `<span class="tag ${c}">${esc(v || "Desconocido")}</span>`;
}
function action(label, act, id = "", cls = "small") {
  return `<button class="${cls}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
}
function progress(n, total) {
  return `<div class="progress"><i style="width:${total ? Math.min(100, Math.max(0, (n / total) * 100)) : 0}%"></i></div>`;
}
function photoView(p) {
  return typeof p === "string" &&
    /^data:image\/(png|jpeg|webp|gif);base64,/i.test(p)
    ? `<img class="photo" src="${esc(p)}" alt="Captura registrada" loading="lazy" decoding="async">`
    : "";
}
function photoField(p) {
  return `<div class="field full"><label for="photoFile">Captura opcional (PNG, JPEG, WebP o GIF; se comprime al guardar)</label>${photoView(p)}<input id="photoFile" name="photoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><label><input type="checkbox" name="removePhoto"> Eliminar captura existente</label></div>`;
}
function tabs() {
  return `<div class="tabs">${["Ret", "Holy"].map((s) => `<button data-act="spec" data-id="${s}" class="${spec === s ? "active" : ""}">${s === "Ret" ? "Retribution" : "Holy"}</button>`).join("")}</div>`;
}
function gear() {
  const rows = SLOTS.map((slot) => {
    const g = state.gear.find((x) => x.spec === spec && x.slot === slot);
    return `<tr><td class="slot">${esc(slot)}</td><td>${g ? val(g.name) : "Desconocido"}</td><td>${g ? val(g.enchant) : "—"}</td><td>${g ? tag(g.decision) : "—"}</td><td>${g ? esc(g.notes || "—") : "—"}</td><td class="nowrap">${action("Editar", "gearEdit", slot)} ${g ? action("Comparar", "gearCompare", g.id) : ""}</td></tr>`;
  }).join("");
  return (
    head(
      "Armería personal",
      "Equipo y atributos",
      "Un set por especialización. Registra datos tal como aparecen en el juego.",
    ) +
    tabs() +
    `<section class="panel"><h2>Estadísticas de ${spec === "Ret" ? "Retribution" : "Holy"}</h2><div class="grid">${CHARSTATS.map((k) => `<div class="field"><label>${esc(k)}</label><input data-stat="${esc(k)}" type="number" step="any" placeholder="Desconocido" value="${esc(state.stats[spec][k] ?? "")}"></div>`).join("")}</div><p class="tiny muted" style="margin-top:10px">Se guardan al cambiar el valor. Usa las mismas condiciones de buffs al comparar.</p></section><section class="panel"><h2>Equipo por ranura</h2><div class="tablewrap"><table><thead><tr><th>Ranura</th><th>Equipado</th><th>Encantamiento</th><th>Decisión</th><th>Notas</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="panel"><h2>Talentos · ${spec === "Ret" ? "Retribution" : "Holy"}</h2><textarea id="build" placeholder="Puntos, enlace de build, cambios pendientes...">${esc(state.builds[spec])}</textarea><p class="tiny muted">Guarda automáticamente al cambiar.</p></section>`
  );
}
function allItems() {
  return [
    ...state.gear
      .filter((x) => x.name)
      .map((x) => ({ ...x, kind: "Equipado" })),
    ...state.items.map((x) => ({ ...x, kind: "Alternativa" })),
  ];
}
function itemOptions(selected) {
  return (
    '<option value="">Seleccionar objeto</option>' +
    allItems()
      .map(
        (x) =>
          `<option value="${esc(x.id)}" ${selected === x.id ? "selected" : ""}>${esc(x.name || "Sin nombre")} · ${esc(x.slot)} (${esc(x.spec)}, ${x.kind})</option>`,
      )
      .join("")
  );
}
function compare() {
  let a = allItems().find((x) => x.id === compareA),
    b = allItems().find((x) => x.id === compareB);
  const diff = (x, y) => {
    if (x === "" || y === "" || x == null || y == null) return "—";
    let d = Number(y) - Number(x);
    return Number.isFinite(d)
      ? `<span class="delta ${d > 0 ? "plus" : d < 0 ? "minus" : ""}">${d > 0 ? "+" : ""}${Math.round(d * 1000) / 1000}</span>`
      : "—";
  };
  let filtered = state.items.filter((x) =>
    (x.name + " " + x.slot + " " + x.spec + " " + x.decision)
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    head(
      "Decisiones de botín",
      "Comparador de equipo",
      "Compara atributos entre dos objetos y registra tu decisión por especialización.",
    ) +
    `<div class="toolbar">${action("+ Añadir alternativa", "itemEdit", "", "primary")}</div><section class="panel"><div class="grid two"><div class="field"><label>Objeto A · actual o referencia</label><select id="compareA">${itemOptions(compareA)}</select></div><div class="field"><label>Objeto B · alternativa</label><select id="compareB">${itemOptions(compareB)}</select></div></div>${a && b ? `<div class="grid two" style="margin:15px 0">${[a, b].map((x) => `<div><div class="comparehead">${esc(x.name)}</div><div class="muted">${esc(x.spec)} · ${esc(x.slot)} · ${val(x.enchant)}</div>${photoView(x.photo)}</div>`).join("")}</div>${a.slot !== b.slot ? '<div class="note">Las ranuras son distintas: los deltas no representan necesariamente un reemplazo válido.</div>' : ""}<div class="tablewrap"><table><thead><tr><th>Atributo</th><th>Actual A</th><th>Alternativa B</th><th>Δ B − A</th></tr></thead><tbody>${STATS.map((k) => `<tr><td>${esc(k)}</td><td>${val(a.stats?.[k])}</td><td>${val(b.stats?.[k])}</td><td>${diff(a.stats?.[k], b.stats?.[k])}</td></tr>`).join("")}</tbody></table></div><p class="tiny muted" style="margin-top:10px">Los cambios son aritméticos, no una puntuación BiS. Menor velocidad de arma significa un arma más rápida, no necesariamente una mejora. No se calculan procs, caps, bonos ni restricciones de clase.</p><div class="actions">${action("Editar A", a.kind === "Equipado" ? "gearById" : "itemEdit", a.id)}${action("Registrar decisión B", b.kind === "Equipado" ? "gearById" : "itemEdit", b.id)}${b.kind === "Alternativa" ? action("Equipar B en su set", "equip", b.id, "primary") : ""}</div>` : '<div class="empty">Selecciona dos objetos para ver sus diferencias. Los campos vacíos no se interpretan como cero.</div>'}</section><section class="panel"><h2>Inventario de alternativas (${state.items.length})</h2><div class="toolbar"><input id="filter" placeholder="Buscar por nombre, ranura, rol o decisión" value="${esc(filter)}"></div><div id="inventory">${inventoryRows(filtered)}</div></section>`
  );
}
function inventoryRows(items) {
  return (
    items
      .map(
        (x) =>
          `<div class="rowitem"><div><b>${val(x.name)}</b> ${tag(x.decision)}<p class="tiny muted">${esc(x.spec)} · ${esc(x.slot)} · ${val(x.source)} · Encanto: ${val(x.enchant)}</p><p class="detail">${esc(x.notes || "")}</p>${photoView(x.photo)}</div><div class="actions">${action("Editar", "itemEdit", x.id)}${action("Comparar", "chooseB", x.id)}${action("Eliminar", "deleteItem", x.id, "small danger")}</div></div>`,
      )
      .join("") || '<div class="empty">Sin alternativas para mostrar.</div>'
  );
}
function dungeons() {
  return (
    head(
      "Preparación endgame",
      "Mazmorras y Tier 0",
      "Prioridades editables, objetivos de botín y bloqueos registrados manualmente.",
    ) +
    `<section class="panel"><h2>Tier 0</h2><div class="grid two"><div class="field"><label>Piezas registradas (recuento manual)</label><input id="tierCount" type="number" min="0" placeholder="Desconocido" value="${esc(state.profile.tierCount)}"></div><div class="field"><label>Piezas identificadas, bonus y objetivos</label><textarea id="tierNotes">${esc(state.profile.tierNotes)}</textarea></div></div></section><section class="panel"><h2>Plan de mazmorras</h2>${action("+ Añadir mazmorra", "planEdit", "", "primary")}${state.plans.map((x) => `<div class="rowitem"><div><b>${esc(x.name)}</b> ${tag(x.status)} <span class="tag">Prioridad ${esc(x.priority)}</span><p class="tiny muted">Rol: ${val(x.role)}</p><p class="detail">${esc(x.goals)}</p><p class="muted detail">${esc(x.notes)}</p></div>${action("Editar", "planEdit", x.id)}</div>`).join("")}</section><section class="panel"><h2>Raid resets y bloqueos</h2><p class="muted tiny">No se consultan resets oficiales. Registra el horario mostrado en tu cliente; usa la hora local que indiques.</p>${action("+ Registrar bloqueo", "resetEdit", "", "primary")}<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Instancia</th><th>Estado</th><th>Próximo reset</th><th>Zona horaria</th><th>Notas</th><th></th></tr></thead><tbody>${state.resets.map((x) => `<tr><td>${val(x.name)}</td><td>${tag(x.status)}</td><td>${val(x.date?.replace("T", " "))}</td><td>${val(x.tz)}</td><td>${val(x.notes)}</td><td>${action("Editar", "resetEdit", x.id)} ${action("Eliminar", "deleteReset", x.id, "small danger")}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">Ningún bloqueo registrado.</td></tr>'}</tbody></table></div></section>`
  );
}
function questRows(list) {
  return (
    list
      .map(
        (x) =>
          `<div class="rowitem"><div><b>${esc(x.name)}</b> ${tag(x.status)} ${tag(x.evidence)}<p class="tiny muted">Cadena: ${val(x.chain)} · Zona: ${val(x.zone)} · Nivel: ${val(x.level)} · Verificación: ${val(x.date)}</p><p>NPC: ${val(x.npc)} · Coordenadas: ${val(x.coords)} · Recompensa: ${val(x.reward)}</p>${x.tomtom ? `<p><code>${esc(x.tomtom)}</code> ${action("Copiar", "copyQuest", x.id)}</p>` : ""}<p class="detail muted">${esc(x.notes)}</p>${link(x.source, "Fuente registrada")}${photoView(x.photo)}</div><div class="actions">${action("Editar", "questEdit", x.id)} ${action("Eliminar", "deleteQuest", x.id, "small danger")}</div></div>`,
      )
      .join("") || '<div class="empty">No hay misiones que coincidan.</div>'
  );
}
function filteredQuests() {
  return state.quests.filter(
    (x) =>
      [x.name, x.chain, x.zone, x.npc, x.notes, x.reward]
        .join(" ")
        .toLowerCase()
        .includes(filter.toLowerCase()) &&
      (qfilter === "Todos" || x.status === qfilter) &&
      (chainFilter === "Todos" || (x.chain || "Desconocido") === chainFilter) &&
      (zoneFilter === "Todos" || (x.zone || "Desconocido") === zoneFilter) &&
      (!levelFilter || String(x.level) === levelFilter),
  );
}
function quests() {
  const unique = (k) => [
    "Todos",
    ...new Set(state.quests.map((x) => x[k] || "Desconocido")),
  ];
  return (
    head(
      "Registro de campaña",
      "Misiones",
      "Filtra por cadena, zona, nivel y estado. Registra evidencias antes de dar una ruta por confirmada.",
    ) +
    `<div class="toolbar">${action("+ Añadir misión", "questEdit", "", "primary")}<input id="filter" placeholder="Buscar misión, NPC, recompensa…" value="${esc(filter)}"><select id="qfilter">${opts(["Todos", ...QSTATUS], qfilter)}</select><select id="chainFilter">${opts(unique("chain"), chainFilter)}</select><select id="zoneFilter">${opts(unique("zone"), zoneFilter)}</select><input id="levelFilter" placeholder="Nivel exacto" value="${esc(levelFilter)}"></div><section class="panel" id="questList">${questRows(filteredQuests())}</section>`
  );
}
function fifty() {
  return (
    head(
      "Investigación pendiente",
      "Cadena de paladín · nivel 50",
      "Separa los reportes del foro de las comprobaciones dentro de WoW Forever.",
    ) +
    `<div class="note">No se ha verificado la disponibilidad, el orden de los pasos ni los NPC. Las referencias del foro están pendientes de contraste con el juego. Las coordenadas 17.7, 67.4 son un reporte previo sin zona confirmada.</div><section class="panel"><h2>Seguimiento de pasos</h2>${action("+ Añadir paso", "quest50", "", "primary")}${questRows(state.quests.filter((x) => x.chain === "Paladín nivel 50"))}</section><section class="panel"><h2>Publicaciones por confirmar</h2>${action("+ Añadir publicación", "forumEdit", "", "primary")}${state.forum.map((x) => `<div class="rowitem"><div><b>${esc(x.title)}</b> ${tag(x.status)}<p class="tiny muted">Verificación: ${val(x.date)}</p><p>${link(x.url, "Abrir publicación manualmente")}</p><p class="detail">${esc(x.notes)}</p></div><div>${action("Editar", "forumEdit", x.id)} ${action("Eliminar", "deleteForum", x.id, "small danger")}</div></div>`).join("")}</section>`
  );
}
function taskRow(x) {
  return `<div class="task ${x.done ? "done" : ""}"><input type="checkbox" aria-label="Completar ${esc(x.name)}" data-task="${esc(x.id)}" ${x.done ? "checked" : ""}><div class="tasktext"><b>${esc(x.name)}</b><div class="tiny muted">${esc(x.category)} ${x.notes ? "· " + esc(x.notes) : ""}</div></div>${action("Editar", "taskEdit", x.id)}</div>`;
}
function check() {
  return (
    head(
      "Rutina reutilizable",
      "Checklists y profesiones",
      "Marca objetivos, crea tareas propias y reinicia una categoría cuando prepares otra salida.",
    ) +
    `<div class="toolbar">${action("+ Añadir tarea", "taskEdit", "", "primary")}<select id="taskFilter">${opts(["Todos", ...CATEGORIES], taskFilter)}</select></div>${CATEGORIES.filter(
      (c) => taskFilter === "Todos" || taskFilter === c,
    )
      .map((c) => {
        let ts = state.tasks.filter((x) => x.category === c),
          n = ts.filter((x) => x.done).length;
        return `<section class="panel"><div class="rowitem" style="padding-top:0"><div><h2>${esc(c)} · ${n}/${ts.length}</h2>${progress(n, ts.length)}</div>${action("Reiniciar", "resetTasks", c)}</div>${ts.map(taskRow).join("") || '<p class="muted">Sin tareas.</p>'}</section>`;
      })
      .join(
        "",
      )}<section class="panel"><h2>Profesiones</h2><div class="tablewrap"><table><thead><tr><th>Profesión</th><th>Nivel</th><th>Máximo confirmado</th><th>Notas</th><th></th></tr></thead><tbody>${state.professions.map((x, i) => `<tr><td>${esc(x.name)}</td><td>${val(x.level)}</td><td>${val(x.cap)}</td><td>${val(x.notes)}</td><td>${action("Editar", "profEdit", String(i))}</td></tr>`).join("")}</tbody></table></div></section><section class="panel"><h2>Montura épica</h2><div class="grid two"><div class="field"><label>Oro disponible</label><input data-mount="gold" type="number" min="0" placeholder="Desconocido" value="${esc(state.mount.gold)}"></div><div class="field"><label>Coste total previsto (oro)</label><input data-mount="target" type="number" min="0" placeholder="Desconocido" value="${esc(state.mount.target)}"></div><div class="field"><label>Materiales y cantidades</label><textarea data-mount="materials">${esc(state.mount.materials)}</textarea></div><div class="field"><label>Requisitos y verificaciones</label><textarea data-mount="notes">${esc(state.mount.notes)}</textarea></div></div></section>`
  );
}
function journal() {
  return (
    head(
      "Evidencias personales",
      "Diario y capturas",
      "Registra recompensas, intentos de mazmorra y motivos de reemplazo con notas y capturas.",
    ) +
    `<div class="toolbar">${action("+ Nueva entrada", "noteEdit", "", "primary")}<input id="filter" placeholder="Buscar notas…" value="${esc(filter)}"></div><section class="panel" id="notesList">${noteRows()}</section>`
  );
}
function noteRows() {
  return (
    state.notes
      .filter((x) =>
        [x.title, x.notes, x.category, x.date]
          .join(" ")
          .toLowerCase()
          .includes(filter.toLowerCase()),
      )
      .map(
        (x) =>
          `<div class="rowitem"><div><b>${val(x.title)}</b> <span class="tag">${esc(x.category)}</span><p class="tiny muted">${val(x.date)}</p><p class="detail">${esc(x.notes)}</p>${photoView(x.photo)}</div><div>${action("Editar", "noteEdit", x.id)} ${action("Eliminar", "deleteNote", x.id, "small danger")}</div></div>`,
      )
      .join("") ||
    '<div class="empty">Sin entradas. Añade tu próxima recompensa o decisión.</div>'
  );
}
let modalSave = null;
function modal(title, body, onSave, deleteFn = null) {
  $("modalContent").innerHTML =
    `<div class="dialoghead"><h2 id="modalTitle">${esc(title)}</h2><button type="button" id="closeModal" aria-label="Cerrar">×</button></div><form id="editForm"><div class="formgrid">${body}</div><p id="modalError" class="form-error full" role="alert" hidden></p><div class="actions" style="margin-top:18px"><button class="primary" type="submit">Guardar cambios</button><button type="button" id="cancelModal">Cancelar</button>${deleteFn ? '<button type="button" id="modalDelete" class="danger">Eliminar</button>' : ""}</div></form>`;
  modalSave = onSave;
  $("closeModal").onclick = $("cancelModal").onclick = () => $("modal").close();
  if (deleteFn)
    $("modalDelete").onclick = () => {
      if (confirm("¿Eliminar este registro?")) {
        deleteFn();
        $("modal").close();
        save();
        render();
      }
    };
  $("editForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      const fd = new FormData(e.target);
      await modalSave(fd);
      $("modal").close();
      save();
      render();
    } catch (err) {
      $("modalError").textContent = err.message || "No se pudo guardar";
      $("modalError").hidden = false;
    } finally {
      btn.disabled = false;
    }
  };
  $("modal").showModal();
  $("editForm")
    .querySelector("input:not([type=file]),select,textarea")
    ?.focus();
}
const get = (fd, k) => String(fd.get(k) ?? "").trim();
function collect(fd, keys) {
  return Object.fromEntries(keys.map((k) => [k, get(fd, k)]));
}
async function getPhoto(fd, old) {
  let f = fd.get("photoFile");
  if (!f || !f.size) return fd.has("removePhoto") ? "" : old || "";
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type))
    throw Error("Formato de imagen no admitido");
  if (f.size > 20 * 1024 * 1024) throw Error("La captura supera 20 MB");
  return new Promise((res, rej) => {
    let img = new Image();
    let u = URL.createObjectURL(f);
    img.onload = () => {
      try {
        let scale = Math.min(1, 1100 / Math.max(img.width, img.height)),
          c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.76));
      } catch (e) {
        rej(e);
      } finally {
        URL.revokeObjectURL(u);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      rej(Error("No se pudo abrir la captura"));
    };
    img.src = u;
  });
}
function upsert(arr, x) {
  let i = arr.findIndex((a) => a.id === x.id);
  if (i === -1) arr.push(x);
  else arr[i] = x;
}
function erase(arr, id) {
  let i = arr.findIndex((x) => x.id === id);
  if (i >= 0) arr.splice(i, 1);
}
function editItem(kind, id, slot) {
  const arr = kind === "gear" ? state.gear : state.items;
  let old = arr.find((x) => x.id === id) || {
    id: uid(),
    name: "",
    slot: slot || "Cabeza",
    spec,
    stats: {},
    decision: "Sin decidir",
    enchant: "",
    source: "",
    notes: "",
    photo: "",
  };
  modal(
    kind === "gear" ? "Editar equipo · " + old.slot : "Alternativa de equipo",
    field("name", "Nombre del objeto", old.name, "text", [], true) +
      field("slot", "Ranura", old.slot, "select", SLOTS) +
      field("spec", "Especialización", old.spec, "select", ["Ret", "Holy"]) +
      field("enchant", "Encantamiento", old.enchant) +
      field("decision", "Decisión", old.decision, "select", DECISIONS) +
      field("source", "Origen, misión o jefe", old.source, "text", [], true) +
      STATS.map((k, i) =>
        field("stat" + i, k, old.stats?.[k] ?? "", "number"),
      ).join("") +
      field(
        "notes",
        "Notas, bonus, procs y motivo de decisión",
        old.notes,
        "textarea",
        [],
        true,
      ) +
      photoField(old.photo),
    async (fd) => {
      let x = {
        ...old,
        ...collect(fd, [
          "name",
          "slot",
          "spec",
          "enchant",
          "decision",
          "source",
          "notes",
        ]),
        stats: Object.fromEntries(
          STATS.map((k, i) => [k, get(fd, "stat" + i)]),
        ),
        photo: await getPhoto(fd, old.photo),
      };
      if (!x.name) throw Error("Escribe el nombre del objeto");
      if (
        kind === "gear" &&
        arr.some(
          (y) => y.id !== old.id && y.spec === x.spec && y.slot === x.slot,
        )
      )
        throw Error(
          "Ya existe equipo registrado en esa ranura y especialización. Edita ese objeto.",
        );
      upsert(arr, x);
    },
    arr.some((x) => x.id === old.id) ? () => erase(arr, old.id) : null,
  );
}
function editQuest(id, chain = "") {
  let x = state.quests.find((q) => q.id === id) || quest("", chain);
  modal(
    "Registro de misión",
    field("name", "Nombre", x.name, "text", [], true) +
      field("chain", "Cadena", x.chain) +
      field("zone", "Zona", x.zone) +
      field("level", "Nivel", x.level) +
      field("status", "Estado", x.status, "select", QSTATUS) +
      field("npc", "NPC", x.npc) +
      field("coords", "Coordenadas", x.coords) +
      field("tomtom", "Comando TomTom (manual)", x.tomtom, "text", [], true) +
      field("reward", "Recompensa", x.reward, "textarea", [], true) +
      field("evidence", "Evidencia", x.evidence, "select", EVIDENCE) +
      field("date", "Fecha de verificación", x.date, "date") +
      field(
        "source",
        "Enlace de fuente (opcional)",
        x.source,
        "url",
        [],
        true,
      ) +
      field("notes", "Notas y próximos pasos", x.notes, "textarea", [], true) +
      photoField(x.photo),
    async (fd) => {
      let y = {
        ...x,
        ...collect(fd, [
          "name",
          "chain",
          "zone",
          "level",
          "status",
          "npc",
          "coords",
          "tomtom",
          "reward",
          "evidence",
          "date",
          "source",
          "notes",
        ]),
        photo: await getPhoto(fd, x.photo),
      };
      if (!y.name) throw Error("Escribe el nombre de la misión");
      upsert(state.quests, y);
    },
  );
}
function basicEdit(arr, id, title, base, fields) {
  let x = arr.find((y) => y.id === id) || { id: uid(), ...base };
  modal(
    title,
    fields
      .map(([k, label, type = "text", options = [], full = false]) =>
        field(k, label, x[k], type, options, full),
      )
      .join(""),
    (fd) => {
      let y = {
        ...x,
        ...collect(
          fd,
          fields.map((f) => f[0]),
        ),
      };
      let key = fields[0][0];
      if (!y[key]) throw Error("Completa el campo principal");
      upsert(arr, y);
    },
    arr.some((y) => y.id === x.id) ? () => erase(arr, x.id) : null,
  );
}
$("nav").onclick = (e) => {
  let b = e.target.closest("[data-nav]");
  if (b) go(b.dataset.nav);
};
$("main").addEventListener("click", async (e) => {
  let b = e.target.closest("[data-act]");
  if (!b) return;
  let { act, id } = b.dataset;
  if (await extraAction(act, id)) return;
  switch (act) {
    case "goto":
      go(id);
      return;
    case "spec":
      spec = id;
      render();
      return;
    case "profile": {
      let x = state.profile;
      modal(
        "Editar personaje",
        field("name", "Nombre", x.name) +
          field("realm", "Reino", x.realm) +
          field("race", "Raza", x.race) +
          field("level", "Nivel", x.level, "number") +
          field("notes", "Notas", x.notes, "textarea", [], true),
        (fd) =>
          Object.assign(
            x,
            collect(fd, ["name", "realm", "race", "level", "notes"]),
          ),
      );
      return;
    }
    case "gearEdit":
      editItem(
        "gear",
        state.gear.find((x) => x.spec === spec && x.slot === id)?.id,
        id,
      );
      return;
    case "gearById":
      editItem("gear", id);
      return;
    case "itemEdit":
      editItem("item", id);
      return;
    case "gearCompare":
      compareA = id;
      go("compare");
      return;
    case "chooseB":
      compareB = id;
      render();
      return;
    case "equip": {
      let x = state.items.find((y) => y.id === id);
      if (!x) return;
      let old = state.gear.find((y) => y.spec === x.spec && y.slot === x.slot);
      if (
        !confirm(
          `Equipar ${x.name} en el registro de ${x.spec}? ${old ? "El equipo anterior se conservará como alternativa." : ""} No cambia nada en el juego.`,
        )
      )
        return;
      if (old) {
        erase(state.gear, old.id);
        state.items.push({ ...old, decision: "Conservar" });
      }
      erase(state.items, x.id);
      state.gear.push({ ...x, decision: "Equipar" });
      break;
    }
    case "questEdit":
      editQuest(id);
      return;
    case "quest50":
      editQuest("", "Paladín nivel 50");
      return;
    case "copyQuest": {
      let x = state.quests.find((q) => q.id === id);
      try {
        await navigator.clipboard.writeText(x.tomtom);
        toast("Comando copiado");
      } catch {
        prompt("Copia el comando TomTom:", x.tomtom);
      }
      return;
    }
    case "planEdit":
      basicEdit(
        state.plans,
        id,
        "Plan de mazmorra",
        {
          name: "",
          priority: "Media",
          status: "Pendiente",
          role: "Ret / Holy",
          goals: "",
          notes: "",
        },
        [
          ["name", "Mazmorra"],
          ["priority", "Prioridad", "select", ["Alta", "Media", "Baja"]],
          [
            "status",
            "Estado",
            "select",
            ["Pendiente", "En curso", "Completado", "Bloqueada", "Desconocido"],
          ],
          ["role", "Rol"],
          ["goals", "Objetivos de equipo y misiones", "textarea", [], true],
          ["notes", "Mejoras, requisitos y notas", "textarea", [], true],
        ],
      );
      return;
    case "resetEdit":
      basicEdit(
        state.resets,
        id,
        "Bloqueo de instancia",
        {
          name: "",
          status: "Desconocido",
          date: "",
          tz: "Perú (UTC−5)",
          notes: "",
        },
        [
          ["name", "Instancia"],
          [
            "status",
            "Estado",
            "select",
            ["Desconocido", "Libre", "Bloqueada", "Pendiente"],
          ],
          ["date", "Próximo reset", "datetime-local"],
          ["tz", "Zona horaria"],
          ["notes", "Notas / ID de bloqueo", "textarea", [], true],
        ],
      );
      return;
    case "forumEdit":
      basicEdit(
        state.forum,
        id,
        "Publicación del foro",
        { title: "", url: "", status: "Por confirmar", date: "", notes: "" },
        [
          ["title", "Título"],
          ["url", "URL", "url"],
          [
            "status",
            "Estado",
            "select",
            [
              "Por confirmar",
              "Verificado en juego",
              "Verificado en fuente",
              "Contradicho",
              "Desconocido",
            ],
          ],
          ["date", "Fecha de verificación", "date"],
          ["notes", "Afirmación, evidencia y dudas", "textarea", [], true],
        ],
      );
      return;
    case "taskEdit": {
      let x =
        state.tasks.find((y) => y.id === id) ||
        task(taskFilter === "Todos" ? "Otros" : taskFilter, "");
      modal(
        "Editar tarea",
        field("name", "Tarea", x.name, "text", [], true) +
          field("category", "Categoría", x.category, "select", CATEGORIES) +
          field("notes", "Notas", x.notes, "textarea", [], true),
        (fd) => {
          let y = { ...x, ...collect(fd, ["name", "category", "notes"]) };
          if (!y.name) throw Error("Escribe la tarea");
          upsert(state.tasks, y);
        },
        state.tasks.some((y) => y.id === x.id)
          ? () => erase(state.tasks, x.id)
          : null,
      );
      return;
    }
    case "resetTasks":
      if (!confirm("¿Desmarcar todas las tareas de " + id + "?")) return;
      state.tasks
        .filter((x) => x.category === id)
        .forEach((x) => (x.done = false));
      break;
    case "profEdit": {
      let x = state.professions[Number(id)];
      modal(
        "Profesión · " + x.name,
        field("level", "Nivel actual", x.level, "number") +
          field("cap", "Máximo confirmado", x.cap, "number") +
          field(
            "notes",
            "Entrenador, recetas y materiales",
            "" + x.notes,
            "textarea",
            [],
            true,
          ),
        (fd) => Object.assign(x, collect(fd, ["level", "cap", "notes"])),
      );
      return;
    }
    case "noteEdit": {
      let x = state.notes.find((y) => y.id === id) || {
        id: uid(),
        title: "",
        category: "Equipo",
        date: new Date().toLocaleDateString("sv-SE"),
        notes: "",
        photo: "",
      };
      modal(
        "Entrada del diario",
        field("title", "Título", x.title, "text", [], true) +
          field("category", "Categoría", x.category, "select", CATEGORIES) +
          field("date", "Fecha", x.date, "date") +
          field("notes", "Notas y decisiones", x.notes, "textarea", [], true) +
          photoField(x.photo),
        async (fd) => {
          let y = {
            ...x,
            ...collect(fd, ["title", "category", "date", "notes"]),
            photo: await getPhoto(fd, x.photo),
          };
          if (!y.title) throw Error("Escribe un título");
          upsert(state.notes, y);
        },
      );
      return;
    }
    default: {
      let mapping = {
        deleteItem: "items",
        deleteQuest: "quests",
        deleteForum: "forum",
        deleteReset: "resets",
        deleteNote: "notes",
      };
      if (mapping[act]) {
        if (!confirm("¿Eliminar este registro?")) return;
        erase(state[mapping[act]], id);
      } else return;
    }
  }
  save();
  render();
});
$("main").addEventListener("change", (e) => {
  let t = e.target;
  if (t.dataset.stat) {
    state.stats[spec][t.dataset.stat] = t.value;
    save();
  } else if (t.dataset.task) {
    let x = state.tasks.find((y) => y.id === t.dataset.task);
    if (x) {
      x.done = t.checked;
      save();
      render();
    }
  } else if (t.dataset.mount) {
    state.mount[t.dataset.mount] = t.value;
    save();
  } else if (t.id === "build") {
    state.builds[spec] = t.value;
    save();
  } else if (t.id === "tierCount") {
    state.profile.tierCount = t.value;
    save();
  } else if (t.id === "tierNotes") {
    state.profile.tierNotes = t.value;
    save();
  } else if (t.id === "compareA") {
    compareA = t.value;
    render();
  } else if (t.id === "compareB") {
    compareB = t.value;
    render();
  } else if (t.id === "taskFilter") {
    taskFilter = t.value;
    render();
  } else if (["qfilter", "chainFilter", "zoneFilter"].includes(t.id)) {
    if (t.id === "qfilter") qfilter = t.value;
    if (t.id === "chainFilter") chainFilter = t.value;
    if (t.id === "zoneFilter") zoneFilter = t.value;
    $("questList").innerHTML = questRows(filteredQuests());
  }
});
$("main").addEventListener("input", (e) => {
  let t = e.target;
  if (t.id === "filter") {
    filter = t.value;
    if (page === "compare")
      $("inventory").innerHTML = inventoryRows(
        state.items.filter((x) =>
          (x.name + " " + x.slot + " " + x.spec + " " + x.decision)
            .toLowerCase()
            .includes(filter.toLowerCase()),
        ),
      );
    if (page === "quests")
      $("questList").innerHTML = questRows(filteredQuests());
    if (page === "journal") $("notesList").innerHTML = noteRows();
  } else if (t.id === "levelFilter") {
    levelFilter = t.value;
    $("questList").innerHTML = questRows(filteredQuests());
  }
});
$("importBtn").onclick = () => $("importFile").click();

$("main").addEventListener("change", (e) => {
  if (e.target.dataset.onyx) {
    let q = state.quests.find((q) => q.id === e.target.dataset.onyx);
    if (q) {
      q.status = e.target.value;
      save();
      render();
    }
  }
});
$("main").addEventListener("click", (e) => {
  const button = e.target.closest('[data-local="removeSim"]');
  if (!button || !confirm("¿Eliminar esta simulación?")) return;
  state.simRecords.splice(Number(button.dataset.index), 1);
  simA = simB = "";
  save();
  render();
});

const pages = [
  ["home", "Dashboard", "Cuartel", "◈"],
  ["priorities", "Prioridades", "Cuartel", "☷"],
  ["gear", "Equipo y estadísticas", "Personaje", "♜"],
  ["specs", "Especializaciones", "Personaje", "✦"],
  ["compare", "Comparador", "Personaje", "⇄"],
  ["quests", "Misiones", "Progresión", "⚑"],
  ["tier", "Tier 0 / 0.5", "Progresión", "◇"],
  ["onyxia", "Acceso a Onyxia", "Progresión", "♨"],
  ["dungeons", "Mazmorras", "Progresión", "⌂"],
  ["reals", "Reals", "Progresión", "◉"],
  ["simulations", "Simulaciones DPS", "Progresión", "↗"],
  ["check", "Preparación y profesiones", "Registros", "☑"],
  ["journal", "Diario y capturas", "Registros", "▤"],
  ["fifty", "Cadena nivel 50", "Registros", "⚐"],
];
const aliases = { progress: "onyxia" };
let priorityFilter = "Todas",
  simA = "",
  simB = "";
const number = (n) =>
  Number(n).toLocaleString("es-PE", { maximumFractionDigits: 2 });
const dateNow = () => localDate(new Date(), state.settings.timezone);
const specName = () => (spec === "Ret" ? "Retribution" : "Holy");
const empty = (text) =>
  `<div class="empty"><span class="empty-icon">◇</span>${text}</div>`;
const metric = (label, value, detail = "", cls = "") =>
  `<div class="metric ${cls}"><span>${label}</span><b>${value}</b><small>${detail}</small></div>`;

function save() {
  if (storageRecovery) {
    $("saveStatus").textContent = "Revisa tu respaldo";
    toast(
      "El registro almacenado no es válido. Exporta tus cambios o importa un respaldo válido.",
    );
    return false;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageError = false;
    $("saveStatus").textContent = "Guardado en este navegador";
    $("saveStatus").classList.remove("save-error");
    updateHeader();
    return true;
  } catch {
    storageError = true;
    $("saveStatus").textContent = "Sin guardar · exporta";
    $("saveStatus").classList.add("save-error");
    toast("No se pudo guardar. Exporta un respaldo antes de cerrar.");
    return false;
  }
}
function updateHeader() {
  $("sidebarName").textContent = state.profile.name || "Personaje";
  $("sidebarInfo").textContent =
    `Paladín · Nivel ${state.profile.level || "?"}`;
}
function closeMenu() {
  document.body.classList.remove("menu-open");
  $("menuToggle").setAttribute("aria-expanded", "false");
  $("menuScrim").hidden = true;
  $("sidebar").inert = matchMedia("(max-width:700px)").matches;
}
function go(p, push = true) {
  p = aliases[p] || p;
  if (!pages.some(([id]) => id === p)) p = "home";
  page = p;
  filter = "";
  closeMenu();
  if (push && location.hash.slice(1) !== p)
    history.pushState(null, "", "#" + p);
  render();
  window.scrollTo(0, 0);
  $("main").focus({ preventScroll: true });
}
function nav() {
  let group = "";
  $("nav").innerHTML = pages
    .map(([id, name, section, icon]) => {
      const heading =
        section !== group ? `<div class="nav-group">${section}</div>` : "";
      group = section;
      const pending =
        id === "priorities"
          ? state.priorities.filter((p) => !priorityDone(p, state.settings))
              .length
          : 0;
      return (
        heading +
        `<button data-nav="${id}" class="${page === id ? "active" : ""}" ${page === id ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${name}</span>${pending ? `<small class="nav-count" aria-hidden="true">${pending}</small>` : ""}</button>`
      );
    })
    .join("");
  $("pageLabel").textContent =
    pages.find(([id]) => id === page)?.[1] || "Dashboard";
}
function field(
  name,
  label,
  value = "",
  type = "text",
  options = [],
  full = false,
) {
  const id = "field-" + name;
  let input =
    type === "textarea"
      ? `<textarea id="${id}" name="${name}">${esc(value)}</textarea>`
      : type === "select"
        ? `<select id="${id}" name="${name}">${opts(options, String(value))}</select>`
        : `<input id="${id}" name="${name}" type="${type}" value="${esc(value)}" ${type === "number" ? 'step="any"' : ""}>`;
  return `<div class="field ${full ? "full" : ""}"><label for="${id}">${esc(label)}</label>${input}</div>`;
}
function render() {
  const functions = {
    home,
    priorities,
    gear,
    compare,
    specs: specializations,
    quests,
    tier,
    onyxia,
    dungeons,
    reals,
    simulations,
    check,
    journal,
    fifty,
  };
  nav();
  updateHeader();
  $("main").innerHTML = functions[page]();
  // Los formularios heredados también reciben etiquetas asociadas y tablas navegables.
  $("main")
    .querySelectorAll(".field")
    .forEach((field, i) => {
      const control = field.querySelector("input,select,textarea"),
        label = field.querySelector("label");
      if (control && label) {
        control.id ||= `control-${page}-${i}`;
        label.htmlFor = control.id;
      }
    });
  const labels = {
    filter: "Buscar en esta sección",
    qfilter: "Filtrar por estado",
    chainFilter: "Filtrar por cadena",
    zoneFilter: "Filtrar por zona",
    levelFilter: "Filtrar por nivel",
    taskFilter: "Filtrar checklist por categoría",
    build: "Talentos y build",
    onyxCommand: "Comando de comprobación de Onyxia",
  };
  for (const [id, label] of Object.entries(labels))
    if ($(id)) $(id).setAttribute("aria-label", label);
  $("main")
    .querySelectorAll(".tablewrap")
    .forEach((table, i) => {
      table.tabIndex = 0;
      table.setAttribute("role", "region");
      table.setAttribute("aria-label", "Tabla desplazable " + (i + 1));
    });
  $("main")
    .querySelectorAll(".tabs button")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.classList.contains("active")),
      ),
    );
  if (storageError)
    $("main").insertAdjacentHTML(
      "afterbegin",
      `<div class="note error" id="storageWarning">El almacenamiento no está disponible o contiene un registro inválido. Exporta tus cambios antes de cerrar. No se ha reemplazado el registro almacenado. ${storageRecovery ? action("Descargar registro inválido para recuperación", "downloadRecovery") : ""}</div>`,
    );
}
function home() {
  const daily = state.priorities.filter((p) => p.cadence === "Diaria"),
    done = daily.filter((p) => priorityDone(p, state.settings)).length;
  const onyx = state.quests.filter((q) => q.chain === "Onyxia · Horda"),
    completed = onyx.filter((q) => q.status === "Completada").length,
    next = onyx.find((q) => q.status !== "Completada");
  const tierQuest = state.quests.find(
    (q) => q.chain === "Tier 0.5" && q.status !== "Completada",
  );
  const equipped = state.gear.filter((g) => g.spec === spec).length;
  const date = new Intl.DateTimeFormat("es-PE", {
    timeZone: state.settings.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return `<div class="section-intro"><div><div class="eyebrow">TU AVENTURA CONTINÚA</div><h1>El cuartel de ${esc(state.profile.name)}<span class="gold">.</span></h1><p class="muted">Un objetivo a la vez. Una mejora más cerca.</p></div><span class="date-label">${esc(date)}</span></div>
    <section class="hero"><div class="hero-content"><div class="hero-badge"><span class="status-dot"></span> ${esc(state.profile.realm)} · HORDA · NIVEL ${esc(state.profile.level)}</div><h2>Que la Luz<br>guíe tu siguiente paso.</h2><p>Tu equipo, tus misiones y el plan para hoy.<br> Todo listo para volver a Azeroth.</p><div class="actions">${action("Ver mis prioridades →", "goto", "priorities", "primary")}${action("Editar personaje", "profile", "", "ghost")}</div></div><div class="hero-art" aria-hidden="true"><div class="rune-ring"></div><div class="rune-ring inner"></div><img src="./assets/crest.svg" width="195" height="232" alt=""><span class="art-caption">JUANKAL · PALADÍN</span></div></section>
    <div class="metrics">${metric("PRIORIDADES DE HOY", `${done}<em> / ${daily.length}</em>`, "Marca lo que avances hoy", "gold-metric")}${metric("EQUIPO " + specName().toUpperCase(), `${equipped}<em> / ${SLOTS.length}</em>`, "Ranuras registradas")}${metric("ACCESO A ONYXIA", `${completed}<em> / ${onyx.length}</em>`, "Pasos completados")}${metric("BALANCE DE REALS", number(realsBalance(state.reals)), "Según movimientos registrados")}</div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><div class="eyebrow">TU PLAN DE SESIÓN</div><h2>Lo primero, hoy</h2></div>${action("Ver todo ↗", "goto", "priorities", "text-button")}</div>${daily.length ? sortedPriorities(daily, state.settings).slice(0, 4).map(priorityRow).join("") : empty("Crea una prioridad para empezar.")}</section>
    <section class="panel route-card"><div class="eyebrow">EL SIGUIENTE OBJETIVO</div><div class="route-symbol" aria-hidden="true">♨</div><h2>Camino a Onyxia</h2><p class="route-next">${esc(next?.name || (onyx.length ? "Cadena completada" : "Registra los pasos de tu cadena"))}</p>${progress(completed, onyx.length)}<div class="progress-caption"><span>${completed} de ${onyx.length} pasos</span><span>${onyx.length ? Math.round((completed / onyx.length) * 100) : 0}%</span></div>${action("Abrir ruta de acceso →", "goto", "onyxia", "wide")}</section></div>
    <div class="section-intro compact"><div><div class="eyebrow">PROGRESIÓN DE ENDGAME</div><h2>Tu próxima mejora</h2></div></div><div class="grid three"><section class="panel objective-card"><span class="objective-icon">◇</span><span class="tag">TIER 0.5</span><h2>${esc(tierQuest?.name || "Revisa tu conjunto")}</h2><p class="muted">${esc(tierQuest?.zone || "Registra piezas, bonos y objetivos pendientes.")}</p>${action("Seguir la cadena →", "goto", "tier", "text-button")}</section><section class="panel objective-card"><span class="objective-icon">⌂</span><span class="tag">MAZMORRAS</span><h2>El botín tiene un plan</h2><p class="muted">Objetivos por instancia, roles y bloqueos a mano.</p>${action("Preparar una salida →", "goto", "dungeons", "text-button")}</section><section class="panel objective-card"><span class="objective-icon">↗</span><span class="tag">RETRIBUTION</span><h2>Compara antes de equipar</h2><p class="muted">Guarda tus resultados de DPS y mide cada cambio.</p>${action("Ver simulaciones →", "goto", "simulations", "text-button")}</section></div>
    <div class="local-notice"><span aria-hidden="true">▣</span><p><b>Este diario vive en tu navegador.</b> Exporta un respaldo para guardar una copia o llevar tus datos a otro dispositivo. Los datos iniciales son reportes del archivo original; confirma sus cifras en el juego.</p></div>`;
}
function priorityRow(row) {
  const done = priorityDone(row, state.settings);
  return `<div class="priority-row ${done ? "done" : ""}"><input type="checkbox" data-priority="${esc(row.id)}" aria-label="Completar ${esc(row.name)}" ${done ? "checked" : ""}><div class="priority-text"><b>${esc(row.name)}</b><p>${esc(row.notes)}</p><div class="priority-meta"><span class="priority-level ${row.priority.toLowerCase()}">${esc(row.priority)}</span><span>${esc(row.cadence)}</span>${row.spec !== "Ambas" ? `<span>${esc(row.spec)}</span>` : ""}</div></div><div class="row-actions">${row.target && pages.some(([id]) => id === row.target) ? action("Abrir", "goto", row.target, "text-button") : ""}${action("Editar", "priorityEdit", row.id, "icon-edit")}</div></div>`;
}
function priorities() {
  const rows = sortedPriorities(
      state.priorities.filter(
        (p) => priorityFilter === "Todas" || p.cadence === priorityFilter,
      ),
      state.settings,
    ),
    done = rows.filter((p) => priorityDone(p, state.settings)).length;
  return (
    head(
      "CADA SESIÓN CUENTA",
      "Tus prioridades",
      "Elige qué avanzar hoy y qué reservar para esta semana.",
    ) +
    `<div class="toolbar">${action("+ Nueva prioridad", "priorityEdit", "", "primary")}<select id="priorityFilter" aria-label="Filtrar prioridades">${opts(["Todas", ...CADENCES], priorityFilter)}</select>${action("Configurar reinicios", "routineSettings")}</div><section class="panel"><div class="panel-heading"><h2>${priorityFilter === "Todas" ? "Plan personal" : esc(priorityFilter)}</h2><span class="tag">${done} / ${rows.length} completadas</span></div>${progress(done, rows.length)}${rows.length ? rows.map(priorityRow).join("") : empty("No hay prioridades. Añade la primera.")}</section><div class="local-notice"><span>◷</span><p>Reinicio diario a las <b>${state.settings.resetHour}:00</b> · semana desde <b>${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][state.settings.resetWeekday]}</b> · ${esc(state.settings.timezone)}. Son horarios de tu planificación personal. Los resets y límites del juego se registran en Mazmorras.</p></div>`
  );
}
function specializations() {
  return (
    head(
      "DOS FORMAS DE SERVIR A LA LUZ",
      "Especializaciones",
      "Mantén separados tus sets, estadísticas y notas de talentos.",
    ) +
    tabs() +
    `<div class="grid two"><section class="panel spec-card"><div class="eyebrow">${spec === "Ret" ? "DAÑO CUERPO A CUERPO" : "SANACIÓN"}</div><div class="spec-emblem">${spec === "Ret" ? "✦" : "✧"}</div><h2>${specName()}</h2><p class="muted">${state.gear.filter((g) => g.spec === spec).length} ranuras registradas · ${state.items.filter((g) => g.spec === spec).length} alternativas</p>${action("Revisar equipo y atributos →", "goto", "gear", "primary")}</section><section class="panel"><h2>Tu snapshot de atributos</h2><dl class="stat-list">${(spec === "Ret" ? ["Poder de ataque", "Golpe (%)", "Crítico (%)", "Fuerza"] : ["Sanación adicional", "Intelecto", "MP5", "Maná"]).map((k) => `<div><dt>${k}</dt><dd>${val(state.stats[spec][k])}</dd></div>`).join("")}</dl><p class="tiny muted">Cifras introducidas manualmente. Registra las condiciones de buffs en el diario.</p></section></div><section class="panel"><h2>Talentos y notas · ${specName()}</h2><label class="sr-only" for="build">Talentos y build</label><textarea id="build" rows="7" placeholder="Distribución de puntos, enlace de build, rotación y cambios pendientes…">${esc(state.builds[spec])}</textarea><p class="tiny muted">Guardado automático mientras escribes.</p></section>`
  );
}
function tier() {
  const list = state.quests.filter((q) => q.chain === "Tier 0.5"),
    n = list.filter((q) => q.status === "Completada").length;
  return (
    head(
      "EL CAMINO DEL CONJUNTO",
      "Tier 0 / Tier 0.5",
      "Identifica tus piezas y avanza la cadena a partir de lo que confirmes en el juego.",
    ) +
    `<div class="grid two"><section class="panel"><div class="eyebrow">TIER 0 · LIGHTFORGE</div><h2>Tu conjunto actual</h2><div class="field"><label for="tierCount">Piezas reportadas</label><input id="tierCount" type="number" min="0" max="8" value="${esc(state.profile.tierCount)}"></div><div class="field"><label for="tierNotes">Piezas, bonos y objetivos</label><textarea id="tierNotes" rows="4">${esc(state.profile.tierNotes)}</textarea></div>${action("Ver las piezas de mi equipo →", "goto", "gear", "text-button")}</section><section class="panel"><div class="eyebrow">TIER 0.5 · CADENA</div><h2>${n} de ${list.length} pasos registrados</h2>${progress(n, list.length)}<p class="muted">El progreso refleja únicamente las misiones de esta cadena que has registrado. Añade los pasos conforme los confirmes.</p>${action("+ Registrar paso", "tierQuest", "", "primary")}</section></div><section class="panel"><h2>Misiones de Tier 0.5</h2>${questRows(list)}</section><div class="note">Los pasos, recompensas y requisitos de Forever pueden diferir de otras versiones. Conserva la evidencia y verifica los datos antes de invertir materiales u oro.</div>`
  );
}
function onyxia() {
  const list = state.quests.filter((q) => q.chain === "Onyxia · Horda"),
    n = list.filter((q) => q.status === "Completada").length;
  return (
    head(
      "RUTA DE ACCESO · HORDA",
      "Camino a Onyxia",
      "Tu avance hacia el Drakefire Amulet, paso a paso.",
    ) +
    `<section class="panel"><div class="panel-heading"><h2>Progreso de la cadena</h2><span class="tag">${n} / ${list.length} completadas</span></div>${progress(n, list.length)}<p class="muted tiny">La ruta procede del registro original. Confirma disponibilidad, orden y requisitos en Forever; una misión pendiente puede estar aceptada.</p><div class="timeline">${list.map((q, i) => `<div class="timeline-step ${q.status === "Completada" ? "complete" : ""}"><span class="step-number">${q.status === "Completada" ? "✓" : String(i + 1).padStart(2, "0")}</span><div><b>${esc(q.name)}</b><p class="tiny muted">${esc(q.zone)} · ${esc(q.evidence)}</p></div><select data-onyx="${esc(q.id)}" aria-label="Estado ${esc(q.name)}">${opts(QSTATUS, q.status)}</select>${action("Detalles", "questEdit", q.id, "text-button")}</div>`).join("")}</div></section><section class="panel"><h2>Comprueba las entregas en el juego</h2><p class="muted">El comando comprueba misiones completadas; no distingue misiones activas de las que aún no aceptaste.</p><textarea id="onyxCommand" readonly rows="3">${esc(onyxCmd)}</textarea><div class="actions">${action("Copiar comando", "copyOnyx", "", "primary")}${action("Añadir paso", "onyxQuest")}</div></section>`
  );
}
function reals() {
  const income = state.reals
      .filter((r) => r.type === "Ingreso")
      .reduce((n, r) => n + Number(r.amount), 0),
    expense = state.reals
      .filter((r) => r.type === "Gasto")
      .reduce((n, r) => n + Number(r.amount), 0);
  return (
    head(
      "CADA RUN CUENTA",
      "Reals",
      "Registra lo que recibes, lo que gastas y de dónde viene.",
    ) +
    `<div class="metrics three">${metric("BALANCE REGISTRADO", number(income - expense), "Ingresos menos gastos", "gold-metric")}${metric("INGRESOS", number(income), "Incluye saldo inicial, si lo registraste")}${metric("GASTOS", number(expense), "Compras registradas manualmente")}</div><div class="toolbar">${action("+ Registrar movimiento", "realEdit", "", "primary")}</div><section class="panel"><h2>Historial de movimientos</h2>${
      state.reals.length
        ? `<div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Origen / compra</th><th>Tipo</th><th>Reals</th><th>Notas</th><th>Acción</th></tr></thead><tbody>${[
            ...state.reals,
          ]
            .reverse()
            .map(
              (r) =>
                `<tr><td class="nowrap">${esc(r.date)}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.type)}</td><td class="${r.type === "Ingreso" ? "positive" : "negative"}">${r.type === "Ingreso" ? "+" : "−"}${number(r.amount)}</td><td>${esc(r.notes)}</td><td>${action("Editar", "realEdit", r.id)}</td></tr>`,
            )
            .join("")}</tbody></table></div>`
        : empty(
            "Aún no hay movimientos. Puedes empezar registrando tu saldo actual como ingreso.",
          )
    }</section><div class="note">El balance parte de cero y refleja tus registros, no una consulta al juego. No se asume ningún límite diario de Reals ni elegibilidad por jefe; anota esas comprobaciones en las notas del movimiento.</div>`
  );
}
function simulations() {
  const records = state.simRecords,
    a = records[Number(simA)],
    b = records[Number(simB)];
  const delta =
    simA !== "" && simB !== "" && a && b ? simDelta(b.dps, a.dps) : null;
  const options = (selected) =>
    '<option value="">Seleccionar resultado</option>' +
    records
      .map(
        (r, i) =>
          `<option value="${i}" ${String(i) === selected ? "selected" : ""}>${esc(r.name)} · ${esc(r.dps)} DPS</option>`,
      )
      .join("");
  return (
    head(
      "MIDE TU SIGUIENTE MEJORA",
      "Simulaciones de DPS",
      "Compara resultados de Retribution antes de decidir qué equipar.",
    ) +
    `<div class="grid two"><section class="panel"><div class="eyebrow">01 · SIMULA TU PERSONAJE</div><h2>MythicSim · Forever</h2><p class="muted">Instala el exportador MythicSim, escribe <code>/msim</code> y copia el JSON en el simulador. Quick Sim mide tu set; Best Gear compara alternativas.</p><p><a class="external-link" href="https://mythicsim.com/wow-forever/sim" target="_blank" rel="noopener noreferrer">Abrir MythicSim ↗</a></p><p class="tiny muted">El exportado de bolsas requiere addon 0.3.0 o posterior, según la documentación del simulador.</p></section><section class="panel"><div class="eyebrow">02 · CONTRASTA Y REGISTRA</div><h2>Forever Sims · Retribution</h2><p class="muted">Mantén la misma duración, objetivo, raza, talentos, buffs y consumibles al comparar. Los simuladores pueden cambiar sus resultados al actualizarse.</p><p><a class="external-link" href="https://foreversims.com/sims/retribution-paladin" target="_blank" rel="noopener noreferrer">Abrir Forever Sims ↗</a></p>${action("Comparar atributos de objetos →", "goto", "compare", "text-button")}</section></div><section class="panel"><h2>Guardar un resultado</h2><form id="simForm"><div class="grid two"><div class="field"><label for="simName">Equipo o comparación</label><input id="simName" required maxlength="200" placeholder="Dreadforge · set base"></div><div class="field"><label for="simDps">DPS estimado</label><input id="simDps" type="number" min="0" step="any" required placeholder="Ej. 750"></div><div class="field full"><label for="simConditions">Condiciones y enlace al resultado</label><textarea id="simConditions" placeholder="Duración, buffs, objetivo, simulador y versión…"></textarea></div></div><button type="submit" class="primary">Guardar resultado</button></form></section><section class="panel"><h2>Comparar resultados</h2><div class="grid two"><div class="field"><label for="simA">A · Base</label><select id="simA">${options(simA)}</select></div><div class="field"><label for="simB">B · Alternativa</label><select id="simB">${options(simB)}</select></div></div>${delta ? `<div class="sim-result ${delta.dps >= 0 ? "positive" : "negative"}">${delta.dps >= 0 ? "+" : ""}${number(delta.dps)} <small>DPS · ${delta.percent >= 0 ? "+" : ""}${number(delta.percent)}%</small></div>` : empty("Selecciona dos resultados. La base debe superar 0 DPS para calcular el porcentaje.")}<p class="tiny muted">El delta es aritmético. Solo es comparable si las condiciones de A y B coinciden.</p></section><section class="panel"><h2>Historial · ${records.length} resultados</h2>${
      records.length
        ? [...records]
            .reverse()
            .map(
              (r, reverseIndex) =>
                `<div class="rowitem"><div><b>${esc(r.name)}</b><p class="tiny muted">${esc(r.date)} · ${esc(r.conditions)}</p></div><strong class="dps-value">${number(r.dps)} <small>DPS</small></strong><button class="small danger" data-local="removeSim" data-index="${records.length - 1 - reverseIndex}">Eliminar</button></div>`,
            )
            .join("")
        : empty(
            "Guarda tu primera simulación. El diario no calcula DPS por sí mismo.",
          )
    }</section>`
  );
}
async function extraAction(act, id) {
  switch (act) {
    case "downloadRecovery":
      if (recoveryRaw) downloadJson(recoveryRaw, "-recuperacion");
      return true;
    case "priorityEdit": {
      const old = state.priorities.find((p) => p.id === id) || {
        id: uid(),
        name: "",
        cadence: "Diaria",
        priority: "Alta",
        notes: "",
        spec: "Ambas",
        target: "",
        completions: {},
      };
      const targets = ["Sin enlace", ...pages.map((p) => p[1])];
      modal(
        "Prioridad personal",
        field("name", "Objetivo", old.name, "text", [], true) +
          field("cadence", "Frecuencia", old.cadence, "select", CADENCES) +
          field("priority", "Prioridad", old.priority, "select", PRIORITIES) +
          field("spec", "Especialización", old.spec, "select", [
            "Ambas",
            "Ret",
            "Holy",
          ]) +
          field(
            "target",
            "Abrir sección",
            pages.find(([p]) => p === old.target)?.[1] || "Sin enlace",
            "select",
            targets,
          ) +
          field(
            "notes",
            "Notas y próximos pasos",
            old.notes,
            "textarea",
            [],
            true,
          ),
        (fd) => {
          const row = {
            ...old,
            ...collect(fd, ["name", "cadence", "priority", "spec", "notes"]),
            target: pages.find((p) => p[1] === get(fd, "target"))?.[0] || "",
          };
          if (!row.name) throw Error("Escribe un objetivo");
          if (row.cadence !== old.cadence) row.completions = {};
          upsert(state.priorities, row);
        },
        state.priorities.some((p) => p.id === id)
          ? () => erase(state.priorities, id)
          : null,
      );
      return true;
    }
    case "routineSettings": {
      const days = [
          "Domingo",
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ],
        s = state.settings;
      modal(
        "Reinicios de tu planificación",
        `<p class="muted full">Estos horarios solo organizan tus tareas. Confirma los resets del juego en el cliente.</p>` +
          field("timezone", "Zona horaria IANA", s.timezone) +
          field("resetHour", "Hora diaria (0–23)", s.resetHour, "number") +
          field(
            "resetWeekday",
            "Inicio de semana",
            days[s.resetWeekday],
            "select",
            days,
          ),
        (fd) => {
          const timezone = get(fd, "timezone"),
            resetHour = Number(get(fd, "resetHour"));
          try {
            new Intl.DateTimeFormat("es", { timeZone: timezone }).format();
          } catch {
            throw Error("Zona horaria no válida. Ejemplo: America/Lima");
          }
          if (!Number.isInteger(resetHour) || resetHour < 0 || resetHour > 23)
            throw Error("La hora debe ser un entero entre 0 y 23");
          state.settings = {
            timezone,
            resetHour,
            resetWeekday: days.indexOf(get(fd, "resetWeekday")),
          };
        },
      );
      return true;
    }
    case "tierQuest":
      editQuest("", "Tier 0.5");
      return true;
    case "onyxQuest":
      editQuest("", "Onyxia · Horda");
      return true;
    case "copyOnyx":
      try {
        await navigator.clipboard.writeText(onyxCmd);
        toast("Comando copiado");
      } catch {
        prompt("Copia el comando", onyxCmd);
      }
      return true;
    case "realEdit": {
      const old = state.reals.find((r) => r.id === id) || {
        id: uid(),
        name: "",
        type: "Ingreso",
        amount: "",
        date: dateNow(),
        notes: "",
      };
      modal(
        "Movimiento de Reals",
        field("name", "Jefe, instancia o compra", old.name, "text", [], true) +
          field("type", "Tipo", old.type, "select", ["Ingreso", "Gasto"]) +
          field("amount", "Cantidad de Reals", old.amount, "number") +
          field("date", "Fecha", old.date, "date") +
          field(
            "notes",
            "Notas / elegibilidad comprobada",
            old.notes,
            "textarea",
            [],
            true,
          ),
        (fd) => {
          const row = {
            ...old,
            ...collect(fd, ["name", "type", "amount", "date", "notes"]),
          };
          if (
            !row.name ||
            !row.date ||
            !Number.isSafeInteger(Number(row.amount)) ||
            Number(row.amount) <= 0
          )
            throw Error(
              "Completa el origen, fecha y una cantidad entera mayor que cero",
            );
          const balance = realsBalance(
            state.reals.filter((r) => r.id !== old.id),
          );
          if (row.type === "Gasto" && Number(row.amount) > balance)
            throw Error(
              "El gasto supera tu saldo registrado. Registra primero tu saldo inicial o ingreso faltante.",
            );
          upsert(state.reals, row);
        },
        state.reals.some((r) => r.id === id)
          ? () => erase(state.reals, id)
          : null,
      );
      return true;
    }
    default:
      return false;
  }
}

$("menuToggle").onclick = () => {
  const open = document.body.classList.toggle("menu-open");
  $("menuToggle").setAttribute("aria-expanded", String(open));
  $("menuScrim").hidden = !open;
  $("sidebar").inert = !open;
  if (open) $("nav").querySelector("[aria-current]")?.focus();
};
$("menuScrim").onclick = closeMenu;
const mobileMenu = matchMedia("(max-width:700px)");
mobileMenu.addEventListener("change", closeMenu);
$("sidebar").inert = mobileMenu.matches;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
window.addEventListener("hashchange", () => go(location.hash.slice(1), false));
window.addEventListener("popstate", () => go(location.hash.slice(1), false));
document.addEventListener("click", (e) => {
  if (e.target.closest(".skip-link")) {
    e.preventDefault();
    $("main").focus();
    return;
  }
  if (e.target.closest(".brand")) {
    e.preventDefault();
    go("home");
  }
});
$("main").addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.priority) {
    const row = state.priorities.find((p) => p.id === t.dataset.priority);
    if (row) {
      setPriorityDone(row, t.checked, state.settings);
      save();
      render();
      $("main")
        .querySelector(`[data-priority="${CSS.escape(row.id)}"]`)
        ?.focus();
    }
  }
  if (t.id === "priorityFilter") {
    priorityFilter = t.value;
    render();
  }
  if (t.id === "simA" || t.id === "simB") {
    if (t.id === "simA") simA = t.value;
    else simB = t.value;
    render();
    $(t.id)?.focus();
  }
});
$("main").addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.stat) state.stats[spec][t.dataset.stat] = t.value;
  else if (t.dataset.mount) state.mount[t.dataset.mount] = t.value;
  else if (t.id === "build") state.builds[spec] = t.value;
  else if (t.id === "tierCount") state.profile.tierCount = t.value;
  else if (t.id === "tierNotes") state.profile.tierNotes = t.value;
  else return;
  save();
});
$("main").addEventListener("submit", (e) => {
  if (e.target.id !== "simForm") return;
  e.preventDefault();
  const name = $("simName").value.trim(),
    dps = $("simDps").value,
    conditions = $("simConditions").value.trim();
  if (!name || dps === "" || !Number.isFinite(Number(dps)) || Number(dps) < 0) {
    toast("Completa nombre y DPS válido");
    return;
  }
  state.simRecords.push({ name, dps, conditions, date: dateNow() });
  save();
  render();
  toast("Resultado guardado");
});

// La importación escribe primero: una cuota agotada nunca reemplaza el registro activo.
$("importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw Error("El respaldo supera 8 MB");
    const data = JSON.parse(await file.text());
    validate(data);
    const prepared = prepareState(data);
    validate(prepared);
    if (
      !confirm(
        "Importar este respaldo reemplazará el registro actual. ¿Continuar?",
      )
    )
      return;
    localStorage.setItem(KEY, JSON.stringify(prepared));
    state = prepared;
    storageError = storageRecovery = false;
    recoveryRaw = null;
    compareA = compareB = simA = simB = filter = "";
    qfilter = chainFilter = zoneFilter = "Todos";
    levelFilter = "";
    save();
    render();
    toast("Respaldo importado");
  } catch (error) {
    toast("No se pudo importar: " + error.message);
  } finally {
    e.target.value = "";
  }
};
$("exportBtn").onclick = () => {
  downloadJson(JSON.stringify(state, null, 2));
};
function downloadJson(content, suffix = "") {
  const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `juankal-wow-forever-${dateNow()}${suffix}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Respaldo preparado");
}
let periodSignature = () =>
    periodKey("Diaria", state.settings) +
    "|" +
    periodKey("Semanal", state.settings),
  lastPeriod = periodSignature();
function refreshPeriods() {
  const current = periodSignature();
  if (current !== lastPeriod && !$("modal").open) {
    if (
      $("main").querySelector(
        "input:not([type=checkbox]):focus,textarea:focus,select:focus",
      )
    )
      return;
    if (["home", "priorities"].includes(page)) {
      const focused = document.activeElement?.dataset.priority;
      render();
      if (focused)
        $("main")
          .querySelector(`[data-priority="${CSS.escape(focused)}"]`)
          ?.focus();
    }
    lastPeriod = current;
  }
}
setInterval(refreshPeriods, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshPeriods();
});
page = aliases[location.hash.slice(1)] || location.hash.slice(1) || "home";
if (!pages.some(([id]) => id === page)) page = "home";
render();
if (!storageError) save();
else
  $("saveStatus").textContent =
    "Almacenamiento no disponible · exporta respaldo";
