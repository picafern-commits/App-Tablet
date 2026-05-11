import { db } from './config.js';

export function ouvirPortas(callback){
  return db.collection('portas').onSnapshot((snapshot)=>{
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
