// Backup e exportação — download padrão via Blob + <a download>, sem
// depender de nenhuma API proprietária. Funciona em qualquer navegador.

import { state, replaceState } from "./state.js";
import { computeAverage, statusFor, statusLabel } from "./grades.js";

function slug(str) {
  return (str || "dev-aplicativos")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportJson() {
  const filename = `boletim_${slug(state.turma)}.json`;
  downloadFile(filename, JSON.stringify(state, null, 2), "application/json");
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv() {
  const header = ["Aluno", ...state.assessments.map((a) => `${a.name} (peso ${a.weight})`), "Média", "Situação"];
  const lines = [header.map(csvEscape).join(";")];

  for (const s of state.students) {
    const info = computeAverage(state, s.id);
    const row = [
      s.name,
      ...state.assessments.map((a) => (state.grades[s.id] || {})[a.id] ?? ""),
      info.avg === null ? "" : info.avg.toFixed(1),
      statusLabel(statusFor(state, info))
    ];
    lines.push(row.map(csvEscape).join(";"));
  }

  // BOM para o Excel em pt-BR reconhecer acentuação em UTF-8.
  const csv = "﻿" + lines.join("\r\n");
  downloadFile(`boletim_${slug(state.turma)}.csv`, csv, "text/csv;charset=utf-8");
}

/** Lê um arquivo de backup .json e substitui o estado atual. */
export function importJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(replaceState(JSON.parse(reader.result)));
      } catch (e) {
        reject(new Error("Arquivo inválido — verifique se é um backup exportado por este boletim."));
      }
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsText(file);
  });
}
