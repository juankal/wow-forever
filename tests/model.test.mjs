import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareState,
  validate,
  periodKey,
  priorityDone,
  setPriorityDone,
  sortedPriorities,
  realsBalance,
  simDelta,
  localDate,
  SETTINGS,
} from "../assets/model.js";

test("el registro inicial conserva las funciones y datos del original", () => {
  const state = prepareState();
  validate(state);
  assert.equal(state.profile.name, "Juankal");
  assert.equal(
    state.quests.filter((q) => q.chain === "Onyxia · Horda").length,
    15,
  );
  assert.equal(
    state.quests.filter(
      (q) => q.chain === "Onyxia · Horda" && q.status === "Completada",
    ).length,
    5,
  );
  assert.equal(
    state.gear.find((g) => g.slot === "Arma principal").name,
    "Dreadforge Retaliator",
  );
  const snapshot = JSON.stringify(state);
  prepareState(state);
  assert.equal(JSON.stringify(state), snapshot);
});
test("el día usa la zona horaria personal, la hora de reinicio y el cambio de año", () => {
  assert.equal(localDate(new Date("2026-11-17T04:59:00Z")), "2026-11-16");
  assert.equal(
    periodKey("Diaria", SETTINGS, new Date("2026-11-17T05:00:00Z")),
    "2026-11-17",
  );
  const settings = { ...SETTINGS, resetHour: 6 };
  assert.equal(
    periodKey("Diaria", settings, new Date("2027-01-01T10:59:00Z")),
    "2026-12-31",
  );
  assert.equal(
    periodKey("Diaria", settings, new Date("2027-01-01T11:00:00Z")),
    "2027-01-01",
  );
});
test("la semana empieza el día configurado y respeta la hora antes del lunes", () => {
  assert.equal(
    periodKey("Semanal", SETTINGS, new Date("2026-11-16T04:59:00Z")),
    "2026-11-09",
  );
  assert.equal(
    periodKey("Semanal", SETTINGS, new Date("2026-11-16T05:00:00Z")),
    "2026-11-16",
  );
  assert.equal(
    periodKey(
      "Semanal",
      { ...SETTINGS, resetWeekday: 3 },
      new Date("2026-11-17T12:00:00Z"),
    ),
    "2026-11-11",
  );
});
test("las tareas se reabren al cambiar de período sin borrar las completadas anteriores", () => {
  const state = prepareState(),
    daily = state.priorities[0],
    weekly = state.priorities.find((p) => p.cadence === "Semanal");
  const now = new Date("2026-11-19T17:00:00Z"),
    tomorrow = new Date("2026-11-20T17:00:00Z"),
    monday = new Date("2026-11-23T17:00:00Z");
  setPriorityDone(daily, true, SETTINGS, now);
  setPriorityDone(weekly, true, SETTINGS, now);
  assert.equal(priorityDone(daily, SETTINGS, tomorrow), false);
  assert.equal(priorityDone(weekly, SETTINGS, tomorrow), true);
  assert.equal(priorityDone(weekly, SETTINGS, monday), false);
  assert.equal(priorityDone(daily, SETTINGS, now), true);
  daily.cadence = "Una vez";
  setPriorityDone(daily, true, SETTINGS, now);
  assert.equal(priorityDone(daily, SETTINGS, monday), true);
  setPriorityDone(daily, false, SETTINGS, monday);
  assert.equal(priorityDone(daily, SETTINGS, now), false);
});
test("se muestran primero las prioridades pendientes más altas sin mutar el registro", () => {
  const rows = prepareState().priorities,
    now = new Date("2026-11-19T17:00:00Z");
  setPriorityDone(rows[0], true, SETTINGS, now);
  const original = rows.map((r) => r.id);
  const sorted = sortedPriorities(rows, SETTINGS, now);
  assert.equal(sorted.at(-1).id, rows[0].id);
  assert.equal(sorted[0].priority, "Alta");
  assert.deepEqual(
    rows.map((r) => r.id),
    original,
  );
});
test("Reals suma ingresos y descuenta gastos, y DPS calcula deltas sin dividir entre cero", () => {
  assert.equal(
    realsBalance([
      { type: "Ingreso", amount: "120" },
      { type: "Gasto", amount: "35" },
    ]),
    85,
  );
  assert.deepEqual(simDelta(825, 750), { dps: 75, percent: 10 });
  assert.equal(simDelta(100, 0), null);
  assert.equal(simDelta("no", 100), null);
});
test("los respaldos corruptos se rechazan antes de reemplazar el registro", () => {
  for (const mutate of [
    (s) => (s.quests[0] = null),
    (s) => (s.quests[0].notes = { nested: true }),
    (s) => s.resets.push({ id: "bad", name: "UBRS", date: 123 }),
    (s) => (s.gear[0].stats = null),
    (s) => s.gear.push({ ...s.gear[0], id: "duplicated-slot" }),
    (s) => (s.tasks[0].done = "yes"),
    (s) => (s.priorities[0].completions = { "bad-date": true }),
    (s) => (s.settings.timezone = "Not/AZone"),
    (s) =>
      s.reals.push({ id: "1", name: "test", type: "Ingreso", amount: 1.5 }),
    (s) => s.simRecords.push({ name: "test", dps: -1 }),
  ]) {
    const state = prepareState();
    mutate(state);
    assert.throws(() => validate(state), /Formato/);
  }
  const state = prepareState();
  delete state.priorities;
  delete state.settings;
  delete state.reals;
  validate(state);
  validate(prepareState(state));
});
