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
    'Master Aldric Vance',
    defaultPass,
    'High Archivist and Game Master of the Valdorian Realms. Keeper of campaign lore since the Third Reckoning.'
  ).lastInsertRowid;

  const elenaId = insertUser.run(
    'elena',
    'elena@archive.rpg',
    'Elena Thorne',
    defaultPass,
    'Chronicler of divine mysteries, faithful party healer, and collector of forgotten maps.'
  ).lastInsertRowid;

  const kaelenId = insertUser.run(
    'kaelen',
    'kaelen@archive.rpg',
    'Kaelen Ashwood',
    defaultPass,
    'Vanguard tactician and enjoyer of dwarven strongholds and perilous dungeon delves.'
  ).lastInsertRowid;

  const insertTable = db.prepare(
    `INSERT INTO rpg_tables (name, description, system, era_label, status, owner_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const valdoriaTableId = insertTable.run(
    'The Ashen Crown of Valdoria',
    'In the wake of the Sundering of Solis, a fellowship of sworn companions journeys across the blighted marches of Valdoria to recover the shattered fragments of the Ashen Crown before the Obsidian Synod claims the throne.',
    'Dungeons & Dragons 5e',
    'Year 1042 of the Third Sun',
    'active',
    aldricId
  ).lastInsertRowid;

  const crewTableId = insertTable.run(
    'Voyage of the Starlight Brigantine',
    'The maritime chronicles of the Starlight Brigantine crew as they chart the Shattered Archipelago, braving leviathans, Imperial blockades, and ancient sunken citadels.',
    'Swashbuckling Fantasy',
    'Age of Sails • 418 AE',
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
    'Keeper of the Ember Reliquary',
    null,
    `Born beneath the silver spires of Aethelgard, Seraphina spent her youth transcribing illuminated liturgical codices inside the Sanctuary of the Dawn.\n\nWhen the ash-storms swallowed the eastern abbeys, she took up the sacred censer and war-mace of St. Calen. Though gentle in speech, she stands unyielding against the encroaching shadow, meticulously recording every omen and sacrifice made by the fellowship.`,
    'Female',
    'High Elf',
    'Cleric',
    '2026-10-01T14:00:00Z'
  ).lastInsertRowid;

  const thorneId = insertChar.run(
    valdoriaTableId,
    kaelenId,
    'Thorne Ironbrow',
    'Shield of the Deep Roads',
    null,
    `Exiled scion of Clan Ironbrow from the subterranean citadel of Karak-Vorn. Thorne swore the Oath of the Ancients after witnessing the breach of the Lower Gates.\n\nHe carries an ancestral runic warhammer and a battered leather ledger in which he tallies both grudges settled and comrades saved.`,
    'Male',
    'Mountain Dwarf',
    'Paladin',
    '2026-10-02T16:30:00Z'
  ).lastInsertRowid;

  const vaelenId = insertChar.run(
    valdoriaTableId,
    aldricId,
    'Vaelen Whisperwind',
    'Herald of the Silver Quill',
    null,
    `Once a courtly Envoy in the Velvet Citadels, Vaelen traded political intrigue for the perilous road after discovering a censored prophecy in the Royal Archives.\n\nArmed with a lute of resonant yew and an enchanted inkhorn that never freezes, Vaelen weaves songs of valor while preserving the true history of Valdoria.`,
    'Non-binary',
    'Tiefling',
    'Bard',
    '2026-10-03T18:00:00Z'
  ).lastInsertRowid;

  const cassianId = insertChar.run(
    crewTableId,
    elenaId,
    'Captain Cassian Vane',
    'Quartermaster of the Mists',
    null,
    `Former cartographer of the Royal Admiralty who commandeered the Starlight Brigantine when the ministry ordered the burning of the Outer Isles charts.\n\nCassian keeps the Diário da Tripulação under lock and brass key in the aft cabin, chronicling every reef, mutiny, and star-omen.`,
    'Male',
    'Human',
    'Corsair Ranger',
    '2026-10-05T19:00:00Z'
  ).lastInsertRowid;

  const insertEntry = db.prepare(
    `INSERT INTO diary_entries (character_id, author_id, title, content, session_label, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  insertEntry.run(
    seraphinaId,
    elenaId,
    'The Bells of Oakhaven Fall Silent',
    `We reached the palisades of Oakhaven three hours past vespers, only to find the watchfires cold and the bronze chapel bell cracked upon the cobblestones.\n\nThorne knelt beside the smithy and identified the scorch marks of obsidian hellfire. In the cellar beneath the apothecary, we discovered three survivors clutching a half-burned parchment bearing the seal of Archon Malakor.\n\nI tended to their wounds through the night watch. Before dawn, we buried the fallen warden beneath the white oak and swore upon the Ember Reliquary that his vigil would not be forgotten.`,
    'Session I • 14th of Frostfall, 1042',
    '2026-10-10T20:00:00Z',
    '2026-10-10T20:00:00Z'
  );

  insertEntry.run(
    seraphinaId,
    elenaId,
    'Whispers in the Sunken Reliquary',
    `Beneath the flooded crypts of St. Jude, our torches flickered pale blue. Vaelen deciphered the High Valdorian inscription carved above the ossuary arch: "Only the contrite blade may part the veil."\n\nWhen the wraith-knights rose from the black water, the light of the Dawn Chorus answered my prayer, turning their rusted glaives to ash. Inside the alabaster sarcophagus lay the first shard of the Crown—warm to the touch, humming like a distant choir.`,
    'Session II • 21st of Frostfall, 1042',
    '2026-10-18T21:15:00Z',
    '2026-10-18T21:15:00Z'
  );

  insertEntry.run(
    thorneId,
    kaelenId,
    'An Oath Tested at the Raven’s Gorge',
    `My shield arm still aches from the ambush at Raven’s Gorge. Twelve mercenaries of the Iron Fang blocked the suspension bridge, demanding the reliquary shard.\n\nI planted my boots between Seraphina and their crossbow bolts and called upon the ancient runes of Karak-Vorn. Though two quarrels pierced my pauldron, we held the narrow timber span until Vaelen’s thunderous chord shattered their formation. No dwarf of Clan Ironbrow yields a bridge while his companions still draw breath.`,
    'Session II • 21st of Frostfall, 1042',
    '2026-10-19T11:30:00Z',
    '2026-10-19T11:30:00Z'
  );

  insertEntry.run(
    vaelenId,
    aldricId,
    'Ballad of the Three Lanterns',
    `At the Wayfarer’s Rest in Greyford, I transcribed the testimony of the blind ferryman. According to his recollection, three lanterns were carried across the River Lethe on the night the old king vanished.\n\nI have copied the cipher into the margins of this folio. Should our company falter in the Northern Wastes, let any scribe who reads this chronicle look to the third arch of the ruined aqueduct.`,
    'Session III • 2nd of Sun’s Dusk, 1042',
    '2026-10-25T22:00:00Z',
    '2026-10-25T22:00:00Z'
  );

  insertEntry.run(
    cassianId,
    elenaId,
    'Log of the Starlight Brigantine: Crossing the Siren Shoals',
    `Wind NNW at fourteen knots. The compass needle spun wild as we passed the basalt pillars of the Siren Shoals.\n\nBy order of the quartermaster, all hands bound beeswax to their ears and lashed the helm. At midnight, phosphor lights danced beneath our keel—ancient ruins of a pre-Imperial harbor glimmering thirty fathoms below. We dropped a weighted lead-line and recovered a bronze astrolabe inscribed with constellations unseen in the northern hemisphere.`,
    'Voyage Log I • 8th of High Tide',
    '2026-10-27T19:45:00Z',
    '2026-10-27T19:45:00Z'
  );

  return { seeded: true };
}

// Allow direct CLI execution: `node server/seed.js`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  initDb();
  const res = seedIfEmpty();
  console.log(res.seeded ? 'Database seeded with Medieval Archive chronicles.' : 'Database already contains data.');
}

