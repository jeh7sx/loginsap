const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// const SAP_BASE_URL = 'http://127.0.0.1:8000/sap/opu/odata/sap/ZLOGINTSTOD_SRV_01';
const SAP_BASE_URL = 'https://undaunted-overhear-landmass.ngrok-free.dev/sap/opu/odata/sap/ZLOGINTSTOD_SRV_01';
const ENTITY_SET = 'loginTstSet';
const AUTH_HEADER = 'Basic ' + Buffer.from('developer:etecamp').toString('base64');

// Rota para Login (Busca por Nome)
app.get('/api/login/:nome', async (req, res) => {
    try {
    const nomeDigitado = req.params.nome.toLowerCase().replace(/\s/g, ''); // Remove espaços do que foi digitado
    
    // 1. Buscamos a lista SEM filtro Nome para evitar o problema do 'eq'
    const url = `${SAP_BASE_URL}/${ENTITY_SET}?$format=json`;
    
    const response = await axios.get(url, {
        headers: {
            'Authorization': AUTH_HEADER,
            'ngrok-skip-browser-warning': 'true'
        }
    });

    const results = response.data.d.results;

    // 2. Procuramos o usuário na lista manualmente
    // Isso ignora espaços do SAP e do que foi digitado
    const usuarioEncontrado = results.find(u => {
        const nomeSap = u.Nome.toLowerCase().replace(/\s/g, '');
        return nomeSap === nomeDigitado;
    });

    if (usuarioEncontrado) {
        res.json(usuarioEncontrado);
    } else {
        res.status(404).json({ error: 'Usuário não encontrado' });
    }
} catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor' });
}
});
// Rota para Cadastro
// app.post('/api/cadastro', async (req, res) => {
//     try {
//         console.log("Iniciando tentativa de cadastro para:", req.body.Nome);

//         // 1. Handshake para obter Token e Cookies de Sessão
//         const handshake = await axios.get(SAP_BASE_URL, {
//             headers: {
//                 'Authorization': AUTH_HEADER,
//                 'x-csrf-token': 'fetch',
//                 'ngrok-skip-browser-warning': 'true'
//             }
//         });

//         const csrfToken = handshake.headers['x-csrf-token'];
//         const cookies = handshake.headers['set-cookie']; // Array de cookies

//         if (!csrfToken) {
//             console.error("ERRO: SAP não enviou o token x-csrf-token.");
//             return res.status(500).json({ error: "Erro de segurança: Token ausente." });
//         }

//         // 2. Envio do POST com os cookies da sessão anterior
//         const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, req.body, {
//             headers: {
//                 'Authorization': AUTH_HEADER,
//                 'x-csrf-token': csrfToken,
//                 // Importante: transformar o array de cookies em uma string única separada por ';'
//                 'Cookie': cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '',
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//                 'ngrok-skip-browser-warning': 'true'
//             }
//         });

//         console.log("✅ Cadastro realizado com sucesso no SAP!");
//         res.status(201).json(response.data.d);

//     } catch (error) {
//         // --- LOG DE ERRO DETALHADO ---
//         if (error.response) {
//             console.error("❌ Erro no SAP. Status:", error.response.status);
//             // Se o erro for 403, o problema é o Token ou Cookie
//             // Se for 400, o problema são os dados enviados (campos errados)
//             console.error("Detalhes do erro:", JSON.stringify(error.response.data));
//         } else {
//             console.error("❌ Erro de conexão:", error.message);
//         }
//         res.status(500).json({ error: 'Erro ao cadastrar no SAP. Verifique o terminal.' });
//     }
// });

// app.post('/api/cadastro', async (req, res) => {
//     try {
//         // 1. Handshake para buscar o Token e a Sessão (Cookies)
//         const handshake = await axios.get(SAP_BASE_URL, {
//             headers: {
//                 'Authorization': AUTH_HEADER,
//                 'x-csrf-token': 'fetch',
//                 'ngrok-skip-browser-warning': 'true'
//             }
//         });

//         // Pegamos o token e TODOS os cookies retornados
//         const csrfToken = handshake.headers['x-csrf-token'];
//         const cookies = handshake.headers['set-cookie']; 

//         // 2. Montamos o payload exatamente como no seu teste de sucesso
//         const payload = {
//             Id: "00000000", // Conforme seu teste no Gateway Client
//             Nome: req.body.Nome,
//             Senha: req.body.Senha
//         };

//         // 3. Enviamos o POST com a "assinatura" completa (Token + Cookies)
//         const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, payload, {
//             headers: {
//                 'Authorization': AUTH_HEADER,
//                 'x-csrf-token': csrfToken,
//                 'Cookie': cookies ? cookies.join('; ') : '', // Isso mantém a sessão viva
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json'
//             }
//         });

//         res.status(201).json(response.data.d);

//     } catch (error) {
//         // Log para você ver na Vercel o motivo exato do 500
//         if (error.response) {
//             console.error("Status do SAP:", error.response.status);
//             console.error("Erro detalhado:", JSON.stringify(error.response.data));
//         }
//         res.status(500).json({ error: 'Erro interno ao comunicar com o SAP' });
//     }
// });

app.post('/api/cadastro', async (req, res) => {
    try {
        // 1. Handshake (Token e Cookies)
        const handshake = await axios.get(SAP_BASE_URL, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': 'fetch',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const csrfToken = handshake.headers['x-csrf-token'];
        const cookies = handshake.headers['set-cookie'];

        // 2. Payload - EXATAMENTE como o SAP quer (Case Sensitive)
       const payload = {
            Id: req.body.Id, // O ID digitado pelo usuário
            Nome: req.body.Nome,
            Senha: req.body.Senha
        };

        // 3. O POST com um header extra de segurança
        const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, payload, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': csrfToken,
                'Cookie': cookies ? cookies.join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest' // Header extra para evitar bloqueios
            }
        });

        res.status(201).json(response.data.d);

    } catch (error) {
        // ESSENCIAL: Se der 500, esse log abaixo vai te salvar
        if (error.response) {
            console.error("STATUS SAP:", error.response.status);
            // Aqui o SAP explica o porquê do 500 (pode ser formato de número, etc)
            console.error("DETALHE DO ERRO:", JSON.stringify(error.response.data));
        }
        res.status(500).json({ error: 'Erro no servidor SAP2' });
    }
});
// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;
