// Mutações de estado. Cada ação altera `state` e persiste; nunca toca DOM —
// quem chama decide se re-renderiza tudo ou só o pedaço afetado.

import { state, saveState, uid } from "./state.js";
import { clampGrade } from "./grades.js";

export function addStudent() {
  const student = { id: uid("s"), name: "" };
  state.students.push(student);
  saveState();
  return student;
}

export function deleteStudent(studentId) {
  state.students = state.students.filter((s) => s.id !== studentId);
  delete state.grades[studentId];
  saveState();
}

export function renameStudent(studentId, name) {
  const s = state.students.find((x) => x.id === studentId);
  if (s) { s.name = name; saveState(); }
}

export function addAssessment() {
  const assessment = { id: uid("a"), name: `AV${state.assessments.length + 1}`, weight: 1 };
  state.assessments.push(assessment);
  saveState();
  return assessment;
}

export function deleteAssessment(assessmentId) {
  state.assessments = state.assessments.filter((a) => a.id !== assessmentId);
  for (const sid of Object.keys(state.grades)) delete state.grades[sid][assessmentId];
  saveState();
}

export function renameAssessment(assessmentId, name) {
  const a = state.assessments.find((x) => x.id === assessmentId);
  if (a) { a.name = name; saveState(); }
}

export function reweightAssessment(assessmentId, weight) {
  const a = state.assessments.find((x) => x.id === assessmentId);
  if (a) { a.weight = parseFloat(weight) || 0; saveState(); }
}

export function setGrade(studentId, assessmentId, rawValue) {
  if (!state.grades[studentId]) state.grades[studentId] = {};
  state.grades[studentId][assessmentId] = clampGrade(rawValue);
  saveState();
}

export function setThresholds({ passThreshold, recoveryThreshold }) {
  if (passThreshold !== undefined) state.passThreshold = parseFloat(passThreshold) || 0;
  if (recoveryThreshold !== undefined) state.recoveryThreshold = parseFloat(recoveryThreshold) || 0;
  saveState();
}

export function setMeta({ turma, periodo }) {
  if (turma !== undefined) state.turma = turma;
  if (periodo !== undefined) state.periodo = periodo;
  saveState();
}
