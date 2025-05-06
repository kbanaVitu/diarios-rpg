import { readAllDocuments, queryDocuments } from "../../firebase/firestore-crud";

// Busca TODOS os diários
export const getDiarios = async () => {
  return await readAllDocuments("diarios");
};

// Busca diários por autor (filtro)
export const getDiariosByAutor = async (autorId) => {
  return await queryDocuments("diarios", "autorId", "==", autorId);
};
