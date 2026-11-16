import { defaults, upgrade, uid, SLOTS } from "./data.js";

export const CADENCES = ["Diaria", "Semanal", "Una vez"];
export const PRIORITIES = ["Alta", "Media", "Baja"];
export const SETTINGS = {
  timezone: "America/Lima",
  resetHour: 0,
  resetWeekday: 1,
};

export function prepareState(data) {
  const state = data || defaults();
  upgrade(state);
  state.simRecords ??= [];
  state.reals ??= [];
  state.settings = { ...SETTINGS, ...state.settings };
  state.priorities ??= [
    [
      "Preparar la próxima salida",
      "Diaria",
      "Alta",
      "check",
      "Reparación, reactivos y consumibles según tu rol.",
    ],
    [
      "Revisar el siguiente paso de Onyxia",
      "Diaria",
      "Alta",
      "onyxia",
      "Consulta la ruta y confirma el estado en el juego.",
    ],
    [
      "Avanzar la cadena Tier 0.5",
      "Diaria",
      "Media",
      "tier",
      "Revisa la misión activa antes de farmear.",
    ],
    [
      "Planificar mazmorras y botín",
      "Semanal",
      "Alta",
      "dungeons",
      "Coordina el grupo y los objetivos de ambos sets.",
    ],
    [
      "Comparar mejoras de equipo",
      "Semanal",
      "Media",
      "simulations",
      "Simula con las mismas condiciones y guarda el resultado.",
    ],
    [
      "Exportar un respaldo del diario",
      "Semanal",
      "Baja",
      "",
      "Guarda tu JSON en un lugar privado.",
    ],
  ].map(([name, cadence, priority, target, notes]) => ({
    id: uid(),
    name,
    cadence,
    priority,
    target,
    notes,
    spec: "Ambas",
    completions: {},
  }));
  return state;
}

// Valida también los registros: un JSON bien formado puede tener una estructura inválida.
export function validate(state) {
  const fail = () => {
    throw Error(
      "Formato de respaldo no válido; el registro actual se conserva",
    );
  };
  const object = (value) =>
    value && typeof value === "object" && !Array.isArray(value);
  const scalar = (value) =>
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value));
  const flat = (value) =>
    object(value) &&
    Object.entries(value).every(
      ([key, v]) =>
        !["__proto__", "prototype", "constructor"].includes(key) && scalar(v),
    );
  if (
    !object(state) ||
    state.version !== 1 ||
    !flat(state.profile) ||
    !object(state.stats) ||
    !flat(state.stats.Ret) ||
    !flat(state.stats.Holy) ||
    !flat(state.builds) ||
    typeof state.builds.Ret !== "string" ||
    typeof state.builds.Holy !== "string" ||
    !flat(state.mount)
  )
    fail();
  const required = {
    gear: "name",
    items: "name",
    quests: "name",
    forum: "title",
    plans: "name",
    resets: "name",
    tasks: "name",
    notes: "title",
    professions: "name",
  };
  for (const [key, title] of Object.entries(required)) {
    if (!Array.isArray(state[key]) || state[key].length > 10000) fail();
    const ids = new Set();
    for (const row of state[key]) {
      if (!object(row) || typeof row[title] !== "string") fail();
      if (key !== "professions") {
        if (typeof row.id !== "string" || !row.id || ids.has(row.id)) fail();
        ids.add(row.id);
      }
      for (const [field, value] of Object.entries(row)) {
        if (["__proto__", "prototype", "constructor"].includes(field)) fail();
        if (field === "stats" && ["gear", "items"].includes(key)) {
          if (!flat(value)) fail();
        } else if (field === "done" && key === "tasks") {
          if (typeof value !== "boolean") fail();
        } else if (["level", "cap"].includes(field)) {
          if (!scalar(value)) fail();
        } else if (typeof value !== "string") fail();
      }
      if (
        ["gear", "items"].includes(key) &&
        (!["Ret", "Holy"].includes(row.spec) || !SLOTS.includes(row.slot))
      )
        fail();
      if (key === "tasks" && typeof row.done !== "boolean") fail();
    }
  }
  const occupied = state.gear.map((row) => row.spec + ":" + row.slot);
  if (new Set(occupied).size !== occupied.length) fail();
  if (
    state.simRecords !== undefined &&
    (!Array.isArray(state.simRecords) ||
      !state.simRecords.every(
        (row) =>
          flat(row) &&
          typeof row.name === "string" &&
          Number.isFinite(Number(row.dps)) &&
          Number(row.dps) >= 0 &&
          row.dps !== "",
      ))
  )
    fail();
  if (
    state.reals !== undefined &&
    (!Array.isArray(state.reals) ||
      !state.reals.every(
        (row) =>
          flat(row) &&
          typeof row.id === "string" &&
          typeof row.name === "string" &&
          ["Ingreso", "Gasto"].includes(row.type) &&
          Number.isSafeInteger(Number(row.amount)) &&
          Number(row.amount) > 0,
      ))
  )
    fail();
  if (state.settings !== undefined) {
    const s = state.settings;
    if (
      !object(s) ||
      typeof s.timezone !== "string" ||
      !Number.isInteger(s.resetHour) ||
      s.resetHour < 0 ||
      s.resetHour > 23 ||
      !Number.isInteger(s.resetWeekday) ||
      s.resetWeekday < 0 ||
      s.resetWeekday > 6
    )
      fail();
    try {
      new Intl.DateTimeFormat("en", { timeZone: s.timezone }).format();
    } catch {
      fail();
    }
  }
  if (
    state.priorities !== undefined &&
    (!Array.isArray(state.priorities) ||
      !state.priorities.every(
        (row) =>
          object(row) &&
          typeof row.id === "string" &&
          typeof row.name === "string" &&
          typeof row.notes === "string" &&
          typeof row.target === "string" &&
          ["Ret", "Holy", "Ambas"].includes(row.spec) &&
          CADENCES.includes(row.cadence) &&
          PRIORITIES.includes(row.priority) &&
          object(row.completions) &&
          Object.entries(row.completions).every(
            ([key, value]) =>
              /^(once|\d{4}-\d{2}-\d{2})$/.test(key) && value === true,
          ),
      ))
  )
    fail();
}

function localParts(now, timezone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}

export function localDate(now = new Date(), timezone = SETTINGS.timezone) {
  const p = localParts(now, timezone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function periodKey(cadence, settings = SETTINGS, now = new Date()) {
  if (cadence === "Una vez") return "once";
  const p = localParts(now, settings.timezone);
  const date = new Date(
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)),
  );
  if (Number(p.hour) < settings.resetHour)
    date.setUTCDate(date.getUTCDate() - 1);
  if (cadence === "Semanal")
    date.setUTCDate(
      date.getUTCDate() - ((date.getUTCDay() - settings.resetWeekday + 7) % 7),
    );
  return date.toISOString().slice(0, 10);
}

export const priorityDone = (row, settings, now) =>
  Boolean(row.completions[periodKey(row.cadence, settings, now)]);
export function setPriorityDone(row, done, settings, now) {
  const key = periodKey(row.cadence, settings, now);
  if (done) row.completions[key] = true;
  else delete row.completions[key];
}
export function sortedPriorities(rows, settings, now) {
  return [...rows].sort(
    (a, b) =>
      Number(priorityDone(a, settings, now)) -
        Number(priorityDone(b, settings, now)) ||
      PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
  );
}
export function realsBalance(rows) {
  return rows.reduce(
    (total, row) =>
      total + (row.type === "Gasto" ? -1 : 1) * Number(row.amount),
    0,
  );
}
export function simDelta(current, baseline) {
  const a = Number(current),
    b = Number(baseline);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return { dps: a - b, percent: ((a - b) / b) * 100 };
}
