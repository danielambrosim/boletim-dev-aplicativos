// Camada de apresentação: lê `state` e produz DOM. Não muta estado —
// isso é responsabilidade exclusiva de actions.js.

import { state, storageOk } from "./state.js";
import { computeAverage, statusFor, statusLabel, fmt, normalize } from "./grades.js";

const el = (id) => document.getElementById(id);

export function escapeAttr(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function statusIcon(status) {
  if (status === "good") return '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (status === "warn") return '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1.2l5 8.8H1l5-8.8Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 5v2.1M6 8.5v.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  if (status === "bad") return '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  return '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1" fill="currentColor"/></svg>';
}

export function renderMeta() {
  el("turmaInput").value = state.turma;
  el("termInput").value = state.periodo;
  el("passThreshold").value = state.passThreshold;
  el("recoveryThreshold").value = state.recoveryThreshold;
}

export function renderStats() {
  const counts = { good: 0, warn: 0, bad: 0, pending: 0 };
  let sum = 0, sumCount = 0;

  for (const s of state.students) {
    const info = computeAverage(state, s.id);
    counts[statusFor(state, info)]++;
    if (info.avg !== null) { sum += info.avg; sumCount++; }
  }
  const classAvg = sumCount > 0 ? sum / sumCount : null;

  const tiles = [
    { label: "Alunos", value: state.students.length, cls: "" },
    { label: "Média da turma", value: fmt(classAvg), cls: "accent" },
    { label: "Aprovados", value: counts.good, cls: "good" },
    { label: "Recuperação", value: counts.warn, cls: "warn" },
    { label: "Reprovados", value: counts.bad, cls: "bad" }
  ];
  el("statsRow").innerHTML = tiles
    .map((t) => `<div class="tile ${t.cls}"><span class="tile-label">${t.label}</span><span class="tile-value">${t.value}</span></div>`)
    .join("");
}

export function renderDistribution() {
  const card = el("distributionCard");
  if (state.students.length === 0) { card.hidden = true; return; }
  card.hidden = false;

  const counts = { good: 0, warn: 0, bad: 0, pending: 0 };
  for (const s of state.students) counts[statusFor(state, computeAverage(state, s.id))]++;
  const total = state.students.length;

  el("distMeta").textContent = `${total} ${total === 1 ? "aluno" : "alunos"}`;

  const rows = [
    { key: "good", label: "Aprovado", color: "var(--good)" },
    { key: "warn", label: "Recuperação", color: "var(--warn)" },
    { key: "bad", label: "Reprovado", color: "var(--bad)" },
    { key: "pending", label: "Sem notas", color: "var(--neutral)" }
  ];
  el("distBars").innerHTML = rows
    .map((r) => {
      const pct = total > 0 ? Math.round((counts[r.key] / total) * 100) : 0;
      return `<div class="dist-row">
        <span class="dlabel">${r.label}</span>
        <span class="dist-track"><span class="dist-fill" style="width:${pct}%;background:${r.color}"></span></span>
        <span class="dist-count">${counts[r.key]}</span>
      </div>`;
    })
    .join("");
}

function assessmentHeadHtml(a) {
  return `<th class="col-assessment" data-id="${a.id}">
    <div class="assessment-head">
      <input class="assessment-name-input" data-role="aname" data-id="${a.id}" value="${escapeAttr(a.name)}" maxlength="18" />
      <span class="weight-badge">×<input type="number" min="0.1" step="0.1" data-role="aweight" data-id="${a.id}" value="${a.weight}" /></span>
      <button class="col-del-btn" data-role="delassessment" data-id="${a.id}" title="Remover avaliação">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 3.5h7M4.8 3.5V2.4c0-.3.3-.6.6-.6h1.2c.3 0 .6.3.6.6v1.1M5 5.7v3M7 5.7v3M3.3 3.5l.4 5.6c0 .5.4.9.9.9h3c.5 0 .9-.4.9-.9l.4-5.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </th>`;
}

function studentRowHtml(s) {
  const info = computeAverage(state, s.id);
  const status = statusFor(state, info);
  const mediaCls = status === "pending" ? "neutral" : status;

  const gradeCells = state.assessments
    .map((a) => {
      const raw = (state.grades[s.id] || {})[a.id];
      const v = raw ?? null;
      const cls = "grade-input" + (v === null ? " empty" : v < state.recoveryThreshold ? " low" : "");
      return `<td><input type="number" min="0" max="10" step="0.1" class="${cls}" data-role="grade" data-sid="${s.id}" data-aid="${a.id}" value="${v === null ? "" : v}" placeholder="—" /></td>`;
    })
    .join("");

  return `<tr data-id="${s.id}">
    <td class="col-student"><input class="name-input" data-role="sname" data-id="${s.id}" value="${escapeAttr(s.name)}" placeholder="Nome do aluno" /></td>
    ${gradeCells}
    <td></td>
    <td class="media-cell ${mediaCls}">${fmt(info.avg)}${info.partial ? '<span class="partial">parcial</span>' : ""}</td>
    <td><span class="pill ${status}">${statusIcon(status)}${statusLabel(status)}</span></td>
    <td><button class="row-del-btn" data-role="delstudent" data-id="${s.id}" title="Remover aluno">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2.5 3.5h7M4.8 3.5V2.4c0-.3.3-.6.6-.6h1.2c.3 0 .6.3.6.6v1.1M5 5.7v3M7 5.7v3M3.3 3.5l.4 5.6c0 .5.4.9.9.9h3c.5 0 .9-.4.9-.9l.4-5.6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button></td>
  </tr>`;
}

export function renderTable() {
  const headRow = el("headRow");
  const bodyRows = el("bodyRows");
  const emptyState = el("emptyState");
  const tableScroll = document.querySelector(".table-scroll");

  if (state.students.length === 0) {
    emptyState.classList.add("show");
    tableScroll.style.display = "none";
    return;
  }
  emptyState.classList.remove("show");
  tableScroll.style.display = "";

  headRow.innerHTML =
    '<th class="col-student">Aluno</th>' +
    state.assessments.map(assessmentHeadHtml).join("") +
    '<th class="col-assessment add-assessment-cell"><button class="add-col-btn" id="inlineAddAssessment" title="Adicionar avaliação">+</button></th>' +
    '<th class="col-media">Média</th><th class="col-status">Situação</th><th class="col-actions"></th>';

  const query = normalize(el("searchInput").value);
  bodyRows.innerHTML = state.students
    .filter((s) => !query || normalize(s.name).includes(query))
    .map(studentRowHtml)
    .join("");

  const colspan = 2 + state.assessments.length + 3;
  const addRowCell = el("addRowCell");
  addRowCell.setAttribute("colspan", colspan);
  addRowCell.innerHTML =
    '<button class="add-row-btn" id="inlineAddStudent">' +
    '<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2.5v9M2.5 7h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Adicionar aluno</button>';
}

/** Atualiza só a linha de um aluno (média/situação/estilo da célula) sem
 * re-renderizar a tabela inteira — evita perder o foco durante a digitação. */
export function patchStudentRow(studentId) {
  const row = document.querySelector(`tr[data-id="${studentId}"]`);
  if (!row) return;
  const info = computeAverage(state, studentId);
  const status = statusFor(state, info);

  const mediaCell = row.querySelector(".media-cell");
  mediaCell.className = "media-cell " + (status === "pending" ? "neutral" : status);
  mediaCell.innerHTML = fmt(info.avg) + (info.partial ? '<span class="partial">parcial</span>' : "");

  const pill = row.querySelector(".pill");
  pill.className = "pill " + status;
  pill.innerHTML = statusIcon(status) + statusLabel(status);
}

export function renderAll() {
  renderMeta();
  renderStats();
  renderTable();
  renderDistribution();
  return storageOk;
}
