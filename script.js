document.addEventListener('DOMContentLoaded', async () => {
  const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTH3SZ5HU_YDQnCzaRWnPzcugxUg2xeMuSNWkZZr_gZ6CEr2kWWMNjtePC7Cx6MWkFD3gZ9r2BCmXmQ/pub?output=csv";
  const mestresContainer = document.getElementById('mestres-container');
  const loading = document.getElementById('loading');

  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error("Erro ao acessar a planilha");
    }
    const csvData = await response.text();
    const linhas = csvData.trim().split('\n').slice(1);

    const dados = linhas.map(linha => {
      const [personagem, mestre, campanha, sistema, doc_urlBruto] = linha.split(',').map(c => c.trim());
      const doc_url = doc_urlBruto.startsWith('http') ? doc_urlBruto : `https://${doc_urlBruto}`;
      return { personagem, mestre, campanha, sistema, doc_url };
    });

   
    const estrutura = {};
    dados.forEach(({ personagem, mestre, campanha, sistema, doc_url }) => {
      if (!estrutura[mestre]) estrutura[mestre] = {};
      if (!estrutura[mestre][campanha]) {
        estrutura[mestre][campanha] = { sistema, personagens: [] };
      }
      estrutura[mestre][campanha].personagens.push({ personagem, doc_url });
    });

    for (const mestre in estrutura) {
      const mestreCard = document.createElement('div');
      mestreCard.className = 'mestre-card';

      const mestreTitulo = `<div class="mestre-nome"><i class="fas fa-crown"></i> ${mestre}</div>`;
      let campanhasHTML = '';

      for (const campanha in estrutura[mestre]) {
        const dropdownId = `${mestre}-${campanha}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const { sistema, personagens } = estrutura[mestre][campanha];
        const campanhaTitulo = `<i class="fas fa-dragon"></i> ${campanha} <small>(${sistema})</small>`;
        const personagensHTML = personagens.map(p =>
          `<a href="#" class="personagem-link" onclick="carregarDiario('${p.doc_url}'); event.preventDefault();">
            <i class="fas fa-user"></i> ${p.personagem}
          </a>`
        ).join('');

        campanhasHTML += `
          <div class="campanha-item">
            <div class="campanha-titulo" onclick="toggleDropdown('${dropdownId}');">
              ${campanhaTitulo}
            </div>
            <div class="personagem-dropdown" id="${dropdownId}" style="display: none;">
              ${personagensHTML}
            </div>
          </div>
        `;
      }

      mestreCard.innerHTML = mestreTitulo + campanhasHTML;
      mestresContainer.appendChild(mestreCard);
    }

    loading.style.display = 'none';
    mestresContainer.style.display = 'block';

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    loading.innerHTML = `
      <div class="alert alert-danger">
        Falha ao carregar os diários. Verifique a planilha ou tente novamente.
      </div>
    `;
  }
});

window.toggleDropdown = function(id) {
  console.log("toggleDropdown chamado com id:", id);
  const dropdown = document.getElementById(id);
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
};

window.carregarDiario = function(url) {
  console.log("carregarDiario chamado com url:", url);
  const iframe = document.getElementById('iframe-diario');
  const container = document.getElementById('diario-container');
  if (iframe && container) {
    iframe.src = url;
    container.style.display = 'block';
    window.scrollTo({ top: container.offsetTop, behavior: 'smooth' });
  }
};

window.fecharDiario = function() {
  console.log("fecharDiario chamado");
  const iframe = document.getElementById('iframe-diario');
  const container = document.getElementById('diario-container');
  if (iframe && container) {
    iframe.src = '';
    container.style.display = 'none';
  }
};
