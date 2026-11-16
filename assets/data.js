const KEY = "wowforever.juankal.diario.v1";
const SLOTS = [
  "Cabeza",
  "Cuello",
  "Hombros",
  "Capa",
  "Pecho",
  "Muñecas",
  "Manos",
  "Cintura",
  "Piernas",
  "Pies",
  "Anillo 1",
  "Anillo 2",
  "Trinket 1",
  "Trinket 2",
  "Arma principal",
  "Mano secundaria",
  "Reliquia",
];
const STATS = [
  "Fuerza",
  "Agilidad",
  "Aguante",
  "Intelecto",
  "Espíritu",
  "Poder de ataque",
  "Golpe (%)",
  "Crítico (%)",
  "Poder con hechizos",
  "Sanación adicional",
  "MP5",
  "Armadura",
  "DPS arma",
  "Velocidad arma",
];
const CHARSTATS = ["Salud", "Maná", ...STATS];
const DUNGEONS = [
  "UBRS",
  "LBRS",
  "Scholomance",
  "Stratholme Live",
  "Stratholme Undead",
  "BRD",
  "Dire Maul",
  "Otra",
];
const QSTATUS = [
  "Desconocido",
  "Pendiente",
  "En curso",
  "Lista para entregar",
  "Completada",
  "Bloqueada",
];
const EVIDENCE = [
  "Sin verificar",
  "Reportado por usuario",
  "Verificado en juego",
  "Verificado en fuente",
];
const DECISIONS = [
  "Sin decidir",
  "Equipar",
  "Conservar",
  "Vender",
  "Encantar",
  "Reemplazar",
  "Descartar",
];
const CATEGORIES = [
  "Equipo",
  "Tier 0",
  "Mazmorras",
  "Talentos",
  "Profesiones",
  "Montura épica",
  "Consumibles",
  "Grupos de 5",
  "Otros",
];
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const quest = (
  name,
  chain,
  zone = "",
  level = "",
  status = "Desconocido",
  notes = "",
  extra = {},
) => ({
  id: uid(),
  name,
  chain,
  zone,
  level,
  status,
  reward: "",
  npc: "",
  coords: "",
  tomtom: "",
  date: "",
  evidence: "Sin verificar",
  source: "",
  notes,
  photo: "",
  ...extra,
});
const task = (category, name, notes = "", done = false) => ({
  id: uid(),
  category,
  name,
  notes,
  done,
});
const defaults = () => ({
  version: 1,
  profile: {
    name: "Juankal",
    realm: "Ashenlight",
    race: "No-muerto",
    level: "60",
    tierCount: 4,
    tierNotes:
      "4 piezas reportadas previamente; identificar las piezas, el objetivo y los bonos reales en el juego.",
    notes:
      "Paladín de la Horda. Capa comprada; nombre y estadísticas aún sin registrar.",
  },
  stats: { Ret: {}, Holy: {} },
  gear: [],
  items: [],
  quests: [
    quest(
      "The Knight of Mourning",
      "Paladín nivel 50",
      "",
      "50",
      "Desconocido",
      "Título pendiente de confirmar. No asumir disponibilidad ni requisito.",
      {
        source:
          "https://us.forums.blizzard.com/en/wow/t/level-50-horde-paladin-quest/2409291",
      },
    ),
    quest(
      "The Reliquary",
      "Paladín nivel 50",
      "",
      "50",
      "Desconocido",
      "Título y orden pendientes de confirmar.",
      {
        source:
          "https://us.forums.blizzard.com/en/wow/t/level-50-horde-paladin-quest/2409291",
      },
    ),
    quest(
      "Punto de inicio por confirmar",
      "Paladín nivel 50",
      "",
      "50",
      "Pendiente",
      "El usuario reportó misiones en 17.7, 67.4. Zona, NPC y relación con la cadena sin confirmar. El instructor de Undercity no ofreció la misión al llegar a nivel 50.",
      {
        coords: "17.7, 67.4",
        evidence: "Reportado por usuario",
        source:
          "https://us.forums.blizzard.com/en/wow/t/level-50-horde-paladin-quest/2409291",
      },
    ),
    quest(
      "Of Love and Family (parte 2)",
      "Tirion Fordring",
      "Stratholme",
      "",
      "Completada",
      "Completada según conversación previa; entrega y recompensa exactas sin registrar.",
      { evidence: "Reportado por usuario" },
    ),
    quest(
      "Find Myranda",
      "Tirion Fordring",
      "",
      "",
      "Desconocido",
      "Se mencionó como paso de la cadena; verificar estado.",
    ),
    quest(
      "Scarlet Subterfuge",
      "Tirion Fordring",
      "",
      "",
      "Completada",
      "Completada según usuario.",
      { evidence: "Reportado por usuario" },
    ),
    quest(
      "The Scarlet Oracle, Demetria",
      "",
      "",
      "",
      "Desconocido",
      "Interés en la misión; verificar progreso de cadena y requisitos.",
    ),
    quest(
      "The Man in the Iron Chains",
      "Mason’s Note",
      "",
      "",
      "Completada",
      "ID 96335; estado informado por usuario.",
      { evidence: "Reportado por usuario" },
    ),
    quest(
      "More Valuable Than Gold",
      "Mason’s Note",
      "Westfall",
      "",
      "Pendiente",
      "ID 96337: previamente no activa ni completada. Conservar Mason’s Note y revisar cofre de Moonbrook. No está confirmado que pueda abrirse sin misión activa.",
      {
        coords: "43.4, 67.8",
        tomtom: "/way Westfall 43.4 67.8",
        evidence: "Reportado por usuario",
      },
    ),
    quest(
      "The Lost Tablets of Mosh’aru",
      "Tablillas de Mosh’aru",
      "",
      "",
      "Desconocido",
      "Verificar registro y qué tablillas faltan.",
    ),
  ],
  forum: [
    {
      id: uid(),
      title: "Level 50 Horde Paladin Quest",
      url: "https://us.forums.blizzard.com/en/wow/t/level-50-horde-paladin-quest/2409291",
      status: "Por confirmar",
      date: "",
      notes:
        "Comparar publicaciones con el registro real de misiones. Coordenadas reportadas 17.7, 67.4; zona y NPC no confirmados.",
    },
  ],
  plans: DUNGEONS.map((name, i) => ({
    id: uid(),
    name,
    priority: i === 0 ? "Alta" : "Media",
    status: "Pendiente",
    role: "Ret / Holy",
    goals:
      i === 0
        ? "Verificar requisitos de entrada, coordinar grupo, revisar equipo de ambos roles y registrar botín prioritario."
        : "Registrar misiones, objetivos de botín y disponibilidad.",
    notes: "",
  })),
  resets: [],
  tasks: [
    task("Equipo", "Registrar equipo equipado de Retribution"),
    task("Equipo", "Registrar equipo equipado de Holy"),
    task("Equipo", "Anotar estadísticas de ambos sets fuera de combate"),
    task("Equipo", "Comparar armas, anillos, capa y trinkets"),
    task("Equipo", "Identificar encantamientos disponibles y coste"),
    task("Tier 0", "Identificar las cuatro piezas reportadas"),
    task("Tier 0", "Verificar bonus y piezas restantes antes de farmear"),
    task("Mazmorras", "Confirmar acceso a UBRS y requisitos del grupo"),
    task("Mazmorras", "Registrar misiones y objetivos de botín de UBRS"),
    task("Mazmorras", "Registrar manualmente bloqueos y resets"),
    task(
      "Talentos",
      "Guardar build Retribution y revisar talentos para mazmorras",
    ),
    task("Talentos", "Guardar build Holy y revisar talentos de sanación"),
    task("Profesiones", "Registrar nivel actual de minería y herrería"),
    task(
      "Profesiones",
      "Verificar recetas, entrenador y materiales de herrería",
    ),
    task("Profesiones", "Revisar cocina y primeros auxilios"),
    task("Montura épica", "Confirmar cadena de paladín no-muerto y requisitos"),
    task(
      "Montura épica",
      "Registrar materiales, coste en oro y pasos de adquisición",
    ),
    task(
      "Consumibles",
      "Preparar comida, pociones de maná/vida y elixires según rol",
    ),
    task("Consumibles", "Revisar reactivos, espacio en bolsas y reparación"),
    task("Grupos de 5", "Confirmar rol, talentos, equipo y grupo"),
    task("Grupos de 5", "Revisar misiones, ruta y prioridades de botín"),
    task("Grupos de 5", "Acordar reglas de botín y objetivos antes de entrar"),
  ],
  builds: { Ret: "", Holy: "" },
  notes: [],
  professions: [
    { name: "Minería", level: "", cap: "", notes: "" },
    { name: "Herrería", level: "", cap: "", notes: "" },
    { name: "Cocina", level: "", cap: "", notes: "" },
    { name: "Primeros auxilios", level: "", cap: "", notes: "" },
  ],
  mount: { gold: "", target: "", materials: "", notes: "" },
});

const campaign = [
  [98325, "Blood and Thunder", "Badlands", "Completada"],
  [4903, "Warlord’s Command", "LBRS", "Completada"],
  [4941, "Eitrigg’s Wisdom", "Orgrimmar", "Completada"],
  [4974, "For The Horde!", "UBRS", "Completada"],
  [6566, "What the Wind Carries", "Orgrimmar", "Completada"],
  [6567, "The Champion of the Horde", "Orgrimmar / Desolace", "Pendiente"],
  [6568, "The Testament of Rexxar", "Western Plaguelands", "Pendiente"],
  [6569, "Oculus Illusions", "UBRS", "Pendiente"],
  [6570, "Emberstrife", "Dustwallow Marsh", "Pendiente"],
  [6582, "Test of Skulls: Scryer", "Winterspring", "Pendiente"],
  [6583, "Test of Skulls: Somnus", "Swamp of Sorrows", "Pendiente"],
  [6584, "Test of Skulls: Chronalis", "Tanaris", "Pendiente"],
  [6585, "Test of Skulls: Axtroz", "Wetlands", "Pendiente"],
  [6601, "Ascension...", "Desolace", "Pendiente"],
  [6602, "Blood of the Black Dragon Champion", "UBRS", "Pendiente"],
];
const onyxCmd =
  '/run for _,q in ipairs({98325,4903,4941,4974,6566,6567,6568,6569,6570,6582,6583,6584,6585,6601,6602}) do print(q,C_QuestLog.IsQuestFlaggedCompleted(q) and "DONE" or "PENDING") end';
function upgrade(s) {
  if (s.progressUpdate20261116) return;
  const addQ = (name, chain, zone, status, notes, extra = {}) => {
    if (!s.quests.some((q) => q.name === name))
      s.quests.push(quest(name, chain, zone, "60", status, notes, extra));
  };
  campaign.forEach(([id, name, zone, status]) =>
    addQ(
      name,
      "Onyxia · Horda",
      zone,
      status,
      "ID " +
        id +
        ". " +
        (status === "Completada"
          ? "Resultado DONE informado por el jugador."
          : "Confirmar orden y disponibilidad en Forever; pendiente no significa necesariamente sin aceptar."),
      {
        evidence:
          status === "Completada" ? "Reportado por usuario" : "Sin verificar",
        ...(id === 6567
          ? {
              npc: "Thrall / Rexxar",
              coords: "31.7, 37.8 (Thrall; orientativo)",
            }
          : {}),
      },
    ),
  );
  addQ(
    "An Earnest Proposition",
    "Tier 0.5",
    "Silithus",
    "En curso",
    "Recoger muestras de veneno. Stonelash Pincer cerca de Cenarion Hold; si no cae, comprobar misión activa y nombres. No se ha confirmado la tasa de caída.",
    { evidence: "Reportado por usuario" },
  );
  addQ(
    "Doctor Theolen Krastinov, the Butcher",
    "Caer Darrow",
    "Western Plaguelands / Scholomance",
    "Desconocido",
    "Posible inicio de cadena de Ras Frostwhisper; comprobar disponibilidad.",
    { npc: "Eva Sarkhoff", coords: "70.2, 73.7 (orientativo)" },
  );
  addQ(
    "The Lich, Ras Frostwhisper",
    "Caer Darrow",
    "Scholomance",
    "Desconocido",
    "Warblade of Caer Darrow: comparar antes de reemplazar el hacha. Recompensa por verificar en Forever.",
  );
  const addGear = (slot, name, stats, notes) => {
    if (!s.gear.some((g) => g.spec === "Ret" && g.slot === slot))
      s.gear.push({
        id: uid(),
        slot,
        name,
        spec: "Ret",
        stats,
        decision: "Equipar",
        enchant: "",
        source: "Conversación 16/11/2026",
        notes,
        photo: "",
      });
  };
  addGear(
    "Arma principal",
    "Dreadforge Retaliator",
    {
      "DPS arma": 50.5,
      "Velocidad arma": 3.7,
      "Poder de ataque": 42,
      "Crítico (%)": 1,
    },
    "Arma actual reportada. Cifras de referencia, confirmar tooltip.",
  );
  addGear(
    "Trinket 1",
    "Smolderweb’s Eye",
    {},
    "Nombre reportado en revisión anterior; comprobar efecto y golpe en tooltip.",
  );
  addGear(
    "Trinket 2",
    "Draconic Infused Emblem",
    {},
    "Equipado según el jugador; 15 resistencia al fuego reportada. Confirmar efecto activo.",
  );
  const addItem = (name, slot, source, notes) => {
    if (!s.items.some((i) => i.name === name))
      s.items.push({
        id: uid(),
        name,
        slot,
        spec: "Ret",
        source,
        notes,
        stats: {},
        decision: "Sin decidir",
        enchant: "",
        photo: "",
      });
  };
  addItem(
    "Blackhand’s Breadth",
    "Trinket 2",
    "For The Horde!",
    "Conservar; comparar con Draconic en simulación.",
  );
  addItem(
    "Lightforge Spaulders",
    "Hombros",
    "UBRS · The Beast",
    "Objetivo prioritario; confirmar bonus real de conjunto antes de equipar.",
  );
  addItem(
    "Blackblade of Shahram",
    "Arma principal",
    "UBRS · General Drakkisath",
    "Evaluar DPS con simulador.",
  );
  addItem(
    "Warblade of Caer Darrow",
    "Arma principal",
    "Scholomance · cadena Ras Frostwhisper",
    "No asumir mejora por ilvl. Confirmar estadísticas y recompensa.",
  );
  addItem(
    "Barbarous Blade",
    "Arma principal",
    "Dire Maul North · King Gordok",
    "Alternativa para simular.",
  );
  addItem(
    "Runeblade of Baron Rivendare",
    "Arma principal",
    "Stratholme Undead",
    "Alternativa para simular.",
  );
  const snapshot = {
    Fuerza: 222,
    Agilidad: 90,
    Intelecto: 154,
    "Poder de ataque": 692,
    "Golpe (%)": 7.9,
    "Crítico (%)": 15.8,
    "Poder con hechizos": 146,
  };
  Object.entries(snapshot).forEach(([k, v]) => {
    if (s.stats.Ret[k] == null || s.stats.Ret[k] === "") s.stats.Ret[k] = v;
  });
  const follow = [
    [
      "Otros",
      "Terminar muestras de veneno de Silithus",
      "Verificar objetivo activo antes de seguir farmeando.",
    ],
    [
      "Mazmorras",
      "Onyxia: buscar a Rexxar",
      "6566 DONE, 6567 siguiente paso. Si no está en el registro, hablar con Thrall.",
    ],
    [
      "Tier 0",
      "UBRS: conseguir Lightforge Spaulders",
      "The Beast; verificar bonus y comparar antes de cambiar.",
    ],
    [
      "Equipo",
      "Simular Dreadforge y armas alternativas",
      "Usar MythicSim Forever o Forever Sims; mantener mismas condiciones.",
    ],
    [
      "Mazmorras",
      "Comprobar Reals al repetir jefe",
      "Registrar si cae moneda; límite diario por jefe no confirmado para Forever.",
    ],
  ];
  follow.forEach(([c, n, notes]) => {
    if (!s.tasks.some((t) => t.name === n)) s.tasks.push(task(c, n, notes));
  });
  s.notes.push({
    id: uid(),
    title: "Actualización de progresión · 16/11/2026",
    category: "Equipo",
    date: "2026-11-16",
    notes:
      "Captura anterior: ilvl 60.56, haste 15%, hit 7.9%, crit 15.8%, AP 692, spell power 146; foto previa al cambio de abalorio y condiciones de buffs desconocidas. No tratar estas cifras como valores actuales. UBRS realizado hoy. Draconic Infused Emblem equipado. Onyxia completada hasta 6566 según jugador. Prioridad: concluir veneno, Rexxar, hombros UBRS y simular arma. Reals y bloqueos: verificar en juego.",
    photo: "",
  });
  s.simRecords = s.simRecords || [];
  s.progressUpdate20261116 = true;
}

export {
  KEY,
  SLOTS,
  STATS,
  CHARSTATS,
  DUNGEONS,
  QSTATUS,
  EVIDENCE,
  DECISIONS,
  CATEGORIES,
  uid,
  quest,
  task,
  defaults,
  upgrade,
  onyxCmd,
};
