// FIREBASE USERS
// APP BRAGA
(function () {
 if (!window.db) {
   console.error("Firebase DB não encontrado");
   return;
 }
 const usersRef =
   window.db.collection("users");
 // =========================
 // FIREBASE LISTENER
 // =========================
 usersRef.onSnapshot((snapshot) => {
   const lista = [];
   snapshot.forEach((doc) => {
     lista.push({
       firebaseId: doc.id,
       ...doc.data()
     });
   });
   // ORDENAR ALFABETICAMENTE
   lista.sort((a, b) => {
     const nomeA =
       ((a.nome || "") + "")
         .toLowerCase();
     const nomeB =
       ((b.nome || "") + "")
         .toLowerCase();
     return nomeA.localeCompare(nomeB);
   });
   window.usersData = lista;
   // =========================
   // CONTADORES
   // =========================
   const totalUsers =
     lista.length;
   const totalMO365 =
     lista.filter((u) => {
       return (
         (u.user_mo365 || "").trim() !== "" ||
         (u.pw_mo365 || "").trim() !== ""
       );
     }).length;
   const totalPistola =
     lista.filter((u) => {
       return (
         (u.op_pistola || "").trim() !== "" ||
         (u.pass_pistola || "").trim() !== ""
       );
     }).length;
   const elUsers =
     document.getElementById("countUsers");
   const elMO365 =
     document.getElementById("countMO365");
   const elPistola =
     document.getElementById("countPistola");
   if (elUsers)
     elUsers.textContent = totalUsers;
   if (elMO365)
     elMO365.textContent = totalMO365;
   if (elPistola)
     elPistola.textContent = totalPistola;
   // =========================
   // RENDER
   // =========================
   if (typeof renderUsers === "function") {
     renderUsers(lista);
   }
 });
 // =========================
 // EDITAR USER
 // =========================
 window.editarUser =
   function (user) {
     window.currentEditingUserId =
       user.firebaseId;
     const setVal =
       (id, value) => {
         const el =
           document.getElementById(id);
         if (el)
           el.value = value || "";
       };
     setVal("editUser_nome", user.nome);
     setVal("editUser_zona", user.zona);
     setVal("editUser_user_pc_eye", user.user_pc_eye);
     setVal("editUser_pass_remote", user.pass_remote);
     setVal("editUser_pass_eye_peak", user.pass_eye_peak);
     setVal("editUser_op_pistola", user.op_pistola);
     setVal("editUser_pass_pistola", user.pass_pistola);
     setVal("editUser_nome_pc", user.nome_pc);
     setVal("editUser_teamviewer", user.teamviewer);
     setVal("editUser_user_mo365", user.user_mo365);
     setVal("editUser_pw_mo365", user.pw_mo365);
     setVal("editUser_email_bragalis", user.email_bragalis);
     setVal("editUser_pass_bragalis", user.pass_bragalis);
     const modal =
       document.getElementById(
         "modalEditarUser"
       );
     if (modal)
       modal.style.display = "flex";
   };
 // =========================
 // GUARDAR USER
 // =========================
 window.guardarUser =
   async function () {
     try {
       const getVal =
         (id) => {
           const el =
             document.getElementById(id);
           return el
             ? el.value.trim()
             : "";
         };
       const data = {
         nome:
           getVal("editUser_nome"),
         zona:
           getVal("editUser_zona"),
         user_pc_eye:
           getVal("editUser_user_pc_eye"),
         pass_remote:
           getVal("editUser_pass_remote"),
         pass_eye_peak:
           getVal("editUser_pass_eye_peak"),
         op_pistola:
           getVal("editUser_op_pistola"),
         pass_pistola:
           getVal("editUser_pass_pistola"),
         nome_pc:
           getVal("editUser_nome_pc"),
         teamviewer:
           getVal("editUser_teamviewer"),
         user_mo365:
           getVal("editUser_user_mo365"),
         pw_mo365:
           getVal("editUser_pw_mo365"),
         email_bragalis:
           getVal("editUser_email_bragalis"),
         pass_bragalis:
           getVal("editUser_pass_bragalis")
       };
       // EDITAR
       if (
         window.currentEditingUserId
       ) {
         await usersRef
           .doc(
             window.currentEditingUserId
           )
           .update(data);
       } else {
         // NOVO USER
         await usersRef.add(data);
       }
       const modal =
         document.getElementById(
           "modalEditarUser"
         );
       if (modal)
         modal.style.display = "none";
       window.currentEditingUserId =
         null;
       console.log(
         "User guardado"
       );
     } catch (error) {
       console.error(
         "Erro ao guardar user:",
         error
       );
     }
   };
 // =========================
 // APAGAR USER
 // =========================
 window.apagarUser =
   async function (firebaseId) {
     const confirmar =
       confirm(
         "Apagar utilizador?"
       );
     if (!confirmar)
       return;
     try {
       await usersRef
         .doc(firebaseId)
         .delete();
     } catch (error) {
       console.error(
         "Erro apagar user:",
         error
       );
     }
   };
 // =========================
 // IMPRIMIR USER
 // =========================
 window.imprimirUser =
   function (user) {
     const html = `
<html>
<head>
<title>${user.nome}</title>
<style>
           body{
             font-family: Arial;
             padding:20px;
             color:#000;
             background:#fff;
           }
           h1{
             margin-bottom:20px;
             color:#000;
           }
           p{
             margin:8px 0;
             font-size:16px;
             color:#000;
           }
           b{
             color:#000;
           }
</style>
</head>
<body>
<h1>
           ${user.nome || "-"}
</h1>
<p>
<b>Zona:</b>
           ${user.zona || "-"}
</p>
<p>
<b>User PC/EYE:</b>
           ${user.user_pc_eye || "-"}
</p>
<p>
<b>Pass Remote:</b>
           ${user.pass_remote || "-"}
</p>
<p>
<b>Pass Eye Peak:</b>
           ${user.pass_eye_peak || "-"}
</p>
<p>
<b>Op. Pistola:</b>
           ${user.op_pistola || "-"}
</p>
<p>
<b>Pass Pistola:</b>
           ${user.pass_pistola || "-"}
</p>
<p>
<b>Nome PC:</b>
           ${user.nome_pc || "-"}
</p>
<p>
<b>TeamViewer:</b>
           ${user.teamviewer || "-"}
</p>
<p>
<b>User MO365:</b>
           ${user.user_mo365 || "-"}
</p>
<p>
<b>PW MO365:</b>
           ${user.pw_mo365 || "-"}
</p>
<p>
<b>Email Bragalis:</b>
           ${user.email_bragalis || "-"}
</p>
<p>
<b>Pass Bragalis:</b>
           ${user.pass_bragalis || "-"}
</p>
</body>
</html>
     `;
     const iframe =
       document.createElement(
         "iframe"
       );
     iframe.style.position =
       "fixed";
     iframe.style.right = "0";
     iframe.style.bottom = "0";
     iframe.style.width = "0";
     iframe.style.height = "0";
     iframe.style.border = "0";
     document.body.appendChild(
       iframe
     );
     const frameDoc =
       iframe.contentWindow.document;
     frameDoc.open();
     frameDoc.write(html);
     frameDoc.close();
     setTimeout(() => {
       iframe.contentWindow.focus();
       iframe.contentWindow.print();
       setTimeout(() => {
         document.body.removeChild(
           iframe
         );
       }, 1000);
     }, 500);
   };
})();
