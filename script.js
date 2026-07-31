const LEVEL_SCORE = {
  INI: 1,
  INT: 2,
  PRO: 3,
};

const REQUIRED_LEVELS = ["INI", "INT", "PRO"];
const GENDER_FEMALE = "F";
const TEAM_SIZE = 4;

const playersInput = document.getElementById("playersInput");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const feedback = document.getElementById("feedback");
const summary = document.getElementById("summary");
const warnings = document.getElementById("warnings");
const teamsGrid = document.getElementById("teamsGrid");
const reservesEl = document.getElementById("reserves");
const loadingOverlay = document.getElementById("loadingOverlay");
const copyResultBtn = document.getElementById("copyResultBtn");
const copyFeedback = document.getElementById("copyFeedback");

let lastGeneratedPayload = null;

generateBtn.addEventListener("click", async () => {
  clearResultArea();

  const parsed = parsePlayers(playersInput.value);
  if (parsed.errors.length) {
    renderInputErrors(parsed.errors);
    return;
  }

  if (parsed.players.length < TEAM_SIZE) {
    renderFeedback(
      "Adicione ao menos 4 jogadores validos para gerar um time.",
      "error",
    );
    return;
  }

  showLoading(true);
  await sleep(900);

  const declaredReserves = uniqueReserveNames(parsed.declaredReserves);

  const result = generateTeams(parsed.players, declaredReserves);
  showLoading(false);

  lastGeneratedPayload = {
    result,
    totalInputPlayers: parsed.players.length,
    generatedAt: new Date(),
  };
  updateCopyControls(true);

  const ignoredLinesNote =
    parsed.ignoredCount > 0
      ? ` ${parsed.ignoredCount} linha(s) extra(s) foram ignoradas.`
      : "";
  const declaredReservesNote =
    declaredReserves.length > 0
      ? ` ${declaredReserves.length} suplente(s) identificado(s).`
      : "";
  renderFeedback(
    `Times gerados com sucesso.${ignoredLinesNote}${declaredReservesNote}`,
    "success",
  );
  renderResult(result, parsed.players.length);
});

clearBtn.addEventListener("click", () => {
  playersInput.value = "";
  lastGeneratedPayload = null;
  updateCopyControls(false);
  clearResultArea();
  renderFeedback(
    "Campo limpo. Cole uma nova lista para gerar os times.",
    "info",
  );
});

copyResultBtn.addEventListener("click", async () => {
  if (!lastGeneratedPayload) {
    setCopyFeedback("Gere os times antes de copiar.", "error");
    return;
  }

  const text = buildWhatsAppText(lastGeneratedPayload);

  try {
    await copyText(text);
    setCopyFeedback(
      "Resultado copiado. Agora e so colar no WhatsApp.",
      "success",
    );
  } catch {
    setCopyFeedback(
      "Nao foi possivel copiar automaticamente. Tente novamente.",
      "error",
    );
  }
});

function parsePlayers(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const players = [];
  const declaredReserves = [];
  const errors = [];
  let ignoredCount = 0;
  let readingReservesSection = false;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const normalizedLine = normalizeInputLine(line);

    if (isReservesHeading(normalizedLine)) {
      readingReservesSection = true;
      ignoredCount += 1;
      return;
    }

    if (readingReservesSection) {
      if (isNonReserveSectionLine(normalizedLine)) {
        readingReservesSection = false;
        ignoredCount += 1;
        return;
      }

      const reserveName = extractReserveName(normalizedLine);
      if (reserveName) {
        declaredReserves.push(reserveName);
      } else {
        ignoredCount += 1;
      }
      return;
    }

    const match = normalizedLine.match(
      /^(.+?)\s*-\s*([mMfF])\s*-\s*(INI|INT|PRO)\b/i,
    );

    if (!match) {
      if (isLikelyMetadataLine(normalizedLine)) {
        ignoredCount += 1;
        return;
      }

      if (looksLikePlayerLine(normalizedLine)) {
        errors.push(
          `Linha ${lineNumber}: formato invalido. Use "Nome - F/M - INI/INT/PRO".`,
        );
      } else {
        ignoredCount += 1;
      }
      return;
    }

    const name = match[1].trim();
    const gender = match[2].toUpperCase();
    const level = match[3].toUpperCase();

    if (!name) {
      errors.push(`Linha ${lineNumber}: nome vazio.`);
      return;
    }

    players.push({
      id: `${name}-${lineNumber}`,
      name,
      gender,
      level,
      score: LEVEL_SCORE[level],
    });
  });

  return { players, errors, ignoredCount, declaredReserves };
}

function normalizeInputLine(line) {
  return line
    .replace(/^[\s\-\u2022\*\+]+/, "")
    .replace(/^\d+\s*[-.)]?\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikePlayerLine(line) {
  const hasGenderBlock = /-\s*[mMfF]\s*-/i.test(line);
  const hasLevelBlock = /-\s*(INI|INT|PRO)\b/i.test(line);
  return hasGenderBlock || hasLevelBlock;
}

function isReservesHeading(line) {
  return /^(suplentes?|reservas?|lista\s+de\s+espera)\b[:\s-]*/i.test(line);
}

function isNonReserveSectionLine(line) {
  return /^(dia do racha|hor[aá]rio|local|quadra|obs|pix|valor|pagamento|faz\s+o\s+pix|garante\s+a\s+vaga|🗓️|⏰|🏐|💰|🚨|\*pix\*|\*valor)/i.test(
    line,
  );
}

function isLikelyMetadataLine(line) {
  if (!line) {
    return true;
  }

  if (/^[_=]{3,}$/.test(line)) {
    return true;
  }

  if (
    /^(listinha|arena|av\.?|domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|pix|nubank|itau|caixa)\b/i.test(
      line,
    )
  ) {
    return true;
  }

  if (/^\d{1,2}\/?\d{1,2}\/?\d{2,4}\b/.test(line)) {
    return true;
  }

  if (/\b\d{1,2}:\d{2}\b/.test(line)) {
    return true;
  }

  if (/\$\s*\d+/.test(line)) {
    return true;
  }

  return false;
}

function extractReserveName(line) {
  const cleaned = line
    .replace(/[✅✳️⭐⚽🏐]+/g, "")
    .replace(/^[-\s]+/, "")
    .trim();

  if (!cleaned || cleaned === "-") {
    return "";
  }

  if (isNonReserveSectionLine(cleaned)) {
    return "";
  }

  const playerMatch = cleaned.match(
    /^(.+?)\s*-\s*([mMfF])\s*-\s*(INI|INT|PRO)\b/i,
  );
  if (playerMatch) {
    const name = playerMatch[1].trim();
    const gender = playerMatch[2].toUpperCase();
    const level = playerMatch[3].toUpperCase();
    return `${name} (${gender} - ${level})`;
  }

  return cleaned;
}

function uniqueReserveNames(names) {
  const merged = [];
  const seen = new Set();

  names.forEach((name) => {
    const key = name.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    merged.push(name);
  });

  return merged;
}

function generateTeams(allPlayers, declaredReserves = []) {
  const teamCount = Math.floor(allPlayers.length / TEAM_SIZE);
  const reserveCount = allPlayers.length % TEAM_SIZE;

  const { selectedPlayers, reserves, reserveReason } = splitReserves(
    allPlayers,
    reserveCount,
  );
  const usedPlayersCount = selectedPlayers.length;
  const teams = createEmptyTeams(teamCount);

  const warningsList = [];
  const feasibility = buildFeasibility(selectedPlayers, teamCount);

  if (!feasibility.femalePerTeamPossible) {
    warningsList.push(
      "Nao ha mulheres suficientes para garantir ao menos 1 por time. Foi aplicada a melhor distribuicao possivel.",
    );
  }

  if (
    !feasibility.iniPerTeamPossible ||
    !feasibility.intPerTeamPossible ||
    !feasibility.proPerTeamPossible
  ) {
    warningsList.push(
      "Nao ha niveis suficientes para garantir INI, INT e PRO em todos os times. A geracao priorizou equilibrio geral.",
    );
  }

  assignByRule(
    teams,
    selectedPlayers,
    (team, player) => team.femaleCount === 0 && player.gender === "F",
  );
  assignByRule(
    teams,
    selectedPlayers,
    (team, player) => team.levelCount.PRO === 0 && player.level === "PRO",
  );
  assignByRule(
    teams,
    selectedPlayers,
    (team, player) => team.levelCount.INI === 0 && player.level === "INI",
  );
  assignByRule(
    teams,
    selectedPlayers,
    (team, player) => team.levelCount.INT === 0 && player.level === "INT",
  );

  fillRemaining(teams, selectedPlayers);

  const explainedTeams = teams.map((team, index) => {
    const captain = chooseCaptain(team.players);
    const explanation = explainTeam(team);

    return {
      id: index + 1,
      players: team.players,
      captain,
      explanation,
      averageLevel: (team.totalScore / TEAM_SIZE).toFixed(2),
    };
  });

  const averageScore =
    explainedTeams.reduce((acc, team) => acc + Number(team.averageLevel), 0) /
    explainedTeams.length;

  const proShortageDecision = describeProDecision(
    explainedTeams,
    feasibility.proPerTeamPossible,
  );
  if (proShortageDecision) {
    warningsList.push(proShortageDecision);
  }

  if (reserves.length) {
    warningsList.push(reserveReason);
  }

  if (declaredReserves.length) {
    warningsList.push(
      `${declaredReserves.length} suplente(s) foram informados e mantidos fora da formacao dos times.`,
    );
  }

  const autoReserveCount = reserves.length;
  const declaredReserveCount = declaredReserves.length;

  return {
    teams: explainedTeams,
    reserves,
    declaredReserves,
    warnings: warningsList,
    summary: {
      teamCount,
      totalPlayers: allPlayers.length,
      usedPlayers: usedPlayersCount,
      reserveCount: autoReserveCount + declaredReserveCount,
      autoReserveCount,
      declaredReserveCount,
      averageScore: averageScore.toFixed(2),
    },
  };
}

function splitReserves(players, reserveCount) {
  if (!reserveCount) {
    return {
      selectedPlayers: [...players],
      reserves: [],
      reserveReason: "",
    };
  }

  const levelCounter = countBy(players, "level");
  const genderCounter = countBy(players, "gender");

  const ordered = [...players].sort(
    (a, b) =>
      getKeepScore(a, levelCounter, genderCounter) -
      getKeepScore(b, levelCounter, genderCounter),
  );
  const reserves = ordered.slice(0, reserveCount);
  const reserveIds = new Set(reserves.map((p) => p.id));
  const selectedPlayers = players.filter(
    (player) => !reserveIds.has(player.id),
  );

  return {
    selectedPlayers,
    reserves,
    reserveReason:
      "Jogadores em reserva foram escolhidos para manter o melhor equilibrio possivel entre genero e niveis.",
  };
}

function getKeepScore(player, levelCounter, genderCounter) {
  const levelScarcity = 1 / (levelCounter[player.level] || 1);
  const genderScarcity = 1 / (genderCounter[player.gender] || 1);

  const genderWeight = player.gender === "F" ? 12 : 4;
  const levelWeight =
    player.level === "PRO" ? 12 : player.level === "INT" ? 9 : 7;

  return (
    levelScarcity * levelWeight +
    genderScarcity * genderWeight +
    player.score * 0.5
  );
}

function buildFeasibility(players, teamCount) {
  const counts = {
    female: players.filter((p) => p.gender === "F").length,
    INI: players.filter((p) => p.level === "INI").length,
    INT: players.filter((p) => p.level === "INT").length,
    PRO: players.filter((p) => p.level === "PRO").length,
  };

  return {
    femalePerTeamPossible: counts.female >= teamCount,
    iniPerTeamPossible: counts.INI >= teamCount,
    intPerTeamPossible: counts.INT >= teamCount,
    proPerTeamPossible: counts.PRO >= teamCount,
  };
}

function createEmptyTeams(teamCount) {
  return Array.from({ length: teamCount }, (_, idx) => ({
    name: `Time ${idx + 1}`,
    players: [],
    totalScore: 0,
    femaleCount: 0,
    levelCount: {
      INI: 0,
      INT: 0,
      PRO: 0,
    },
  }));
}

function assignByRule(teams, pool, ruleFn) {
  const targetAverage = getPoolAverageScore(pool, teams);

  for (const team of teams) {
    if (team.players.length >= TEAM_SIZE) {
      continue;
    }

    const candidates = pool.filter((player) => ruleFn(team, player));
    if (!candidates.length) {
      continue;
    }

    const best = chooseBestCandidate(candidates, team, targetAverage);
    addPlayerToTeam(team, best);
    removeFromPool(pool, best.id);
  }
}

function fillRemaining(teams, pool) {
  while (pool.length) {
    const team = pickTeamNeedingPlayer(teams);
    if (!team) {
      break;
    }

    const candidates = [...pool];
    const targetAverage = getPoolAverageScore(pool, teams);
    const best = chooseBestCandidate(candidates, team, targetAverage);

    addPlayerToTeam(team, best);
    removeFromPool(pool, best.id);
  }
}

function pickTeamNeedingPlayer(teams) {
  const teamsWithSpace = teams
    .map((team) => ({
      team,
      size: team.players.length,
      score: team.totalScore,
    }))
    .filter((item) => item.size < TEAM_SIZE)
    .sort((a, b) => a.size - b.size || a.score - b.score);

  return teamsWithSpace[0]?.team;
}

function chooseBestCandidate(candidates, team, targetAverage) {
  let bestCandidate = candidates[0];
  let bestScore = -Infinity;

  for (const player of candidates) {
    const score = evaluateFit(team, player, targetAverage);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = player;
    }
  }

  return bestCandidate;
}

function evaluateFit(team, player, targetAverage) {
  const nextSize = team.players.length + 1;
  const nextTotal = team.totalScore + player.score;
  const projectedAverage = nextTotal / nextSize;

  const balanceScore = 100 - Math.abs(projectedAverage - targetAverage) * 35;
  const femaleBoost = team.femaleCount === 0 && player.gender === "F" ? 20 : 0;

  let levelBoost = 0;
  for (const level of REQUIRED_LEVELS) {
    if (team.levelCount[level] === 0 && player.level === level) {
      levelBoost += 14;
    }
  }

  const proPenalty = team.levelCount.PRO > 0 && player.level === "PRO" ? -6 : 0;

  return balanceScore + femaleBoost + levelBoost + proPenalty;
}

function chooseCaptain(players) {
  const sorted = [...players].sort((a, b) => {
    const levelOrder = captainPriority(b.level) - captainPriority(a.level);
    if (levelOrder !== 0) {
      return levelOrder;
    }

    const scoreOrder = b.score - a.score;
    if (scoreOrder !== 0) {
      return scoreOrder;
    }

    return a.name.localeCompare(b.name, "pt-BR");
  });

  return sorted[0];
}

function captainPriority(level) {
  if (level === "PRO") {
    return 3;
  }
  if (level === "INT") {
    return 2;
  }
  return 1;
}

function explainTeam(team) {
  const levelParts = REQUIRED_LEVELS.map(
    (level) => `${level}: ${team.levelCount[level]}`,
  ).join(" | ");
  const womenInfo = `Mulheres: ${team.femaleCount}`;
  return `${womenInfo}. Composicao por nivel -> ${levelParts}. Media tecnica estimada: ${(team.totalScore / TEAM_SIZE).toFixed(2)}.`;
}

function describeProDecision(teams, proPerTeamPossible) {
  if (proPerTeamPossible) {
    return "";
  }

  const withPro = teams.filter((team) =>
    team.players.some((player) => player.level === "PRO"),
  ).length;
  const withoutPro = teams.length - withPro;

  if (withoutPro === 0) {
    return "A distribuicao conseguiu manter pelo menos 1 PRO em todos os times.";
  }

  return `Nao foi possivel manter PRO em todos os times. ${withPro} time(s) ficaram com PRO e ${withoutPro} time(s) sem PRO para preservar melhor equilibrio global.`;
}

function addPlayerToTeam(team, player) {
  team.players.push(player);
  team.totalScore += player.score;

  if (player.gender === GENDER_FEMALE) {
    team.femaleCount += 1;
  }

  team.levelCount[player.level] += 1;
}

function removeFromPool(pool, playerId) {
  const index = pool.findIndex((player) => player.id === playerId);
  if (index >= 0) {
    pool.splice(index, 1);
  }
}

function getPoolAverageScore(pool, teams) {
  const usedPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);
  const usedScore = teams.reduce((sum, team) => sum + team.totalScore, 0);

  const poolScore = pool.reduce((sum, player) => sum + player.score, 0);
  const totalPlayers = usedPlayers + pool.length;

  if (!totalPlayers) {
    return 0;
  }

  return (usedScore + poolScore) / totalPlayers;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function renderInputErrors(errors) {
  const list = errors.map((err) => `- ${err}`).join(" | ");
  renderFeedback(`Foram encontrados erros: ${list}`, "error");
}

function renderFeedback(message, type) {
  feedback.textContent = message;
  feedback.style.color =
    type === "success" ? "#1c8c62" : type === "info" ? "#0f4c5c" : "#c4322c";
}

function renderResult(result, totalInputPlayers) {
  renderSummary(result.summary, totalInputPlayers);
  warnings.innerHTML = "";
  renderTeams(result.teams);
  renderReserves(result.reserves, result.declaredReserves || []);
}

function renderSummary(summaryData, totalInputPlayers) {
  summary.innerHTML = `
    <article class="summary-card">
      <p><strong>Jogadores lidos:</strong> ${totalInputPlayers}</p>
      <p><strong>Times gerados:</strong> ${summaryData.teamCount}</p>
      <p><strong>Utilizados na formacao:</strong> ${summaryData.usedPlayers}</p>
      <p><strong>Reservas:</strong> ${summaryData.reserveCount}</p>
      <p><strong>Reserva automatica:</strong> ${summaryData.autoReserveCount || 0}</p>
      <p><strong>Suplentes informados:</strong> ${summaryData.declaredReserveCount || 0}</p>
      <p><strong>Media tecnica geral:</strong> ${summaryData.averageScore}</p>
    </article>
  `;
}

function renderWarnings(warningsList) {
  warnings.innerHTML = "";
  if (!warningsList.length) {
    return;
  }

  warnings.innerHTML = warningsList
    .map(
      (warningText) => `<article class="warning-item">${warningText}</article>`,
    )
    .join("");
}

function renderTeams(teams) {
  teamsGrid.innerHTML = teams
    .map((team) => {
      const players = team.players
        .map((player) => `<li>${player.name}</li>`)
        .join("");

      return `
        <article class="team-card">
          <div class="team-top">
            <h3>${team.id}. ${team.players.length ? `Time ${team.id}` : "Time"}</h3>
            <span class="team-badge">Media ${team.averageLevel}</span>
          </div>
          <ol class="player-list">${players}</ol>
          <p class="captain">Capitao: ${team.captain.name} (${team.captain.level})</p>
          <p class="explanation">${team.explanation}</p>
        </article>
      `;
    })
    .join("");
}

function renderReserves(reserves, declaredReserves) {
  reservesEl.innerHTML = "";

  if (!reserves.length && !declaredReserves.length) {
    return;
  }

  const automaticReserveList = reserves.length
    ? `
      <h3>Banco de Reserva (automatico)</h3>
      <ul class="reserve-list">
        ${reserves.map((player) => `<li>${player.name}</li>`).join("")}
      </ul>
    `
    : "";

  const declaredReserveList = declaredReserves.length
    ? `
      <h3>Suplentes Informados</h3>
      <ul class="reserve-list">
        ${declaredReserves.map((name) => `<li>${name}</li>`).join("")}
      </ul>
    `
    : "";

  reservesEl.innerHTML = `
    <article class="reserve-card">
      ${automaticReserveList}
      ${declaredReserveList}
    </article>
  `;
}

function clearResultArea() {
  summary.innerHTML = "";
  warnings.innerHTML = "";
  teamsGrid.innerHTML = "";
  reservesEl.innerHTML = "";
  setCopyFeedback("", "info");
  renderFeedback("", "info");
}

function showLoading(isVisible) {
  loadingOverlay.classList.toggle("hidden", !isVisible);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateCopyControls(hasResult) {
  copyResultBtn.disabled = !hasResult;
  if (!hasResult) {
    setCopyFeedback("", "info");
  }
}

function setCopyFeedback(message, type) {
  copyFeedback.textContent = message;
  copyFeedback.style.color =
    type === "success" ? "#1c8c62" : type === "error" ? "#c4322c" : "#2c5d78";
}

function buildWhatsAppText(payload) {
  const { result, totalInputPlayers, generatedAt } = payload;
  const lines = [];

  lines.push("*GERADOR DE TIMES DE VOLEI*");
  lines.push("");
  lines.push(`Data: ${formatDate(generatedAt)}`);
  lines.push(`Jogadores lidos: ${totalInputPlayers}`);
  lines.push(`Times gerados: ${result.summary.teamCount}`);
  lines.push(`Reservas: ${result.summary.reserveCount}`);
  lines.push(`Reserva automatica: ${result.summary.autoReserveCount || 0}`);
  lines.push(
    `Suplentes informados: ${result.summary.declaredReserveCount || 0}`,
  );
  lines.push(`Media tecnica geral: ${result.summary.averageScore}`);

  lines.push("");
  lines.push("*TIMES*");
  result.teams.forEach((team) => {
    lines.push("");
    lines.push(`*Time ${team.id}* (Media ${team.averageLevel})`);
    team.players.forEach((player) => {
      lines.push(`- ${player.name}`);
    });
    lines.push(`Capitao: ${team.captain.name} (${team.captain.level})`);
  });

  if (result.reserves.length) {
    lines.push("");
    lines.push("*BANCO DE RESERVA (AUTOMATICO)*");
    result.reserves.forEach((player) => {
      lines.push(`- ${player.name}`);
    });
  }

  if (result.declaredReserves && result.declaredReserves.length) {
    lines.push("");
    lines.push("*SUPLENTES INFORMADOS*");
    result.declaredReserves.forEach((name) => {
      lines.push(`- ${name}`);
    });
  }

  return lines.join("\n");
}

function formatDate(date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Copy failed");
  }
}
