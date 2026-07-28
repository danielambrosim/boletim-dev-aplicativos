// Regras de cálculo — funções puras, sem DOM, sem estado global.
// Podem ser testadas isoladamente: grades.computeAverage(state, id).

export function clampGrade(v) {
  if (v === "" || v === null || typeof v === "undefined") return null;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(10, n));
}

/**
 * Média ponderada das avaliações já lançadas para um aluno.
 * Avaliações sem nota lançada não entram no cálculo (não contam como zero).
 */
export function computeAverage(state, studentId) {
  const g = state.grades[studentId] || {};
  let weightSum = 0;
  let scoreSum = 0;
  let gradedCount = 0;

  for (const a of state.assessments) {
    const v = clampGrade(g[a.id]);
    if (v !== null) {
      const w = parseFloat(a.weight) || 0;
      weightSum += w;
      scoreSum += v * w;
      gradedCount++;
    }
  }

  const total = state.assessments.length;
  return {
    avg: weightSum > 0 ? scoreSum / weightSum : null,
    gradedCount,
    partial: total > 0 && gradedCount > 0 && gradedCount < total,
    noneGraded: gradedCount === 0
  };
}

export function statusFor(state, avgInfo) {
  if (state.assessments.length === 0 || avgInfo.noneGraded) return "pending";
  if (avgInfo.avg >= state.passThreshold) return "good";
  if (avgInfo.avg >= state.recoveryThreshold) return "warn";
  return "bad";
}

export function statusLabel(status) {
  return { good: "Aprovado", warn: "Recuperação", bad: "Reprovado", pending: "Sem notas" }[status];
}

export function fmt(n, digits = 1) {
  if (n === null || typeof n === "undefined" || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Remove acentos e caixa para permitir busca "joao" -> "João". */
export function normalize(str) {
  return (str || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
