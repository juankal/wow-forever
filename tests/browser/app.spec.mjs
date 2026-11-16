import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const KEY = "wowforever.juankal.diario.v1";
const snapshot = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
async function section(page, id) {
  await page.goto("#" + id);
  await expect(page.locator('#nav [data-nav="' + id + '"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
}
async function submitModal(page) {
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.locator("#modal")).not.toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: /El cuartel de Juankal/ }),
  ).toBeVisible();
});

test("todas las secciones cargan sin errores y el dashboard es responsive", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  for (const id of [
    "priorities",
    "gear",
    "specs",
    "compare",
    "quests",
    "tier",
    "onyxia",
    "dungeons",
    "reals",
    "simulations",
    "check",
    "journal",
    "fifty",
    "home",
  ]) {
    await section(page, id);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("perfil, atributos y builds persisten y separan Retribution de Holy", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Editar personaje", exact: true })
    .click();
  await page.getByLabel("Reino", { exact: true }).fill("Ashenlight prueba");
  await submitModal(page);
  await section(page, "gear");
  await page.getByLabel("Poder de ataque", { exact: true }).fill("701");
  await section(page, "specs");
  await page.getByRole("button", { name: "Holy", exact: true }).click();
  await page
    .getByLabel("Talentos y build", { exact: true })
    .fill("Holy: sanación de mazmorra");
  await page.reload();
  await expect(page.getByLabel("Talentos y build")).toHaveValue("");
  await page.getByRole("button", { name: "Holy", exact: true }).click();
  await expect(page.getByLabel("Talentos y build")).toHaveValue(
    "Holy: sanación de mazmorra",
  );
  const state = await snapshot(page);
  expect(state.stats.Ret["Poder de ataque"]).toBe("701");
  expect(state.builds.Ret).toBe("");
  expect(state.profile.realm).toBe("Ashenlight prueba");
});
test("prioridades diarias y semanales se reinician sin perder el historial", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-19T17:00:00Z") });
  await section(page, "priorities");
  const daily = page.getByRole("checkbox", {
      name: "Completar Preparar la próxima salida",
      exact: true,
    }),
    weekly = page.getByRole("checkbox", {
      name: "Completar Planificar mazmorras y botín",
      exact: true,
    });
  await daily.check();
  await weekly.check();
  await page.reload();
  await expect(daily).toBeChecked();
  await expect(weekly).toBeChecked();
  await page.clock.setFixedTime(new Date("2026-11-20T17:00:00Z"));
  await page.reload();
  await expect(daily).not.toBeChecked();
  await expect(weekly).toBeChecked();
  await page.clock.setFixedTime(new Date("2026-11-23T17:00:00Z"));
  await page.reload();
  await expect(weekly).not.toBeChecked();
  await page
    .getByRole("button", { name: "+ Nueva prioridad", exact: true })
    .click();
  await page
    .getByLabel("Objetivo", { exact: true })
    .fill("Terminar una misión propia");
  await page.getByLabel("Frecuencia").selectOption("Una vez");
  await submitModal(page);
  await page
    .getByRole("checkbox", {
      name: "Completar Terminar una misión propia",
      exact: true,
    })
    .check();
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: "Completar Terminar una misión propia",
      exact: true,
    }),
  ).toBeChecked();
});
test("equipar una alternativa conserva el objeto anterior y valida ranuras", async ({
  page,
}) => {
  await section(page, "compare");
  const state = await snapshot(page);
  await page
    .locator("#compareA")
    .selectOption(
      state.gear.find((g) => g.name === "Dreadforge Retaliator").id,
    );
  const weapon = state.items.find((i) => i.name === "Blackblade of Shahram");
  await page.locator("#compareB").selectOption(weapon.id);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Equipar B en su set", exact: true })
    .click();
  await page.reload();
  const result = await snapshot(page);
  expect(result.gear.find((g) => g.slot === "Arma principal").name).toBe(
    "Blackblade of Shahram",
  );
  expect(result.items.some((i) => i.name === "Dreadforge Retaliator")).toBe(
    true,
  );
});
test("misiones, Onyxia y Tier 0.5 permiten editar y guardar progreso", async ({
  page,
}) => {
  await section(page, "tier");
  await page
    .getByRole("button", { name: "+ Registrar paso", exact: true })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Paso Tier confirmado");
  await page
    .getByLabel("Notas y próximos pasos")
    .fill("<script>alert(1)</script>");
  await submitModal(page);
  await expect(
    page.getByText("<script>alert(1)</script>", { exact: true }),
  ).toBeVisible();
  await section(page, "onyxia");
  await page
    .getByLabel("Estado The Champion of the Horde", { exact: true })
    .selectOption("Completada");
  await page.reload();
  await expect(
    page.getByLabel("Estado The Champion of the Horde", { exact: true }),
  ).toHaveValue("Completada");
  await section(page, "quests");
  await page.getByLabel("Buscar en esta sección").fill("Paso Tier confirmado");
  await expect(page.locator("#questList .rowitem")).toHaveCount(1);
  await page
    .locator("#questList")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await page.getByLabel("Estado", { exact: true }).selectOption("Completada");
  await submitModal(page);
  const state = await snapshot(page);
  expect(
    state.quests.find((q) => q.name === "Paso Tier confirmado").status,
  ).toBe("Completada");
});
test("Reals valida cantidades y calcula ingresos menos gastos", async ({
  page,
}) => {
  await section(page, "reals");
  await page.getByRole("button", { name: "+ Registrar movimiento" }).click();
  await page.getByLabel("Jefe, instancia o compra").fill("Saldo inicial");
  await page.getByLabel("Cantidad de Reals").fill("100");
  await submitModal(page);
  await page.getByRole("button", { name: "+ Registrar movimiento" }).click();
  await page.getByLabel("Jefe, instancia o compra").fill("Compra");
  await page.getByLabel("Tipo", { exact: true }).selectOption("Gasto");
  await page.getByLabel("Cantidad de Reals").fill("101");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("supera tu saldo");
  await page.getByLabel("Cantidad de Reals").fill("25");
  await submitModal(page);
  await page.reload();
  await expect(page.locator(".metric").first().locator("b")).toHaveText("75");
});
test("guarda dos resultados de DPS y compara el delta sin inventar simulaciones", async ({
  page,
}) => {
  await section(page, "simulations");
  for (const [name, dps] of [
    ["Base", "750"],
    ["Mejora", "825"],
  ]) {
    await page.getByLabel("Equipo o comparación").fill(name);
    await page.getByLabel("DPS estimado").fill(dps);
    await page
      .getByLabel("Condiciones y enlace al resultado")
      .fill("120s, mismos buffs y talentos");
    await page
      .getByRole("button", { name: "Guardar resultado", exact: true })
      .click();
  }
  await page.locator("#simA").selectOption("0");
  await page.locator("#simB").selectOption("1");
  await expect(page.locator(".sim-result")).toContainText("+75");
  await expect(page.locator(".sim-result")).toContainText("+10%");
  await page.reload();
  expect((await snapshot(page)).simRecords).toHaveLength(2);
});
test("exporta, restaura e impide que respaldos inválidos o una cuota agotada borren datos", async ({
  page,
}) => {
  const before = await snapshot(page),
    downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar/ }).click();
  const download = await downloadEvent;
  const content = await readFile(await download.path(), "utf8");
  expect(JSON.parse(content).profile.name).toBe("Juankal");
  for (const data of [
    { ...before, quests: [null] },
    { ...before, settings: { ...before.settings, timezone: "invalid" } },
  ]) {
    await page.locator("#importFile").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
    await expect(page.getByRole("status")).toContainText("No se pudo importar");
    expect((await snapshot(page)).profile.name).toBe("Juankal");
  }
  const imported = {
    ...before,
    profile: { ...before.profile, name: "Juankal respaldo" },
  };
  page.once("dialog", (d) => d.accept());
  await page.locator("#importFile").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await expect(
    page.getByRole("heading", { name: "El cuartel de Juankal respaldo." }),
  ).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Cuota agotada", "QuotaExceededError");
    };
  });
  page.once("dialog", (d) => d.accept());
  await page.locator("#importFile").setInputFiles({
    name: "quota.json",
    mimeType: "application/json",
    buffer: Buffer.from(content),
  });
  await expect(page.getByRole("status")).toContainText("No se pudo importar");
  await expect(
    page.getByRole("heading", { name: "El cuartel de Juankal respaldo." }),
  ).toBeVisible();
});
test("checklist, profesión, montura y diario conservan sus funciones", async ({
  page,
}) => {
  await section(page, "check");
  await page
    .getByRole("checkbox", {
      name: "Completar Registrar equipo equipado de Holy",
      exact: true,
    })
    .check();
  const mining = page
    .locator("tr")
    .filter({ has: page.getByRole("cell", { name: "Minería", exact: true }) });
  await mining.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nivel actual", { exact: true }).fill("250");
  await submitModal(page);
  await page.getByLabel("Oro disponible", { exact: true }).fill("500");
  await section(page, "journal");
  await page.getByRole("button", { name: "+ Nueva entrada" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Primera salida");
  await page
    .getByLabel("Notas y decisiones")
    .fill("Equipo conservado para Holy.");
  await submitModal(page);
  await page.reload();
  const state = await snapshot(page);
  expect(state.professions[0].level).toBe("250");
  expect(state.mount.gold).toBe("500");
  expect(
    state.tasks.find((t) => t.name === "Registrar equipo equipado de Holy")
      .done,
  ).toBe(true);
  expect(state.notes.some((n) => n.title === "Primera salida")).toBe(true);
});
test("el menú móvil y la navegación con historial funcionan", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await expect(page.locator("#sidebar")).toBeInViewport();
    await page
      .getByRole("button", { name: "Prioridades", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tus prioridades" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toHaveClass(/menu-open/);
  } else {
    await page
      .getByRole("button", { name: "Prioridades", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "+ Nueva prioridad", exact: true })
    .click();
  await expect(page.getByLabel("Objetivo", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#modal")).not.toBeVisible();
  await section(page, "home");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Tus prioridades" }),
  ).toBeVisible();
});

test("el historial permite volver a la URL inicial y avanzar de nuevo", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Ver mis prioridades →", exact: true })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: /El cuartel de Juankal/ }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "Tus prioridades", exact: true }),
  ).toBeVisible();
});
test("el día se actualiza con la app abierta aunque la tarea tenga el foco", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-20T04:59:45Z") });
  await page.reload();
  await section(page, "priorities");
  const daily = page.getByRole("checkbox", {
    name: "Completar Preparar la próxima salida",
    exact: true,
  });
  await daily.check();
  await expect(daily).toBeFocused();
  await page.clock.runFor(31000);
  await expect(daily).not.toBeChecked();
});
test("permite exportar el progreso en memoria con el almacenamiento bloqueado", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Bloqueado", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Bloqueado", "SecurityError");
    };
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Editar personaje", exact: true })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Juankal sin storage");
  await submitModal(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar/ }).click();
  const download = await event;
  expect(
    JSON.parse(await readFile(await download.path(), "utf8")).profile.name,
  ).toBe("Juankal sin storage");
});
test("un registro corrupto no se sobrescribe y permite recuperar el original", async ({
  page,
}) => {
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), KEY);
  await page.reload();
  await expect(page.locator("#storageWarning")).toBeVisible();
  await page
    .getByRole("button", { name: "Editar personaje", exact: true })
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cambios recuperables");
  await submitModal(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(
    "{broken",
  );
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Descargar registro inválido para recuperación",
      exact: true,
    })
    .click();
  const download = await event;
  expect(await readFile(await download.path(), "utf8")).toBe("{broken");
});

test("comprime y conserva una captura adjunta al diario", async ({ page }) => {
  await section(page, "journal");
  await page
    .getByRole("button", { name: "+ Nueva entrada", exact: true })
    .click();
  await page.getByLabel("Título", { exact: true }).fill("Captura de botín");
  await page
    .locator('input[name="photoFile"]')
    .setInputFiles({
      name: "capture.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEuoAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await submitModal(page);
  await page.reload();
  await expect(page.getByAltText("Captura registrada")).toBeVisible();
  expect(
    (await snapshot(page)).notes.find((n) => n.title === "Captura de botín")
      .photo,
  ).toMatch(/^data:image\/jpeg;base64,/);
});
