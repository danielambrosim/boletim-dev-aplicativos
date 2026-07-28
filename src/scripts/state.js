// Fonte única de verdade + persistência em localStorage.
// `state` é um "live binding" ES module: qualquer módulo que faça
// `import { state } from './state.js'` enxerga mutações em tempo real,
// sem precisar de getters/setters.

const STORAGE_KEY = "boletim_dev_aplicativos_v1";

const defaultState = {
  turma: "",
  periodo: "",
  passThreshold: 6,
  recoveryThreshold: 4,
  students: [],
  assessments: [],
  grades: {}
};

export let storageOk = true;

export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    storageOk = false;
    return null;
  }
}

export let state = { ...defaultState, ...(readFromStorage() || {}) };

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    storageOk = false;
  }
}

/** Substitui o estado inteiro (usado pela importação de backup). */
export function replaceState(next) {
  if (!next || !Array.isArray(next.students) || !Array.isArray(next.assessments)) {
    throw new Error("Formato de backup inválido.");
  }
  state = { ...defaultState, ...next };
  saveState();
  return state;
}
