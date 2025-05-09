import { 
  createMestre, getMestres, updateMestre, deleteMestre 
} from '../src/entities/mestre/crud.js';
import { 
  createCampanha, getCampanhasByMestre, updateCampanha, deleteCampanha 
} from '../src/entities/campanha/crud.js';
import { 
  createPersonagem, getPersonagensByCampanha, getPersonagemById, updatePersonagem, deletePersonagem 
} from '../src/entities/personagem/crud.js';
import { 
  createDiario, getDiariosByPersonagem, updateDiario, deleteDiario 
} from '../src/entities/diario/crud.js';

// Elementos do DOM
const elementos = {
  // Modals
  modalMestre: document.getElementById('modalMestre'),
  modalCampanha: document.getElementById('modalCampanha'),
  modalPersonagem: document.getElementById('modalPersonagem'),
  modalDiario: document.getElementById('modalDiario'),
  
  // Formulários
  formMestre: document.getElementById('formMestre'),
  formCampanha: document.getElementById('formCampanha'),
  formPersonagem: document.getElementById('formPersonagem'),
  formDiario: document.getElementById('formDiario'),
  
  // Inputs
  mestreNomeInput: document.getElementById('nomeMestreInput'),
  campanhaTituloInput: document.getElementById('inputTituloCampanha'),
  campanhaSistemaInput: document.getElementById('inputSistemaCampanha'),
  personagemNomeInput: document.getElementById('inputNomePersonagem'),
  personagemPlayerInput: document.getElementById('inputPlayerName'),
  personagemClasseInput: document.getElementById('inputClassePersonagem'),
  diarioAnoInput: document.getElementById('diarioAno'),
  diarioConteudoInput: document.getElementById('diarioConteudo'),
  
  // Listas
  listaDiarios: document.getElementById('listaDiarios')
};

// ========== FUNÇÕES DE CARREGAMENTO ========== //

async function carregarMestres(mestreIdParaExpandir = null, campanhaIdParaExpandir = null) {
  try {
    const mestres = await getMestres();
    const container = document.getElementById('mestresContainer');
    container.innerHTML = '';

    for (const mestre of mestres) {
      const card = document.createElement('div');
      card.className = 'mestre-card';
      card.dataset.mestreId = mestre.id;
      
      card.innerHTML = `
        <div class="mestre-header">
          <h3 class="mestre-nome">
            <i class="fas fa-crown"></i> ${mestre.nome}
          </h3>
          <div class="mestre-actions">
            <button class="btn btn-sm btn-outline-primary btn-editar-mestre me-1"
                    data-mestre-id="${mestre.id}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-sm btn-outline-light btn-adicionar-campanha me-1" 
                    data-bs-toggle="modal" 
                    data-bs-target="#modalCampanha"
                    data-mestre-id="${mestre.id}">
              <i class="fas fa-plus"></i> Campanha
            </button>
            <button class="btn btn-sm btn-outline-danger btn-excluir-mestre" 
                    data-mestre-id="${mestre.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="campanhas-container" data-mestre-id="${mestre.id}" 
             style="display: none;">
          <!-- Campanhas aparecerão aqui -->
        </div>
      `;
      
      container.appendChild(card);

      const campanhasContainer = card.querySelector('.campanhas-container');
      
      if (mestreIdParaExpandir === mestre.id) {
        await carregarCampanhas(mestre.id, campanhasContainer, campanhaIdParaExpandir);
        campanhasContainer.style.display = 'block';
      }

      card.querySelector('.btn-editar-mestre').addEventListener('click', () => {
        editarMestre(mestre.id, mestre.nome);
      });

      const header = card.querySelector('.mestre-header');
      header.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return;
        
        if (campanhasContainer.style.display === 'none') {
          if (campanhasContainer.children.length === 0) {
            await carregarCampanhas(mestre.id, campanhasContainer);
          }
          campanhasContainer.style.display = 'block';
        } else {
          campanhasContainer.style.display = 'none';
        }
      });

      card.querySelector('.btn-excluir-mestre').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(confirm('Tem certeza que deseja excluir este mestre e todas suas campanhas?')) {
          await deleteMestre(mestre.id);
          card.remove();
        }
      });
    }
  } catch (error) {
    console.error('Erro ao carregar mestres:', error);
  }
}


async function editarMestre(mestreId, nomeAtual) {
  const novoNome = prompt('Editar nome do mestre:', nomeAtual);
  
  if (novoNome && novoNome.trim() !== nomeAtual) {
    try {
      await updateMestre(mestreId, novoNome.trim());
      await carregarMestres();
      alert('Nome do mestre atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao editar mestre:', error);
      alert('Erro ao editar mestre: ' + error.message);
    }
  }
}

async function carregarCampanhas(mestreId, container, campanhaIdParaExpandir = null) {
  try {
    const campanhas = await getCampanhasByMestre(mestreId);
    container.innerHTML = '';

    for (const campanha of campanhas) {
      const campanhaItem = document.createElement('div');
      campanhaItem.className = 'campanha-item';
      campanhaItem.innerHTML = `
        <div class="campanha-card">
          <div class="campanha-header">
            <div class="campanha-header-content">
              <i class="fas fa-book me-2"></i>
              <div class="campanha-info">
                <h5 class="campanha-titulo">${campanha.titulo}</h5>
                <small class="text-muted">${campanha.sistema}</small>
              </div>
            </div>
            <div class="campanha-actions">
              <button class="btn btn-sm btn-outline-primary btn-editar-campanha me-1"
                      data-mestre-id="${mestreId}"
                      data-campanha-id="${campanha.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-outline-light me-1 btn-adicionar-personagem"
                      data-bs-toggle="modal"
                      data-bs-target="#modalPersonagem"
                      data-mestre-id="${mestreId}"
                      data-campanha-id="${campanha.id}">
                <i class="fas fa-user-plus"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger btn-excluir-campanha"
                      data-campanha-id="${campanha.id}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="personagens-container" data-campanha-id="${campanha.id}"
               style="display: ${campanhaIdParaExpandir === campanha.id ? 'block' : 'none'}">
            <!-- Personagens aparecerão aqui -->
          </div>
        </div>
      `;
      
      container.appendChild(campanhaItem);

      const personagensContainer = campanhaItem.querySelector('.personagens-container');
      
      if (campanhaIdParaExpandir === campanha.id) {
        await carregarPersonagens(mestreId, campanha.id, personagensContainer);
      }

      campanhaItem.querySelector('.btn-editar-campanha').addEventListener('click', () => {
        abrirModalEditarCampanha(mestreId, campanha.id, campanha.titulo, campanha.sistema);
      });

      const header = campanhaItem.querySelector('.campanha-header');
      header.addEventListener('click', async (e) => {
        if (e.target.closest('.campanha-actions') || 
            e.target.closest('.btn-adicionar-personagem')) {
          return;
        }

        personagensContainer.style.display = 
          personagensContainer.style.display === 'none' ? 'block' : 'none';
      });

      campanhaItem.querySelector('.btn-adicionar-personagem').addEventListener('click', (e) => {
        e.stopPropagation();
        personagensContainer.style.display = 'block';
      });

      campanhaItem.querySelector('.btn-excluir-campanha').addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (confirm('Tem certeza que deseja excluir esta campanha e todos os personagens relacionados?')) {
          try {
            e.target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            e.target.disabled = true;
            
            await deleteCampanha(mestreId, campanha.id);
            campanhaItem.remove();
            
            e.target.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
              e.target.innerHTML = '<i class="fas fa-trash"></i>';
              e.target.disabled = false;
            }, 1000);
          } catch (error) {
            console.error('Erro ao excluir:', error);
            e.target.innerHTML = '<i class="fas fa-times"></i>';
            alert('Erro ao excluir campanha');
            setTimeout(() => {
              e.target.innerHTML = '<i class="fas fa-trash"></i>';
              e.target.disabled = false;
            }, 1000);
          }
        }
      });
    }
  } catch (error) {
    console.error('Erro ao carregar campanhas:', error);
    container.innerHTML = '<p class="text-danger">Erro ao carregar campanhas</p>';
  }
}

async function carregarPersonagens(mestreId, campanhaId, container, novoPersonagem = null) {
  try {
    const personagens = await getPersonagensByCampanha(mestreId, campanhaId);
    container.innerHTML = '';

    if (novoPersonagem) {
      personagens.unshift(novoPersonagem);
    }
    
    if (personagens.length === 0) {
      container.innerHTML = '<p class="text-muted small">Nenhum personagem criado ainda</p>';
      return;
    }

    personagens.forEach(personagem => {
      const personagemItem = document.createElement('div');
      personagemItem.className = 'personagem-item';
      personagemItem.dataset.personagemId = personagem.id;
      
      personagemItem.innerHTML = `
        <div class="personagem-content">
          <div class="personagem-info">
            <!-- Menu de três pontos movido para antes do emoji -->
            <div class="dropdown-personagem">
              <button class="btn btn-sm btn-menu-personagem">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <div class="dropdown-menu-personagem">
                <button class="dropdown-item btn-editar-personagem"
                        data-mestre-id="${mestreId}"
                        data-campanha-id="${campanhaId}"
                        data-personagem-id="${personagem.id}">
                  <i class="fas fa-edit me-2"></i> Editar
                </button>
                <button class="dropdown-item btn-excluir-personagem"
                        data-mestre-id="${mestreId}"
                        data-campanha-id="${campanhaId}"
                        data-personagem-id="${personagem.id}">
                  <i class="fas fa-trash me-2"></i> Excluir
                </button>
              </div>
            </div>
            
            <span class="personagem-emoji">🧙</span>
            <div>
              <div class="personagem-nome">${personagem.nome}</div>
              <div class="personagem-detalhes">
                ${personagem.classe} | Jogador: ${personagem.playerName}
              </div>
            </div>
          </div>
          <!-- Botão de Diário (mantido como estava) -->
          <div class="diario-dropdown">
            <button class="btn btn-sm btn-diario-principal">
              <i class="fas fa-book"></i> Diário
            </button>
            <div class="diario-options">
              <button class="btn btn-sm btn-criar-diario"
                      data-bs-toggle="modal" 
                      data-bs-target="#modalDiario"
                      data-mestre-id="${mestreId}"
                      data-campanha-id="${campanhaId}"
                      data-personagem-id="${personagem.id}">
                <i class="fas fa-plus"></i> Criar Entrada
              </button>
              <a href="/pages/diario.html?mestreId=${mestreId}&campanhaId=${campanhaId}&personagemId=${personagem.id}" 
                class="btn btn-sm btn-ver-diario">
                <i class="fas fa-book-open"></i> Ver Completo
              </a>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(personagemItem);

      personagemItem.querySelector('.btn-excluir-personagem').addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (confirm(`Tem certeza que deseja excluir o personagem ${personagem.nome}? Todos os diários serão perdidos.`)) {
          try {
            e.target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            e.target.disabled = true;
            
            await deletePersonagem(
              e.target.dataset.mestreId,
              e.target.dataset.campanhaId,
              e.target.dataset.personagemId
            );
            
            personagemItem.remove();
            
            if (container.children.length === 0) {
              container.innerHTML = '<p class="text-muted small">Nenhum personagem criado ainda</p>';
            }
            
          } catch (error) {
            console.error('Erro ao excluir personagem:', error);
            alert('Erro ao excluir personagem');
            e.target.innerHTML = '<i class="fas fa-trash"></i> Excluir';
            e.target.disabled = false;
          }
        }
      });
    });

    configurarDropdownDiario();
    configurarMenusPersonagem();

  } catch (error) {
    container.innerHTML = '<p class="text-danger small">Erro ao carregar personagens</p>';
    console.error('Erro ao carregar personagens:', error);
  }
}

function configurarMenusPersonagem() {
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown-personagem')) {
      document.querySelectorAll('.dropdown-menu-personagem').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });

  document.querySelectorAll('.btn-menu-personagem').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const menu = this.closest('.dropdown-personagem').querySelector('.dropdown-menu-personagem');
      
      document.querySelectorAll('.dropdown-menu-personagem').forEach(m => {
        if (m !== menu) m.classList.remove('show');
      });
      
      menu.classList.toggle('show');
    });
  });

  document.querySelectorAll('.btn-editar-personagem').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const mestreId = this.getAttribute('data-mestre-id');
      const campanhaId = this.getAttribute('data-campanha-id');
      const personagemId = this.getAttribute('data-personagem-id');
      
      try {
        const personagem = await getPersonagemById(mestreId, campanhaId, personagemId);
        abrirModalEditarPersonagem(mestreId, campanhaId, personagemId, {
          nome: personagem.nome,
          playerName: personagem.playerName,
          classe: personagem.classe
        });
      } catch (error) {
        console.error('Erro ao carregar personagem:', error);
        alert('Erro ao carregar dados para edição: ' + error.message);
      }
    });
  });

  document.querySelectorAll('.btn-excluir-personagem').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const mestreId = this.getAttribute('data-mestre-id');
      const campanhaId = this.getAttribute('data-campanha-id');
      const personagemId = this.getAttribute('data-personagem-id');
      
      if (confirm('Tem certeza que deseja excluir este personagem?')) {
        try {
          await deletePersonagem(mestreId, campanhaId, personagemId);
          this.closest('.personagem-item').remove();
        } catch (error) {
          console.error('Erro ao excluir personagem:', error);
          alert('Erro ao excluir personagem');
        }
      }
    });
  });
}

function configurarDropdownDiario() {
  document.querySelectorAll('.btn-diario-principal').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  document.querySelectorAll('.diario-dropdown').forEach(dropdown => {
    const btn = dropdown.querySelector('.btn-diario-principal');
    const menu = dropdown.querySelector('.diario-options');

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target)) {
        menu.style.display = 'none';
      }
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      document.querySelectorAll('.diario-options').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
  });
}


function abrirModalEditarCampanha(mestreId, campanhaId, tituloAtual, sistemaAtual) {
  const modalHTML = `
    <div class="modal fade" id="modalEditarCampanha" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Campanha</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="editarCampanhaTitulo" class="form-label">Título</label>
              <input type="text" class="form-control" id="editarCampanhaTitulo" value="${tituloAtual}">
            </div>
            <div class="mb-3">
              <label for="editarCampanhaSistema" class="form-label">Sistema</label>
              <input type="text" class="form-control" id="editarCampanhaSistema" value="${sistemaAtual}">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnSalvarEdicaoCampanha">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = new bootstrap.Modal(document.getElementById('modalEditarCampanha'));
  
  modal.show();
  
document.getElementById('btnSalvarEdicaoCampanha').addEventListener('click', async () => {
  const novoTitulo = document.getElementById('editarCampanhaTitulo').value.trim();
  const novoSistema = document.getElementById('editarCampanhaSistema').value.trim();
  
  if (!novoTitulo || !novoSistema) {
    alert('Preencha todos os campos!');
    return;
  }

  try {
    await updateCampanha({
      sistema: novoSistema,
      titulo: novoTitulo,
      campanhaDocId: campanhaId,
      mestreDocId: mestreId
    });
    
    modal.hide();
    
    const container = document.querySelector(`[data-mestre-id="${mestreId}"] .campanhas-container`);
    if (container) {
      await carregarCampanhas(mestreId, container);
    }
    
    alert('Campanha atualizada com sucesso!');
  } catch (error) {
    console.error('Erro ao editar campanha:', error);
    alert('Erro ao editar campanha: ' + error.message);
  } finally {
    modal.dispose();
    document.getElementById('modalEditarCampanha').remove();
  }
});

  document.getElementById('modalEditarCampanha').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}

function abrirModalEditarPersonagem(mestreId, campanhaId, personagemId, dadosAtuais) {
 
  const modalExistente = document.getElementById('modalEditarPersonagem');
  if (modalExistente) {
    const bsModal = bootstrap.Modal.getInstance(modalExistente);
    if (bsModal) bsModal.dispose();
    modalExistente.remove();
  }

  const modalHTML = `
    <div class="modal fade" id="modalEditarPersonagem" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Personagem</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="editarPersonagemNome" class="form-label">Nome do Personagem</label>
              <input type="text" class="form-control" id="editarPersonagemNome" 
                     value="${dadosAtuais.nome || ''}" placeholder="Deixe em branco para não alterar">
            </div>
            <div class="mb-3">
              <label for="editarPersonagemJogador" class="form-label">Nome do Jogador</label>
              <input type="text" class="form-control" id="editarPersonagemJogador" 
                     value="${dadosAtuais.playerName || ''}" placeholder="Deixe em branco para não alterar">
            </div>
            <div class="mb-3">
              <label for="editarPersonagemClasse" class="form-label">Classe</label>
              <input type="text" class="form-control" id="editarPersonagemClasse" 
                     value="${dadosAtuais.classe || ''}" placeholder="Deixe em branco para não alterar">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnSalvarEdicaoPersonagem">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modalEl = document.getElementById('modalEditarPersonagem');
  const modal = new bootstrap.Modal(modalEl);
  
  document.getElementById('btnSalvarEdicaoPersonagem').addEventListener('click', async () => {
    const novoNome = document.getElementById('editarPersonagemNome').value.trim();
    const novoJogador = document.getElementById('editarPersonagemJogador').value.trim();
    const novaClasse = document.getElementById('editarPersonagemClasse').value.trim();

    try {
      const dadosAtualizados = {};
      if (novoNome) dadosAtualizados.nome = novoNome;
      if (novoJogador) dadosAtualizados.playerName = novoJogador;
      if (novaClasse) dadosAtualizados.classe = novaClasse;

      await updatePersonagem(mestreId, campanhaId, personagemId, dadosAtualizados);
      
      modal.hide();
      
      const campanhaCard = document.querySelector(`[data-campanha-id="${campanhaId}"]`);
      if (campanhaCard) {
        const personagensContainer = campanhaCard.querySelector('.personagens-container');
        if (personagensContainer) {
          await carregarPersonagens(mestreId, campanhaId, personagensContainer);
        }
      }
      
      alert('Personagem atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao editar personagem:', error);
      alert('Erro ao editar personagem: ' + error.message);
    } finally {
      modal.dispose();
      document.getElementById('modalEditarPersonagem').remove();
    }
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    try {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.dispose();
      modalEl.remove();
    } catch (e) {
      console.error('Erro ao limpar modal:', e);
    }
  });

  modal.show();
}

async function carregarDiariosModal(personagemId, mestreId, campanhaId) {
  try {
    const diarios = await getDiariosByPersonagem(mestreId, campanhaId, personagemId);
    
    elementos.listaDiarios.innerHTML = diarios.map(diario => `
      <div class="list-group-item diario-item" data-diario-id="${diario.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6>${diario.ano || 'Ano Desconhecido'}</h6>
            <p>${diario.conteudo}</p>
            <small>${diario.criadoEm?.toDate().toLocaleDateString() || 'Data não registrada'}</small>
          </div>
          <button class="btn btn-sm btn-outline-danger btn-excluir-diario">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-excluir-diario').forEach(btn => {
      btn.addEventListener('click', async function() {
        const diarioItem = this.closest('.diario-item');
        const diarioId = diarioItem.getAttribute('data-diario-id');
        
        if (confirm('Tem certeza que deseja excluir este diário?')) {
          try {
            await deleteDiario(mestreId, campanhaId, personagemId, diarioId);
            diarioItem.remove();
            alert('Diário excluído com sucesso!');
          } catch (error) {
            console.error('Erro ao excluir diário:', error);
            alert('Erro ao excluir diário: ' + error.message);
          }
        }
      });
    });

    if (diarios.length === 0) {
      elementos.listaDiarios.innerHTML = '<div class="text-muted">Nenhum diário encontrado</div>';
    }
  } catch (error) {
    console.error('Erro ao carregar diários:', error);
    elementos.listaDiarios.innerHTML = `
      <div class="alert alert-warning">
        Erro ao carregar diários. Recarregue a página.
      </div>
    `;
  }
}

// ========== FUNÇÕES DE CRIAÇÃO ========== //

async function criarMestre() {
  const nome = elementos.mestreNomeInput.value.trim();
  if (!nome) {
    alert('Nome do mestre é obrigatório');
    return;
  }

  try {
    await createMestre(nome);
    elementos.formMestre.reset();
    bootstrap.Modal.getInstance(elementos.modalMestre).hide();
    await carregarMestres();
  } catch (error) {
    alert('Erro ao criar mestre: ' + error.message);
  }
}

async function criarCampanha(event) {
  event.preventDefault();
  
  const modal = elementos.modalCampanha;
  const mestreId = modal.getAttribute('data-mestre-id'); 
  const titulo = elementos.campanhaTituloInput.value.trim();
  const sistema = elementos.campanhaSistemaInput.value.trim();

  if (!titulo || !sistema) {
    alert('Por favor, preencha todos os campos!');
    return;
  }

  try {
    const submitBtn = modal.querySelector('[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    submitBtn.disabled = true;

    await createCampanha({
      mestreDocId: mestreId,
      sistema,
      titulo
    });

    elementos.formCampanha.reset();
    bootstrap.Modal.getInstance(modal).hide();
    
    const container = document.querySelector(`[data-mestre-id="${mestreId}"] .campanhas-container`);
    if (container) {
      await carregarCampanhas(mestreId, container);
    }

  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    alert('Erro: ' + error.message.replace("mestreDocId, ", ""));
  } finally {
    const submitBtn = modal.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
      submitBtn.disabled = false;
    }
  }
}

async function criarPersonagem(event) {
  event.preventDefault();
  
  const submitButton = elementos.formPersonagem.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    const modal = elementos.modalPersonagem;
    const mestreId = modal.getAttribute('data-mestre-id');
    const campanhaId = modal.getAttribute('data-campanha-id');
    const nome = elementos.personagemNomeInput.value.trim();
    const classe = elementos.personagemClasseInput.value.trim();
    const jogador = elementos.personagemPlayerInput.value.trim();

    if (!nome || !classe || !jogador) {
      throw new Error('Por favor, preencha todos os campos');
    }

    sessionStorage.setItem('ultimoEstado', JSON.stringify({
      mestreId,
      campanhaId,
      action: 'personagem-criado'
    }));

    await createPersonagem(mestreId, campanhaId, { 
      nome, 
      classe,
      playerName: jogador 
    });

    bootstrap.Modal.getInstance(modal).hide();
    window.location.reload();

  } catch (error) {
    console.error('Erro ao criar personagem:', error);
    alert(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fas fa-save"></i> Salvar';
  }
}

async function criarDiario(event) {
  event.preventDefault();
  
  const modal = elementos.modalDiario;
  const mestreId = modal.getAttribute('data-mestre-id');
  const campanhaId = modal.getAttribute('data-campanha-id');
  const personagemId = modal.getAttribute('data-personagem-id');
  const ano = elementos.diarioAnoInput.value.trim();
  const conteudo = elementos.diarioConteudoInput.value.trim();

  try {
    if (ano) {
      const diariosExistentes = await getDiariosByPersonagem(mestreId, campanhaId, personagemId);
      const anoExistente = diariosExistentes.some(diario => diario.ano === ano);
      
      if (anoExistente) {
        alert('Já existe um diário com este ano para este personagem!');
        return;
      }
    }

    await createDiario(mestreId, campanhaId, personagemId, {
      ano: ano || null,
      conteudo
    });
    
    elementos.formDiario.reset();
    await carregarDiariosModal(personagemId, mestreId, campanhaId);
    alert('Diário criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar diário:', error);
    alert('Erro ao criar diário: ' + error.message);
  }
}


// ========== CONFIGURAÇÃO DE EVENTOS ========== //

function configurarEventos() {
  // Formulários
  elementos.formMestre?.addEventListener('submit', (e) => {
    e.preventDefault();
    criarMestre();
  });
  
  elementos.formCampanha?.addEventListener('submit', (e) => {
    e.preventDefault();
    criarCampanha();
  });
  
  elementos.formDiario?.addEventListener('submit', function(e) {
    e.preventDefault();
    criarDiario(e);
  });

  // Modais
  elementos.modalCampanha?.addEventListener('show.bs.modal', (e) => {
    const button = e.relatedTarget;
    const mestreId = button.getAttribute('data-mestre-id');
    
    elementos.modalCampanha.setAttribute('data-mestre-id', mestreId);
  });
  
  elementos.formCampanha?.addEventListener('submit', (e) => {criarCampanha(e);
  });
  
  elementos.modalPersonagem?.addEventListener('show.bs.modal', (e) => {
    const button = e.relatedTarget;
    const mestreId = button.getAttribute('data-mestre-id');
    const campanhaId = button.getAttribute('data-campanha-id');
    
    elementos.modalPersonagem.setAttribute('data-mestre-id', mestreId);
    elementos.modalPersonagem.setAttribute('data-campanha-id', campanhaId);
  });

  elementos.formPersonagem?.addEventListener('submit', criarPersonagem);
  
  elementos.modalDiario?.addEventListener('show.bs.modal', function(e) {
    const button = e.relatedTarget;
    
    const mestreId = button.getAttribute('data-mestre-id');
    const campanhaId = button.getAttribute('data-campanha-id');
    const personagemId = button.getAttribute('data-personagem-id');
  
    this.setAttribute('data-mestre-id', mestreId);
    this.setAttribute('data-campanha-id', campanhaId);
    this.setAttribute('data-personagem-id', personagemId);
  
    const btnVerTodos = this.querySelector('#btnVerTodosDiarios');
    if (btnVerTodos) {
      btnVerTodos.href = `/pages/diario.html?mestreId=${mestreId}&campanhaId=${campanhaId}&personagemId=${personagemId}`;
    }
  
    carregarDiariosModal(personagemId, mestreId, campanhaId);
  });
}

// ========== INICIALIZAÇÃO ========== //

document.addEventListener('DOMContentLoaded', async () => {
  configurarEventos();
  const ultimoEstado = JSON.parse(sessionStorage.getItem('ultimoEstado'));
  
  if (ultimoEstado && ultimoEstado.action === 'personagem-criado') {
    await carregarMestres(ultimoEstado.mestreId, ultimoEstado.campanhaId);
  } else {
    await carregarMestres();
  }
});
