function getMestrePath(mestreId) {
  return `mestres/${mestreId}`;
}

function getCampanhaPath(mestreId, campanhaId) {
  return `mestres/${mestreId}/campanhas/${campanhaId}`;
}

function getPersonagemPath(mestreId, campanhaId, personagemId) {
  return `mestres/${mestreId}/campanhas/${campanhaId}/personagens/${personagemId}`;
}

function getDiariosPath(mestreId, campanhaId, personagemId) {
  return `mestres/${mestreId}/campanhas/${campanhaId}/personagens/${personagemId}/diarios`;
}

window.firestoreUtils = {
  getMestrePath,
  getCampanhaPath,
  getPersonagemPath,
  getDiariosPath
};
