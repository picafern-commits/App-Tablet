import { db } from './config.js';

export function ouvirUsers(callback){
  return db.collection('users').onSnapshot((snapshot)=>{
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
