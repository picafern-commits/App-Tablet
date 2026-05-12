// CK65 Firebase Service REAL

import { db } from './config.js';

export function ouvirPistolas(callback){

  return db.collection('pistolas')
    .onSnapshot((snapshot)=>{

      const lista = [];

      snapshot.forEach((doc)=>{
        lista.push({
          idDoc: doc.id,
          ...doc.data()
        });
      });

      callback(lista);

    });

}

export async function criarPistola(payload){
  return await db.collection('pistolas').add(payload);
}

export async function editarPistola(id, payload){
  return await db.collection('pistolas')
    .doc(id)
    .update(payload);
}

export async function apagarPistola(id){
  return await db.collection('pistolas')
    .doc(id)
    .delete();
}
