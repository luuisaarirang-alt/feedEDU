// ==============================================
// FEEDBACK EDU — Supabase · Versão Final Corrigida
// ==============================================

const SUPABASE_URL = 'https://bnxsykpgwwysfxgjqtmd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lNWwpMxIvWkjP45i8yp0Ug_HIodAspI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dados = {
  professores: [],
  turmas: [],
  alunos: [],
  feedbacks: []
};

async function carregarDados() {
  try {
    const [prof, tur, alu, feed] = await Promise.all([
      supabaseClient.from('professores').select('*').order('nome'),
      supabaseClient.from('turmas').select('*').order('nome'),
      supabaseClient.from('alunos').select('*').order('nome'),
      supabaseClient.from('feedbacks').select('*').order('data_registro', { ascending: false })
    ]);

    if (prof.error) throw prof.error;
    if (tur.error) throw tur.error;
    if (alu.error) throw alu.error;
    if (feed.error) throw feed.error;

    dados.professores = prof.data;
    dados.turmas = tur.data;
    dados.alunos = alu.data;
    dados.feedbacks = feed.data;

    atualizarEstatisticas();
    renderizarPagina();
  } catch (erro) {
    mostrarToast('❌ Erro: ' + erro.message);
    console.error(erro);
  }
}

async function salvarDados(tabela, dadosNovos) {
  const { data, error } = await supabaseClient
    .from(tabela)
    .insert(dadosNovos)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function excluirRegistro(tabela, id) {
  if (!confirm('Tem certeza? Não pode ser desfeito.')) return;
  try {
    const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
    if (error) throw error;
    mostrarToast('🗑️ Excluído!');
    await carregarDados();
  } catch (erro) {
    mostrarToast('❌ Erro ao excluir: ' + erro.message);
  }
}

function atualizarEstatisticas() {
  document.getElementById('stat-feedbacks').textContent = dados.feedbacks.length;
  document.getElementById('stat-professores').textContent = dados.professores.length;
  document.getElementById('stat-turmas').textContent = dados.turmas.length;

  const comNota = dados.feedbacks.filter(f => f.nota);
  const mediaEl = document.getElementById('stat-media');
  mediaEl.textContent = comNota.length
    ? (comNota.reduce((s, f) => s + f.nota, 0) / comNota.length).toFixed(1)
    : '—';

  const ultimos = dados.feedbacks.slice(0, 3);
  const container = document.getElementById('recent-feedbacks');

  if (ultimos.length > 0) {
    container.innerHTML = ultimos.map(f => {
      const aluno = dados.alunos.find(a => a.id === f.aluno_id);
      const estrelas = '★'.repeat(f.nota) + '☆'.repeat(5 - f.nota);
      const dataFmt = new Date(f.data_registro).toLocaleString('pt-BR');
      return `
        <div class="feedback-item">
          <div>
            <strong>${aluno?.nome || 'Aluno'}</strong>
            <small>${estrelas} · ${f.tipo} · ${f.status}</small>
            <small style="color:var(--muted)">${f.mensagem?.substring(0, 60)}${f.mensagem?.length > 60 ? '...' : '' || 'Sem mensagem'}</small>
          </div>
          <small style="white-space:nowrap">${dataFmt}</small>
        </div>
      `;
    }).join('');
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">▤</div>
        <strong>Nenhum feedback registrado</strong>
        <p>Os registros aparecerão aqui.</p>
      </div>
    `;
  }
}

document.querySelectorAll('.menu-item').forEach(botao => {
  botao.addEventListener('click', () => {
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    botao.classList.add('active');
    const pag = botao.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pag}`).classList.add('active');
    document.getElementById('page-title').textContent = botao.textContent.trim().replace(/^[^\p{L}]+/u, '');
    renderizarPagina();
  });
});

document.querySelectorAll('[data-go]').forEach(botao => {
  botao.addEventListener('click', () => {
    const pag = botao.dataset.go;
    document.querySelectorAll('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.page === pag));
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${pag}`));
    document.getElementById('page-title').textContent = document.querySelector(`[data-page="${pag}"]`).textContent.trim().replace(/^[^\p{L}]+/u, '');
    renderizarPagina();
  });
});

const modal = document.getElementById('modal');
const form = document.getElementById('modal-form');
let tipoCadastroAtual = null;

function abrirModal(tipo) {
  tipoCadastroAtual = tipo;
  const titulos = {
    feedback: 'Novo Feedback',
    professor: 'Adicionar Professor',
    turma: 'Adicionar Turma',
    aluno: 'Adicionar Aluno'
  };
  document.getElementById('modal-title').textContent = titulos[tipo];

  let camposHTML = '';

  if (tipo === 'professor') {
    camposHTML = `
      <div class="field">
        <label>Nome completo</label>
        <input name="nome" required placeholder="Ex: Maria da Silva">
      </div>
      <div class="field">
        <label>E-mail</label>
        <input type="email" name="email" placeholder="professor@escola.edu.br">
      </div>
      <div class="field">
        <label>Telefone / WhatsApp</label>
        <input name="telefone" placeholder="(00) 00000-0000">
      </div>
    `;
  }

  if (tipo === 'turma') {
    camposHTML = `
      <div class="field">
        <label>Nome da turma</label>
        <input name="nome" required placeholder="Ex: 3º Ano A">
      </div>
      <div class="field">
        <label>Ano letivo</label>
        <input type="number" name="ano" required placeholder="2026">
      </div>
      <div class="field">
        <label>Professor responsável</label>
        <select name="professor_id">
          <option value="">— Selecione</option>
          ${dados.professores.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
        </select>
      </div>
    `;
  }

  if (tipo === 'aluno') {
    camposHTML = `
      <div class="field">
        <label>Nome completo</label>
        <input name="nome" required placeholder="Ex: João Pereira">
      </div>
      <div class="field">
        <label>Data de nascimento</label>
        <input type="date" name="nascimento">
      </div>
      <div class="field">
        <label>Turma</label>
        <select name="turma_id" required>
          <option value="">— Selecione</option>
          ${dados.turmas.map(t => `<option value="${t.id}">${t.nome} — ${t.ano}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Responsável</label>
        <input name="responsavel" placeholder="Nome da mãe/pai">
      </div>
      <div class="field">
        <label>Contato da família</label>
        <input name="contato" placeholder="Telefone ou e-mail">
      </div>
    `;
  }

  if (tipo === 'feedback') {
    camposHTML = `
      <div class="field">
        <label>Aluno</label>
        <select name="aluno_id" required>
          <option value="">— Selecione</option>
          ${dados.alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Professor avaliado</label>
        <select name="professor_id">
          <option value="">— Opcional</option>
          ${dados.professores.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Nota</label>
        <select name="nota" required>
          <option value="">— Escolha</option>
          <option value="5">⭐⭐⭐⭐⭐ — Excelente</option>
          <option value="4">⭐⭐⭐⭐ — Bom</option>
          <option value="3">⭐⭐⭐ — Regular</option>
          <option value="2">⭐⭐ — Precisa melhorar</option>
          <option value="1">⭐ — Insatisfatório</option>
        </select>
      </div>
      <div class="field">
        <label>Tipo</label>
        <select name="tipo">
          <option value="elogio">Elogio</option>
          <option value="sugestão">Sugestão</option>
          <option value="reclamação">Reclamação</option>
          <option value="outro" selected>Outro</option>
        </select>
      </div>
      <div class="field">
        <label>Mensagem</label>
        <textarea name="mensagem" placeholder="Detalhe sua observação..."></textarea>
      </div>
    `;
  }

  document.getElementById('modal-fields').innerHTML = camposHTML;
  modal.showModal();
}

document.getElementById('new-feedback')?.addEventListener('click', () => abrirModal('feedback'));
document.getElementById('new-feedback-2')?.addEventListener('click', () => abrirModal('feedback'));
document.getElementById('add-professor')?.addEventListener('click', () => abrirModal('professor'));
document.getElementById('add-turma')?.addEventListener('click', () => abrirModal('turma'));
document.getElementById('add-aluno')?.addEventListener('click', () => abrirModal('aluno'));

document.getElementById('close-modal').addEventListener('click', () => modal.close());
document.getElementById('cancel-modal').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const vals = Object.fromEntries(new FormData(form));

  try {
    if (tipoCadastroAtual === 'professor') {
      await salvarDados('professores', {
        nome: vals.nome.trim(),
        email: vals.email?.trim() || null,
        telefone: vals.telefone?.trim() || null
      });
      mostrarToast('✅ Professor cadastrado!');
    }

    if (tipoCadastroAtual === 'turma') {
      await salvarDados('turmas', {
        nome: vals.nome.trim(),
        ano: Number(vals.ano),
        professor_id: vals.professor_id ? Number(vals.professor_id) : null
      });
      mostrarToast('✅ Turma cadastrada!');
    }

    if (tipoCadastroAtual === 'aluno') {
      await salvarDados('alunos', {
        nome: vals.nome.trim(),
        data_nascimento: vals.nascimento || null,
        turma_id: vals.turma_id ? Number(vals.turma_id) : null,
        responsavel: vals.responsavel?.trim() || null,
        contato_responsavel: vals.contato?.trim() || null
      });
      mostrarToast('✅ Aluno cadastrado!');
    }

    if (tipoCadastroAtual === 'feedback') {
      const aluno = dados.alunos.find(a => a.id === Number(vals.aluno_id));
      const turma = aluno ? dados.turmas.find(t => t.id === aluno.turma_id) : null;
      
      await salvarDados('feedbacks', {
        aluno_id: Number(vals.aluno_id),
        turma_id: turma?.id || null,
        professor_id: vals.professor_id ? Number(vals.professor_id) : null,
        nota: Number(vals.nota),
        tipo: vals.tipo,
        mensagem: vals.mensagem?.trim() || ''
      });
      mostrarToast('✅ Feedback registrado!');
    }

    modal.close();
    form.reset();
    await carregarDados();
  } catch (erro) {
    mostrarToast('❌ Erro: ' + erro.message);
  }
});

function mostrarToast(texto) {
  const t = document.getElementById('toast');
  t.textContent = texto;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

function renderizarPagina() {
  const listaProf = document.getElementById('professor-list');
  if (listaProf) {
    listaProf.innerHTML = dados.professores.length ? dados.professores.map(p => `
      <div class="record-item">
        <div>
          <strong>${p.nome}</strong>
          <small>${p.email || 'Sem e-mail'} · ${p.telefone || 'Sem telefone'}</small>
        </div>
        <button class="delete-button" data-tabela="professores" data-id="${p.id}">Excluir</button>
      </div>
    `).join('') : `
      <div class="empty-state">
        <div class="empty-icon">♙</div>
        <strong>Nenhum professor cadastrado</strong>
        <p>Clique em "+ Adicionar professor".</p>
      </div>
    `;
  }

  const listaTurma = document.getElementById('turma-list');
  if (listaTurma) {
    listaTurma.innerHTML = dados.turmas.length ? dados.turmas.map(t => {
      const prof = dados.professores.find(p => p.id === t.professor_id);
      return `
        <div class="record-item">
          <div>
            <strong>${t.nome}</strong>
            <small>Ano ${t.ano} · Responsável: ${prof?.nome || 'Não informado'}</small>
          </div>
          <button class="delete-button" data-tabela="turmas" data-id="${t.id}">Excluir</button>
        </div>
      `;
    }).join('') : `
      <div class="empty-state">
        <div class="empty-icon">▦</div>
        <strong>Nenhuma turma cadastrada</strong>
        <p>Clique em "+ Adicionar turma".</p>
      </div>
    `;
  }

  const listaAluno = document.getElementById('aluno-list');
  if (listaAluno) {
    listaAluno.innerHTML = dados.alunos.length ? dados.alunos.map(a => {
      const turma = dados.turmas.find(t => t.id === a.turma_id);
      return `
        <div class="record-item">
          <div>
            <strong>${a.nome}</strong>
            <small>Turma: ${turma?.nome || 'Não alocado'} · Resp: ${a.responsavel || 'Não informado'}</small>
          </div>
          <button class="delete-button" data-tabela="alunos" data-id="${a.id}">Excluir</button>
        </div>
      `;
    }).join('') : `
      <div class="empty-state">
        <div class="empty-icon">♧</div>
        <strong>Nenhum aluno cadastrado</strong>
        <p>Clique em "+ Adicionar aluno".</p>
      </div>
    `;
  }

  const listaFeed = document.getElementById('feedback-list');
  if (listaFeed) {
    listaFeed.innerHTML = dados.feedbacks.length ? dados.feedbacks.map(f => {
      const aluno = dados.alunos.find(a => a.id === f.aluno_id);
      const prof = dados.professores.find(p => p.id === f.professor_id);
      const estrelas = '★'.repeat(f.nota) + '☆'.repeat(5 - f.nota);
      const dataFmt = new Date(f.data_registro).toLocaleDateString('pt-BR');
      return `
        <div class="feedback-item">
          <div style="flex:1">
            <strong>${aluno?.nome || 'Aluno'}</strong>
            <small>${estrelas} · ${f.tipo} · ${f.status} · ${prof?.nome || 'Sem professor'}</small>
            <small style="color:var(--muted)">${f.mensagem || 'Sem mensagem'}</small>
          </div>
          <div style="text-align:right">
            <small>${dataFmt}</small>
            <button class="delete-button" data-tabela="feedbacks" data-id="${f.id}" style="margin-top:6px">Excluir</button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="empty-state">
        <div class="empty-icon">▤</div>
        <strong>Nenhum feedback encontrado</strong>
        <p>Cadastre um feedback para começar.</p>
      </div>
    `;
  }

  const relatorio = document.getElementById('report-content');
  if (relatorio) {
    const total = dados.feedbacks.length;
    const media = total ? (dados.feedbacks.reduce((s, f) => s + f.nota, 0) / total).toFixed(1) : '—';
    const porTipo = {
      elogio: dados.feedbacks.filter(f => f.tipo === 'elogio').length,
      sugestão: dados.feedbacks.filter(f => f.tipo === 'sugestão').length,
      reclamação: dados.feedbacks.filter(f => f.tipo === 'reclamação').length,
      outro: dados.feedbacks.filter(f => f.tipo === 'outro').length
    };

    relatorio.innerHTML = `
      <div class="report-card"><span>Total de feedbacks</span><strong>${total}</strong></div>
      <div class="report-card"><span>Média das notas</span><strong>${media}</strong></div>
      <div class="report-card"><span>Professores ativos</span><strong>${dados.professores.length}</strong></div>
      <div class="report-card"><span>Alunos cadastrados</span><strong>${dados.alunos.length}</strong></div>
      <div class="report-card"><span>Elogios</span><strong style="color:var(--green)">${porTipo.elogio}</strong></div>
      <div class="report-card"><span>Sugestões</span><strong style="color:var(--blue)">${porTipo.sugestão}</strong></div>
      <div class="report-card"><span>Reclamações</span><strong style="color:#d63939">${porTipo.reclamação}</strong></div>
      <div class="report-card"><span>Turmas ativas</span><strong>${dados.turmas.length}</strong></div>
    `;
  }

  document.querySelectorAll('.delete-button').forEach(btn => {
    btn.onclick = () => excluirRegistro(btn.dataset.tabela, Number(btn.dataset.id));
  });
}

document.getElementById('export-csv')?.addEventListener('click', () => {
  if (!dados.feedbacks.length) return mostrarToast('Nenhum dado para exportar');
  
  const cab = 'Data;Aluno;Turma;Professor;Nota;Tipo;Status;Mensagem\n';
  const linhas = dados.feedbacks.map(f => {
    const aluno = dados.alunos.find(a => a.id === f.aluno_id);
    const turma = aluno ? dados.turmas.find(t => t.id === aluno.turma_id) : null;
    const prof = dados.professores.find(p => p.id === f.professor_id);
    return [
      new Date(f.data_registro).toLocaleDateString('pt-BR'),
      `"${aluno?.nome || ''}"`,
      `"${turma?.nome || ''}"`,
      `"${prof?.nome || ''}"`,
      f.nota, f.tipo, f.status, `"${(f.mensagem || '').replace(/"/g, '""')}"`
    ].join(';');
  }).join('\n');

  const blob = new Blob([cab + linhas], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `feedbacks_${new Date().toLocaleDateString('pt-BR').replaceAll('/', '-')}.csv`;
  a.click();
  mostrarToast('📥 Exportado!');
});

carregarDados();