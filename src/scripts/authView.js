// Tela de login/cadastro. Não decide navegação — só chama supabase.auth.*
// e deixa o main.js reagir via onAuthStateChange (fonte única de verdade
// sobre "está logado ou não").

import { supabase } from "./supabaseClient.js";

const el = (id) => document.getElementById(id);

let mode = "login"; // "login" | "signup"

function setMode(next) {
  mode = next;
  const isLogin = mode === "login";
  el("authTabLogin").classList.toggle("active", isLogin);
  el("authTabSignup").classList.toggle("active", !isLogin);
  el("authTitle").textContent = isLogin ? "Entrar" : "Criar conta";
  el("authSubmit").textContent = isLogin ? "Entrar" : "Criar conta";
  el("nomeField").hidden = isLogin;
  el("authPassword").autocomplete = isLogin ? "current-password" : "new-password";
  hideError();
}

function showError(msg) {
  const box = el("authError");
  box.textContent = msg;
  box.hidden = false;
}
function hideError() {
  el("authError").hidden = true;
}

function translateError(message) {
  if (/Invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/User already registered/i.test(message)) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (/Password should be at least/i.test(message)) return "Senha muito curta — mínimo 6 caracteres.";
  if (/Unable to validate email address/i.test(message)) return "E-mail inválido.";
  return message;
}

export function initAuthView() {
  el("authTabLogin").addEventListener("click", () => setMode("login"));
  el("authTabSignup").addEventListener("click", () => setMode("signup"));

  el("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const email = el("authEmail").value.trim();
    const password = el("authPassword").value;
    const nome = el("authNome").value.trim();
    const submitBtn = el("authSubmit");

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = mode === "login" ? "Entrando…" : "Criando conta…";

    try {
      const { error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password, options: { data: { nome } } });

      if (error) throw error;
      // Sucesso: onAuthStateChange (registrado em main.js) troca a tela.
    } catch (err) {
      showError(translateError(err.message));
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}
