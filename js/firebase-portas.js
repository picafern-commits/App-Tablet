window.portasData = [];
window.portaSelecionada = null;

function renderPortas(lista = []){

    const container = document.getElementById('listaPortas');
    if(!container) return;

    container.innerHTML = '';

    if(!Array.isArray(lista)){
        console.warn('Lista portas inválida', lista);
        lista = [];
    }

    window.portasData = lista.map((item)=>{

        if(item.data && typeof item.data === 'function'){
            return {
                firebaseId: item.id,
                ...item.data()
            };
        }

        return {
            firebaseId:
                item.firebaseId ||
                item.idDoc ||
                item.id ||
                '',
            ...item
        };

    });

    window.portasData.sort((a,b)=>
        String(a.porta || '').localeCompare(
            String(b.porta || ''),
            undefined,
            { numeric:true }
        )
    );

    window.portasData.forEach((porta)=>{

        const card = document.createElement('div');

        // FIX LAYOUT
        card.className = 'pc-card stock-card pistola-card-layout porta-card';

        card.innerHTML = `
            <div class="status-dot"></div>

            <div class="pc-name">${porta.porta || '-'}</div>

            <div>IP: ${porta.ip || '-'}</div>
            <div>Local: ${porta.local || '-'}</div>

            <div class="item-actions">

                <button
                    class="action-btn"
                    onclick="editarPorta('${porta.firebaseId}')"
                >
                    Editar
                </button>

                <button
                    class="action-btn"
                    onclick="verMaisPorta('${porta.firebaseId}')"
                >
                    Ver Mais
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="apagarPorta('${porta.firebaseId}')"
                >
                    Apagar
                </button>

            </div>
        `;

        container.appendChild(card);

    });

    console.log('PORTAS REALTIME FIX OK');

}

function iniciarPortas(){

    if(!window.db){
        console.error('Firebase DB indisponível');
        return;
    }

    localStorage.removeItem('portas');
    localStorage.removeItem('portasRede');

    window.db.collection('portas')
    .onSnapshot((snapshot)=>{

        const lista = [];

        snapshot.forEach((doc)=>{
            lista.push({
                firebaseId: doc.id,
                ...doc.data()
            });
        });

        renderPortas(lista);

    }, (err)=>{
        console.error(err);
    });

}

window.editarPorta = function(id){

    const porta = window.portasData.find(
        p => String(p.firebaseId) === String(id)
    );

    if(!porta){
        alert('Porta não encontrada');
        return;
    }

    window.portaSelecionada = porta;

    const a = document.getElementById('editPorta');
    const b = document.getElementById('editLocal');
    const c = document.getElementById('editUser');
    const d = document.getElementById('editEquipamento');
    const e = document.getElementById('editIP');

    if(a) a.value = porta.porta || '';
    if(b) b.value = porta.local || '';
    if(c) c.value = porta.user || '';
    if(d) d.value = porta.equipamento || '';
    if(e) e.value = porta.ip || '';

    const modal = document.getElementById('modalEditarPorta');

    if(modal){
        modal.style.display = 'flex';
    }

};

window.guardarEdicaoPorta = async function(){

    try{

        // NOVA PORTA
        if(!window.portaSelecionada){

            await window.adicionarNovaPorta();
            return;

        }

        const id = window.portaSelecionada.firebaseId;

        if(!id){
            alert('ID Firebase inválido');
            return;
        }

        const dados = {
            porta: document.getElementById('editPorta')?.value || '',
            local: document.getElementById('editLocal')?.value || '',
            user: document.getElementById('editUser')?.value || '',
            equipamento: document.getElementById('editEquipamento')?.value || '',
            ip: document.getElementById('editIP')?.value || ''
        };

        await window.db
        .collection('portas')
        .doc(String(id))
        .set(dados, { merge:true });

        const modal = document.getElementById('modalEditarPorta');

        if(modal){
            modal.style.display = 'none';
        }

        console.log('PORTAS SAVE FIX OK');

        alert('Porta atualizada com sucesso');

    }catch(err){

        console.error(err);
        alert('Erro ao guardar edição');

    }

};

window.verMaisPorta = function(id){

    const porta = window.portasData.find(
        p => String(p.firebaseId) === String(id)
    );

    if(!porta){
        alert('Porta não encontrada');
        return;
    }

    alert(
        'Porta: ' + (porta.porta || '-') + '\n' +
        'IP: ' + (porta.ip || '-') + '\n' +
        'Local: ' + (porta.local || '-')
    );

};

window.apagarPorta = async function(id){

    try{

        if(!confirm('Deseja apagar esta porta?')){
            return;
        }

        await window.db
        .collection('portas')
        .doc(String(id))
        .delete();

        alert('Porta apagada');

    }catch(err){

        console.error(err);
        alert('Erro ao apagar');

    }

};

window.adicionarNovaPorta = async function(){

    try{

        const dados = {

            porta:
                document.getElementById('editPorta')?.value || '',

            local:
                document.getElementById('editLocal')?.value || '',

            user:
                document.getElementById('editUser')?.value || '',

            equipamento:
                document.getElementById('editEquipamento')?.value || '',

            ip:
                document.getElementById('editIP')?.value || ''

        };

        await window.db.collection('portas').add(dados);

        const modal = document.getElementById('modalEditarPorta');

        if(modal){
            modal.style.display = 'none';
        }

        window.portaSelecionada = null;

        alert('Porta adicionada com sucesso');

    }catch(err){

        console.error(err);
        alert('Erro ao adicionar porta');

    }

};

document.addEventListener('DOMContentLoaded', iniciarPortas);
