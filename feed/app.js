
const STORAGE_KEY = "feedbackEdu_v1";

const state = {
  professores: [],
  turmas: [],
  alunos: [],
  feedbacks: []
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let toastTimeout;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved && typeof saved === "object") {
      state.professores = Array.isArray(saved.professores) ? saved.professores : [];
      state.turmas = Array.isArray(saved.turmas) ? saved.turmas : [];
      state.alunos = Array.isArray(saved.alunos) ? saved.alunos : [];
      state.feedbacks = Array.isArray(saved.feedbacks) ? saved.feedbacks : [];
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    showToast("Não foi possível salvar os dados neste navegador.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2800);
}

function navigate(page) {
  const validPages = [
    "inicio", "feedbacks", "professores",
    "turmas", "alunos", "relatorios"
  ];

  if (!validPages.includes(page)) return;

  $$(".page").forEach((section) => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });

  $$(".menu-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const titles = {
    inicio: "Visão geral",
    feedbacks: "Feedbacks",
    professores: "Professores",
    turmas: "Turmas",
    alunos: "Alunos",
    relatorios: "Relatórios"
  };

  $("#page-title").textContent = titles[page];
  renderAll();
}

function field(name, label, type = "text", options = {}) {
  const required = options.required === false ? "" : "required";
  const placeholder = escapeHTML(options.placeholder || "");
  const value = options.value ?? "";

  if (type === "select") {
    const choices = options.choices || [];
    return `
      <div class="field">
        <label for="${name}">${escapeHTML(label)}</label>
        <select id="${name}" name="${name}" ${required}>
          <option value="">Selecione...</option>
          ${choices.map(item => `
            <option value="${escapeHTML(item.value)}">
              ${escapeHTML(item.label)}
            </option>
          `).join("")}
        </select>
      </div>`;
  }

  if (type === "textarea") {
    return `
      <div class="field">
        <label for="${name}">${escapeHTML(label)}</label>
        <textarea id="${name}" name="${name}" placeholder="${placeholder}" ${required}></textarea>
      </div>`;
  }

  return `
    <div class="field">
      <label for="${name}">${escapeHTML(label)}</label>
      <input id="${name}" name="${name}" type="${type}"
        value="${escapeHTML(value)}"
        placeholder="${placeholder}" ${required}
        ${type === "number" ? 'min="0" max="10" step="1"' : ""}>
    </div>`;
}

function openModal(title, fields, onSave) {
  const modal = $("#modal");
  $("#modal-title").textContent = title;
  $("#modal-fields").innerHTML = fields;

  const form = $("#modal-form");

  form.onsubmit = (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());

    if (onSave(values) !== false) {
      modal.close();
      form.reset();
      renderAll();
    }
  };

  modal.showModal();
}

function closeModal() {
  $("#modal").close();
}

function addProfessor() {
  openModal("Adicionar professor", [
    field("nome", "Nome completo", "text", { placeholder: "Nome do professor" }),
    field("materia", "Disciplina", "text", { placeholder: "Ex.: Inglês" }),
    field("contato", "Contato (opcional)", "text", {
      placeholder: "Telefone ou e-mail",
      required: false
    })
  ].join(""), (values) => {
    state.professores.push({
      id: crypto.randomUUID(),
      nome: values.nome.trim(),
      materia: values.materia.trim(),
      contato: values.contato.trim()
    });

    saveData();
    showToast("Professor cadastrado.");
  });
}

function addTurma() {
  openModal("Adicionar turma", [
    field("nome", "Nome da turma", "text", { placeholder: "Ex.: Kids 1" }),
    field("professorId", "Professor responsável", "select", {
      choices: state.professores.map(p => ({
        value: p.id,
        label: `${p.nome} (${p.materia || "Sem disciplina"})`
      })),
      required: false
    }),
    field("turno", "Turno", "select", {
      choices: [
        { value: "Manhã", label: "Manhã" },
        { value: "Tarde", label: "Tarde" },
        { value: "Noite", label: "Noite" }
      ],
      required: false
    })
  ].join(""), (values) => {
    state.turmas.push({
      id: crypto.randomUUID(),
      nome: values.nome.trim(),
      professorId: values.professorId,
      turno: values.turno
    });

    saveData();
    showToast("Turma cadastrada.");
  });
}

function addAluno() {
  openModal("Adicionar aluno", [
    field("nome", "Nome do aluno", "text", { placeholder: "Nome completo" }),
    field("turmaId", "Turma", "select", {
      choices: state.turmas.map(t => ({
        value: t.id,
        label: t.nome
      })),
      required: false
    }),
    field("responsavel", "Nome do responsável (opcional)", "text", {
      placeholder: "Nome do pai, mãe ou responsável",
      required: false
    }),
    field("contato", "Contato do responsável (opcional)", "text", {
      placeholder: "Telefone ou e-mail",
      required: false
    })
  ].join(""), (values) => {
    state.alunos.push({
      id: crypto.randomUUID(),
      nome: values.nome.trim(),
      turmaId: values.turmaId,
      responsavel: values.responsavel.trim(),
      contato: values.contato.trim()
    });

    saveData();
    showToast("Aluno cadastrado.");
  });
}

function addFeedback() {
  const professorChoices = state.professores.map(p => ({
    value: p.id,
    label: p.nome
  }));

  const turmaChoices = state.turmas.map(t => ({
    value: t.id,
    label: t.nome
  }));

  const alunoChoices = state.alunos.map(a => ({
    value: a.id,
    label: a.nome
  }));

  openModal("Novo feedback", [
    field("responsavel", "Nome do responsável", "text", {
      placeholder: "Quem respondeu ao feedback"
    }),
    field("alunoId", "Aluno", "select", {
      choices: alunoChoices,
      required: false
    }),
    field("turmaId", "Turma", "select", {
      choices: turmaChoices,
      required: false
    }),
    field("professorId", "Professor", "select", {
      choices: professorChoices,
      required: false
    }),
    field("atendimento", "Status do atendimento", "select", {
      choices: [
        { value: "Atendeu", label: "Atendeu" },
        { value: "Não atendeu", label: "Não atendeu" },
        { value: "Indisponível", label: "Indisponível" }
      ]
    }),
    field("nota", "Nota de 0 a 10", "number", {
      placeholder: "Ex.: 9"
    }),
    field("recomendaria", "Recomendaria a escola?", "select", {
      choices: [
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Não" },
        { value: "Talvez", label: "Talvez" }
      ]
    }),
    field("reclamacao", "Houve alguma reclamação?", "select", {
      choices: [
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Não" }
      ]
    }),
    field("comentario", "Comentários e sugestões", "textarea", {
      placeholder: "Registre as observações da família...",
      required: false
    })
  ].join(""), (values) => {
    const nota = Number(values.nota);

    if (!Number.isInteger(nota) || nota < 0 || nota > 10) {
      showToast("A nota deve ser um número inteiro de 0 a 10.");
      return false;
    }

    state.feedbacks.push({
      id: crypto.randomUUID(),
      responsavel: values.responsavel.trim(),
      alunoId: values.alunoId,
      turmaId: values.turmaId,
      professorId: values.professorId,
      atendimento: values.atendimento,
      nota,
      recomendaria: values.recomendaria,
      reclamacao: values.reclamacao,
      comentario: values.comentario.trim(),
      data: new Date().toISOString()
    });

    saveData();
    showToast("Feedback registrado.");
  });
}

function removeRecord(collection, id, label) {
  if (!confirm(`Deseja realmente excluir este registro de ${label}?`)) {
    return;
  }

  state[collection] = state[collection].filter(item => item.id !== id);
  saveData();
  renderAll();
  showToast("Registro excluído.");
}

function getName(collection, id) {
  return state[collection].find(item => item.id === id)?.nome ||
         state[collection].find(item => item.id === id)?.responsavel ||
         "Não informado";
}

function renderRecords(collection, target, subtitleFn) {
  const container = $(target);
  const records = state[collection];

  if (!records.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">＋</div>
        <strong>Nenhum registro cadastrado</strong>
        <p>Use o botão acima para adicionar o primeiro.</p>
      </div>`;
    return;
  }

  container.innerHTML = records.map(item => `
    <div class="record-item">
      <div>
        <strong>${escapeHTML(item.nome)}</strong>
        <small>${escapeHTML(subtitleFn(item))}</small>
      </div>
      <button class="delete-button" data-delete="${collection}" data-id="${item.id}">
        Excluir
      </button>
    </div>
  `).join("");
}

function renderFeedbacks(target, limit = Infinity) {
  const container = $(target);
  const records = [...state.feedbacks]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, limit);

  if (!records.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">▤</div>
        <strong>Nenhum feedback registrado</strong>
        <p>Cadastre um feedback para visualizar os resultados.</p>
      </div>`;
    return;
  }

  container.innerHTML = records.map(item => `
    <div class="feedback-item">
      <div>
        <strong>${escapeHTML(item.responsavel)}</strong>
        <small>
          ${escapeHTML(getName("alunos", item.alunoId))}
          · Nota ${item.nota}/10
          · ${escapeHTML(item.atendimento)}
        </small>
        <small>${new Date(item.data).toLocaleDateString("pt-BR")}</small>
      </div>
      <button class="delete-button" data-delete="feedbacks" data-id="${item.id}">
        Excluir
      </button>
    </div>
  `).join("");
}

function renderReports() {
  const feedbacks = state.feedbacks;
  const avg = feedbacks.length
    ? (feedbacks.reduce((sum, item) => sum + Number(item.nota), 0) / feedbacks.length).toFixed(1)
    : "—";

  const complaints = feedbacks.filter(item => item.reclamacao === "Sim").length;
  const answered = feedbacks.filter(item => item.atendimento === "Atendeu").length;
  const recommendations = feedbacks.filter(item => item.recomendaria === "Sim").length;

  $("#report-content").innerHTML = [
    ["Feedbacks registrados", feedbacks.length],
    ["Média das notas", avg],
    ["Com reclamação", complaints],
    ["Atendimentos realizados", answered],
    ["Recomendariam a escola", recommendations],
    ["Professores cadastrados", state.professores.length]
  ].map(([label, value]) => `
    <div class="report-card">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `).join("");
}

function renderAll() {
  $("#stat-feedbacks").textContent = state.feedbacks.length;
  $("#stat-professores").textContent = state.professores.length;
  $("#stat-turmas").textContent = state.turmas.length;

  const avg = state.feedbacks.length
    ? state.feedbacks.reduce((sum, item) => sum + Number(item.nota), 0) /
      state.feedbacks.length
    : null;

  $("#stat-media").textContent = avg === null ? "—" : avg.toFixed(1);

  renderFeedbacks("#recent-feedbacks", 5);
  renderFeedbacks("#feedback-list");

  renderRecords("professores", "#professor-list",
    item => `${item.materia || "Disciplina não informada"}${item.contato ? " · " + item.contato : ""}`);

  renderRecords("turmas", "#turma-list",
    item => `${item.turno || "Turno não informado"} · Professor: ${
      state.professores.find(p => p.id === item.professorId)?.nome || "Não informado"
    }`);

  renderRecords("alunos", "#aluno-list",
    item => `Turma: ${
      state.turmas.find(t => t.id === item.turmaId)?.nome || "Não informada"
    }${item.responsavel ? " · Responsável: " + item.responsavel : ""}`);

  renderReports();
}

function exportCSV() {
  if (!state.feedbacks.length) {
    showToast("Não existem feedbacks para exportar.");
    return;
  }

  const headers = [
    "Data", "Responsável", "Aluno", "Turma", "Professor",
    "Atendimento", "Nota", "Recomendaria", "Reclamação", "Comentários"
  ];

  const rows = state.feedbacks.map(item => [
    new Date(item.data).toLocaleDateString("pt-BR"),
    item.responsavel,
    getName("alunos", item.alunoId),
    state.turmas.find(t => t.id === item.turmaId)?.nome || "",
    state.professores.find(p => p.id === item.professorId)?.nome || "",
    item.atendimento,
    item.nota,
    item.recomendaria,
    item.reclamacao,
    item.comentario
  ]);

  const escapeCSV = value =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = "\uFEFF" + [headers, ...rows]
    .map(row => row.map(escapeCSV).join(";"))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "feedbacks-edu.csv";
  link.click();

  URL.revokeObjectURL(url);
  showToast("Arquivo CSV exportado.");
}

document.addEventListener("click", event => {
  const menuButton = event.target.closest("[data-page]");
  if (menuButton) navigate(menuButton.dataset.page);

  const goButton = event.target.closest("[data-go]");
  if (goButton) navigate(goButton.dataset.go);

  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    removeRecord(deleteButton.dataset.delete, deleteButton.dataset.id,
      deleteButton.dataset.delete);
  }
});

$("#new-feedback").addEventListener("click", addFeedback);
$("#new-feedback-2").addEventListener("click", addFeedback);
$("#add-professor").addEventListener("click", addProfessor);
$("#add-turma").addEventListener("click", addTurma);
$("#add-aluno").addEventListener("click", addAluno);
$("#export-csv").addEventListener("click", exportCSV);
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);

loadData();
renderAll();
