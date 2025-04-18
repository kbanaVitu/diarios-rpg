import { getCollection } from '../../firebase/firebase-utils';

// Busca todos os mestres ordenados por ID
export const getMestres = async () => {
  const mestres = await getCollection('mestres');
  return mestres.sort((a, b) => a.MestreId - b.MestreId);
};

// Busca um mestre específico por ID Firestore, esse provavelmente nao vamo usar, mas tai
export const getMestreById = async (id) => {
  const docSnap = await getDoc(doc(db, 'mestres', id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
