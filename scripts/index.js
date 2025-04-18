const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
  const mestresContainer = document.getElementById('mestres-container');
  const loading = document.getElementById('loading');
  const diarioContainer = document.getElementById('diario-container');

  try {
    const mestresSnapshot = await db.collection('mestres').get();

    mestresSnapshot.forEach(async (mestreDoc) => {
      const mestreData = mestreDoc.data();

      const mestreCard = document.createElement('div');
      mestreCard.className = 'mestre-card';

      const mestreNome = document.createElement('h3');
      mestreNome.className = 'mestre-nome';
      mestreNome.innerHTML = `<i class="fas fa-hat-wizard"></i>${mestreData.nome}`;
      mestreCard.appendChild(mestreNome);

      const campanhasList = document.createElement('div');
      const campanhasSnapshot = await db.collection(`mestres/${mestreDoc.id}/campanhas`).get();

      campanhasSnapshot.forEach(async (campanhaDoc) => {
        const campanhaData = campanhaDoc.data();

        const campanhaItem = document.createElement('div');
        campanhaItem.className = 'campanha-item';

        const campanhaTitulo = document.createElement('p');
        campanhaTitulo.className = 'campanha-titulo';
        campanhaTitulo.textContent = campanhaData.titulo;

        const personagensDropdown = document.createElement('div');
        personagensDropdown.className = 'personagem-dropdown';
        personagensDropdown.style.display = 'none';

        campanhaTitulo.addEventListener('click', async () => {
          personagensDropdown.innerHTML = '';

          const personagensSnapshot = await db.collection(`mestres/${mestreDoc.id}/campanhas/${campanhaDoc.id}/personagens`).get();

          personagensSnapshot.forEach((personagemDoc) => {
            const personagemData = personagemDoc.data();

            const personagemLink = document.createElement('a');
            personagemLink.className = 'personagem-link';
            personagemLink.href = '#';
            personagemLink.textContent = `${personagemData.nome} (${personagemData.classe})`;

            personagemLink.addEventListener('click', async () => {
              diarioContainer.innerHTML = '';
              diarioContainer.style.display = 'block';

              const diariosSnapshot = await db.collection(
                `mestres/${mestreDoc.id}/campanhas/${campanhaDoc.id}/personagens/${personagemDoc.id}/diarios`
              ).get();

              const diariosPorAno = {};
              diariosSnapshot.forEach((diarioDoc) => {
                const diarioData = diarioDoc.data();
                if (!diariosPorAno[diarioData.Ano]) {
                  diariosPorAno[diarioData.Ano] = [];
                }
                diariosPorAno[diarioData.Ano].push(diarioData);
              });

              for (const ano in diariosPorAno) {
                const anoHeader = document.createElement('h4');
                anoHeader.textContent = `Ano ${ano}`;
                diarioContainer.appendChild(anoHeader);

                diariosPorAno[ano].forEach((diario) => {
                  const p = document.createElement('p');
                  p.textContent = diario.Texto;
                  diarioContainer.appendChild(p);
                });
              }
            });

            personagensDropdown.appendChild(personagemLink);
          });

          personagensDropdown.style.display = 'block';
        });

        campanhaItem.appendChild(campanhaTitulo);
        campanhaItem.appendChild(personagensDropdown);
        campanhasList.appendChild(campanhaItem);
      });

      mestreCard.appendChild(campanhasList);
      mestresContainer.appendChild(mestreCard);
    });

    loading.style.display = 'none';
    mestresContainer.style.display = 'block';
  } catch (err) {
    console.error('Erro ao carregar mestres:', err);
    loading.innerHTML = '<p>Erro ao consultar os arquivos da guilda.</p>';
  }
});
