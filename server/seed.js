import { getDb, initDb } from './db.js';
import { hashPassword } from './auth.js';

export function seedIfEmpty(customDb = null) {
  const db = customDb || getDb();
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (countRow && countRow.count > 0) {
    return { seeded: false };
  }

  const defaultPass = hashPassword('archive123');

  const insertUser = db.prepare(
    `INSERT INTO users (username, email, display_name, password_hash, bio)
     VALUES (?, ?, ?, ?, ?)`
  );

  const aldricId = insertUser.run(
    'aldric',
    'aldric@archive.rpg',
    'Mestre Aldric Vance',
    defaultPass,
    'Arquivista-Mor e Mestre de Jogo dos Reinos de Valdoria. Guardião das crônicas da campanha desde a Terceira Era.'
  ).lastInsertRowid;

  const elenaId = insertUser.run(
    'elena',
    'elena@archive.rpg',
    'Elena Thorne',
    defaultPass,
    'Cronista de mistérios divinos, curandeira dedicada do grupo e colecionadora de mapas esquecidos.'
  ).lastInsertRowid;

  const kaelenId = insertUser.run(
    'kaelen',
    'kaelen@archive.rpg',
    'Kaelen Ashwood',
    defaultPass,
    'Estrategista de vanguarda e entusiasta de fortalezas anãs e masmorras perigosas.'
  ).lastInsertRowid;

  const insertTable = db.prepare(
    `INSERT INTO rpg_tables (name, description, system, era_label, status, owner_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const valdoriaTableId = insertTable.run(
    'A Coroa de Cinzas de Valdoria',
    'Após a Ruptura de Solis, uma comitiva de companheiros juramentados atravessa as fronteiras devastadas de Valdoria para recuperar os fragmentos da Coroa de Cinzas antes que o Sínodo de Obsidiana reivindique o trono.',
    'Dungeons & Dragons 5e',
    'Ano 1042 do Terceiro Sol',
    'active',
    aldricId
  ).lastInsertRowid;

  const crewTableId = insertTable.run(
    'Viagem do Brigantine Luz Estelar',
    'As crônicas marítimas da tripulação do Brigantine Luz Estelar enquanto cartografam o Arquipélago despedaçado, enfrentando leviatãs, bloqueios imperiais e antigas cidadelas submersas.',
    'Fantasia Naval & Aventura',
    'Era das Velas • 418 d.E.',
    'active',
    elenaId
  ).lastInsertRowid;

  const insertMember = db.prepare(
    `INSERT INTO table_members (table_id, user_id, role) VALUES (?, ?, ?)`
  );
  insertMember.run(valdoriaTableId, elenaId, 'chronicler');
  insertMember.run(valdoriaTableId, kaelenId, 'player');
  insertMember.run(crewTableId, aldricId, 'co-gm');

  const insertChar = db.prepare(
    `INSERT INTO characters (table_id, user_id, name, title, avatar_url, biography, gender, race, character_class, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const seraphinaId = insertChar.run(
    valdoriaTableId,
    elenaId,
    'Seraphina Vale',
    'Guardiã do Relicário das Cinzas',
    null,
    `Nascida sob os pináculos prateados de Aethelgard, Seraphina passou a juventude transcrevendo códices iluminados no Santuário da Aurora.\n\nQuando as tempestades de cinzas engoliram as abadias do leste, ela empunhou o turíbulo sagrado e a maça de guerra de São Calen. Embora serena no falar, permanece inabalável diante da sombra, registrando meticulosamente cada presságio e sacrifício feito pela comitiva.`,
    'Feminino',
    'Alta Elfa',
    'Clériga',
    '2026-10-01T14:00:00Z'
  ).lastInsertRowid;

  const thorneId = insertChar.run(
    valdoriaTableId,
    kaelenId,
    'Thorne Ironbrow',
    'Escudo das Estradas Profundas',
    null,
    `Descendente exilado do Clã Ironbrow, da cidadela subterrânea de Karak-Vorn. Thorne prestou o Juramento dos Anciões após testemunhar a queda dos Portões Inferiores.\n\nEle carrega um martelo de guerra rúnico ancestral e um caderno de couro gasto onde anota tanto as dívidas saldadas quanto os companheiros salvos em combate.`,
    'Masculino',
    'Anão da Montanha',
    'Paladino',
    '2026-10-02T16:30:00Z'
  ).lastInsertRowid;

  const vaelenId = insertChar.run(
    valdoriaTableId,
    aldricId,
    'Vaelen Whisperwind',
    'Arauto da Pena de Prata',
    null,
    `Outrora emissário nas Cidadelas de Veludo, Vaelen trocou a intriga palaciana pelas estradas perigosas após descobrir uma profecia censurada nos Arquivos Reais.\n\nArmado com um alaúde de teixo ressonante e um tinteiro encantado que jamais seca, Vaelen compõe baladas de bravura enquanto preserva a verdadeira história de Valdoria.`,
    'Não-binário',
    'Tiefling',
    'Bardo',
    '2026-10-03T18:00:00Z'
  ).lastInsertRowid;

  const cassianId = insertChar.run(
    crewTableId,
    elenaId,
    'Capitão Cassian Vane',
    'Intendente das Brumas',
    null,
    `Ex-cartógrafo do Almirantado Real que assumiu o comando do Brigantine Luz Estelar quando o ministério ordenou a queima das cartas náuticas das Ilhas Exteriores.\n\nCassian guarda o Diário da Tripulação sob chave de bronze na cabine de popa, relatando cada recife, motim e presságio estelar.`,
    'Masculino',
    'Humano',
    'Patrulheiro Corsário',
    '2026-10-05T19:00:00Z'
  ).lastInsertRowid;

  const insertEntry = db.prepare(
    `INSERT INTO diary_entries (character_id, author_id, title, content, session_label, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  insertEntry.run(
    seraphinaId,
    elenaId,
    'Os Sinos de Oakhaven Silenciam',
    `Alcançamos as paliçadas de Oakhaven três horas após as vésperas, apenas para encontrar as fogueiras de vigília apagadas e o sino de bronze da capela rachado sobre o calçamento.\n\nThorne ajoelhou-se próximo à forja e identificou as marcas de fogo de obsidiana. No porão sob a botica, encontramos três sobreviventes segurando um pergaminho chamuscado com o selo do Arconte Malakor.\n\nCuidei de seus ferimentos durante toda a vigília noturna. Antes do amanhecer, sepultamos o guardião caído sob o carvalho branco e juramos sobre o Relicário das Cinzas que sua vigília jamais será esquecida.`,
    'Sessão I • 14 de Queda da Geada, 1042',
    '2026-10-10T20:00:00Z',
    '2026-10-10T20:00:00Z'
  );

  insertEntry.run(
    seraphinaId,
    elenaId,
    'Sussurros no Relicário Submerso',
    `Sob as criptas alagadas de São Judas, nossas tochas bruxuleavam em um tom azul-pálido. Vaelen decifrou a inscrição em Alto Valdoriano entalhada sobre o arco do ossuário: "Apenas a lâmina contrita pode abrir o véu."\n\nQuando os cavaleiros espectrais ergueram-se das águas escuras, a luz do Coro da Aurora respondeu à minha prece, reduzindo suas alabardas enferrujadas a cinzas. Dentro do sarcófago de alabastro repousava o primeiro fragmento da Coroa — morno ao toque, vibrando como um cântico distante.`,
    'Sessão II • 21 de Queda da Geada, 1042',
    '2026-10-18T21:15:00Z',
    '2026-10-18T21:15:00Z'
  );

  insertEntry.run(
    thorneId,
    kaelenId,
    'Um Juramento Provado no Desfiladeiro do Corvo',
    `Meu braço do escudo ainda lateja após a emboscada no Desfiladeiro do Corvo. Doze mercenários da Presa de Ferro bloquearam a ponte suspensa, exigindo o fragmento do relicário.\n\nFinquei minhas botas entre Seraphina e os virotes de besta e invoquei as antigas runas de Karak-Vorn. Embora dois disparos tenham perfurado minha ombreira, sustentamos a estreita passagem de madeira até que o acorde trovejante de Vaelen despedaçou a formação inimiga. Nenhum anão do Clã Ironbrow cede uma ponte enquanto seus companheiros ainda respiram.`,
    'Sessão II • 21 de Queda da Geada, 1042',
    '2026-10-19T11:30:00Z',
    '2026-10-19T11:30:00Z'
  );

  insertEntry.run(
    vaelenId,
    aldricId,
    'A Balada das Três Lanternas',
    `Na Estalagem do Viajante, em Greyford, transcrevi o relato do balseiro cego. Segundo sua memória, três lanternas foram levadas através do Rio Lete na noite em que o velho rei desapareceu.\n\nCopiei a cifra nas margens deste fólio. Caso nossa comitiva vacile nos Ermos do Norte, que qualquer cronista que leia este diário procure pelo terceiro arco do aqueduto em ruínas.`,
    'Sessão III • 2 de Crepúsculo Solar, 1042',
    '2026-10-25T22:00:00Z',
    '2026-10-25T22:00:00Z'
  );

  insertEntry.run(
    cassianId,
    elenaId,
    'Diário da Tripulação: Atravessando os Baixios das Sereias',
    `Vento NNO a quatorze nós. A agulha da bússola girou desgovernada quando passamos pelos pilares de basalto dos Baixios das Sereias.\n\nPor ordem do intendente, toda a tripulação selou os ouvidos com cera de abelha e amarrou o leme. À meia-noite, luzes fosforescentes dançaram sob nossa quilha — ruínas antigas de um porto pré-imperial brilhando a trinta braças de profundidade. Lançamos a sonda e recuperamos um astrolábio de bronze gravado com constelações desconhecidas no hemisfério norte.`,
    'Diário de Bordo I • 8 da Maré Alta',
    '2026-10-27T19:45:00Z',
    '2026-10-27T19:45:00Z'
  );

  return { seeded: true };
}

// Allow direct CLI execution: `node server/seed.js`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  initDb();
  const res = seedIfEmpty();
  console.log(res.seeded ? 'Banco de dados populado com as crônicas iniciais do Arquivo.' : 'O banco de dados já possui registros.');
}
