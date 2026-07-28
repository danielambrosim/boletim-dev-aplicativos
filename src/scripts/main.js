// Ponto de entrada: liga estado, ações e renderização aos elementos do DOM.
// Usa delegação de evento na tabela (dois listeners no total) em vez de
// religar handlers a cada re-render.

import { state, storageOk, saveState } from "./state.js";
import * as actions from "./actions.js";
import * as render from "./render.js";
import { exportJson, exportCsv, importJson } from "./exportData.js";
import { supabase } from "./supabaseClient.js";
import { initAuthView } from "./authView.js";

const el = (id) => document.getElementById(id);

let toastTimer = null;
function showToast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function refresh() {
  render.renderAll();
  if (!storageOk) showToast("Armazenamento local indisponível aqui — exporte um backup para não perder as notas.");
}

/* ---------- Cabeçalho ---------- */

el("turmaInput").addEventListener("input", (e) => actions.setMeta({ turma: e.target.value }));
el("termInput").addEventListener("input", (e) => actions.setMeta({ periodo: e.target.value }));

/* ---------- Toolbar ---------- */

function addStudentAndFocus() {
  const student = actions.addStudent();
  refresh();
  el("bodyRows").querySelector(`[data-role="sname"][data-id="${student.id}"]`)?.focus();
}

el("addStudentBtn").addEventListener("click", addStudentAndFocus);
el("emptyAddStudentBtn").addEventListener("click", addStudentAndFocus);
el("addAssessmentBtn").addEventListener("click", () => { actions.addAssessment(); refresh(); });
el("emptyAddAssessmentBtn").addEventListener("click", () => { actions.addAssessment(); refresh(); });
el("searchInput").addEventListener("input", () => render.renderTable());

el("settingsBtn").addEventListener("click", () => {
  el("settingsPanel").hidden = !el("settingsPanel").hidden;
});
el("passThreshold").addEventListener("input", (e) => { actions.setThresholds({ passThreshold: e.target.value }); refresh(); });
el("recoveryThreshold").addEventListener("input", (e) => { actions.setThresholds({ recoveryThreshold: e.target.value }); refresh(); });

/* ---------- Menu de exportação ---------- */

const menuBtn = el("menuBtn");
const exportMenu = el("exportMenu");

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const willShow = exportMenu.hidden;
  exportMenu.hidden = !willShow;
  menuBtn.setAttribute("aria-expanded", String(willShow));
});
document.addEventListener("click", (e) => {
  if (!exportMenu.hidden && !exportMenu.contains(e.target) && e.target !== menuBtn) {
    exportMenu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }
});
el("exportJsonBtn").addEventListener("click", () => { exportJson(); exportMenu.hidden = true; showToast("Backup exportado."); });
el("exportCsvBtn").addEventListener("click", () => { exportCsv(); exportMenu.hidden = true; showToast("Planilha exportada."); });
el("importInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  exportMenu.hidden = true;
  e.target.value = "";
  if (!file) return;
  try {
    await importJson(file);
    refresh();
    showToast("Backup importado.");
  } catch (err) {
    showToast(err.message);
  }
});

/* ---------- Tabela (delegação de evento) ---------- */

const table = el("gradesTable");

table.addEventListener("input", (e) => {
  const { role, id, sid, aid } = e.target.dataset;
  if (role === "sname") { actions.renameStudent(id, e.target.value); return; }
  if (role === "aname") { actions.renameAssessment(id, e.target.value); return; }
  if (role === "aweight") { actions.reweightAssessment(id, e.target.value); render.renderStats(); render.renderDistribution(); return; }
  if (role === "grade") {
    actions.setGrade(sid, aid, e.target.value);
    const v = e.target.value === "" ? null : parseFloat(e.target.value);
    e.target.classList.toggle("empty", v === null);
    e.target.classList.toggle("low", v !== null && v < state.recoveryThreshold);
    render.patchStudentRow(sid);
    render.renderStats();
    render.renderDistribution();
  }
});

table.addEventListener("click", (e) => {
  if (e.target.closest("#inlineAddStudent")) { addStudentAndFocus(); return; }
  if (e.target.closest("#inlineAddAssessment")) { actions.addAssessment(); refresh(); return; }

  const delStudentBtn = e.target.closest('[data-role="delstudent"]');
  if (delStudentBtn) { actions.deleteStudent(delStudentBtn.dataset.id); refresh(); return; }

  const delAssessmentBtn = e.target.closest('[data-role="delassessment"]');
  if (delAssessmentBtn) { actions.deleteAssessment(delAssessmentBtn.dataset.id); refresh(); }
});

/* ---------- Autenticação ---------- */

initAuthView();

function showAuthedView(session) {
  el("authView").hidden = true;
  el("appView").hidden = false;
  el("sessionEmail").textContent = session.user.email;
  refresh();
}

function showAuthView() {
  el("appView").hidden = true;
  el("authView").hidden = false;
}

el("signOutBtn").addEventListener("click", () => supabase.auth.signOut());

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) showAuthedView(session);
  else showAuthView();
});
