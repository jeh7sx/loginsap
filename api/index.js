const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// const SAP_BASE_URL = 'http://127.0.0.1:8000/sap/opu/odata/sap/ZLOGINTSTOD_SRV_01';
const SAP_BASE_URL = 'https://undaunted-overhear-landmass.ngrok-free.dev/sap/opu/odata/sap/ZLOGINTSTOD_SRV_01';
const ENTITY_SET = 'loginTstSet';
// const AUTH_HEADER = 'Basic ' + Buffer.from('developer:etecamp').toString('base64');
const AUTH_HEADER = 'Basic ZGV2ZWxvcGVyOmV0ZWNhbXA=';

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
//        console.log("Tentando conectar ao SAP em:", SAP_BASE_URL);
//         console.log("Usando Header:", AUTH_HEADER);

//         // 1. BUSCAR O PRÓXIMO ID
//         const buscaRes = await axios.get(`${SAP_BASE_URL}/${ENTITY_SET}?$format=json`, {
//             headers: { 
//                 'Authorization': AUTH_HEADER, 
//                 'ngrok-skip-browser-warning': 'true' 
//             }
//         });
//         const usuarios = buscaRes.data.d.results;
//         let maiorId = 0;
        
//         if (usuarios.length > 0) {
//             // Pega o maior ID da lista atual
//             maiorId = Math.max(...usuarios.map(u => parseInt(u.Id)));
//         }
        
//         const novoId = String(maiorId + 1).padStart(8, '0'); // Ex: "00000015"

//         // 2. HANDSHAKE (Token e Cookies)
//         const handshake = await axios.get(SAP_BASE_URL, {
//             headers: {
//                 'Authorization': AUTH_HEADER,
//                 'x-csrf-token': 'fetch',
//                 'ngrok-skip-browser-warning': 'true'
//             }
//         });

//         const csrfToken = handshake.headers['x-csrf-token'];
//         const cookies = handshake.headers['set-cookie'];
//         // Limpeza dos cookies para evitar erro 500/403
//         const cookiesLimpos = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

//         // 3. PAYLOAD FINAL
//         const payload = {
//             Id: novoId, 
//             Nome: req.body.Nome,
//             Senha: req.body.Senha.substring(0, 8) // Garante que não passe de 8 caracteres
//         };

//         // 4. POST PARA O SAP
//         const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, payload, {
//             headers: {
//                 'Authorization': AUTH_HEADER,
//                 'x-csrf-token': csrfToken,
//                 'Cookie': cookiesLimpos,
//                 'Content-Type': 'application/json',
//                 'Accept': 'application/json',
//                 'X-Requested-With': 'XMLHttpRequest'
//             }
//         });

//         res.status(201).json(response.data.d);

//     } catch (error) {
//         if (error.response) {
//             console.error("ERRO SAP DETALHADO:", JSON.stringify(error.response.data));
//         } else {
//             console.error("ERRO CONEXÃO:", error.message);
//         }
//         res.status(500).json({ error: 'Erro ao gerar cadastro automático' });
//     }
// });

app.post('/api/cadastro', async (req, res) => {
    try {
        const headersComuns = {
            'Authorization': AUTH_HEADER.trim(),
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'application/json'
        };

        // 1. BUSCAR O PRÓXIMO ID (Usando EntitySet direto)
        const buscaRes = await axios.get(`${SAP_BASE_URL}/${ENTITY_SET}?$format=json`, {
            headers: headersComuns
        });
        
        const usuarios = buscaRes.data.d.results;
        const maiorId = usuarios.length > 0 ? Math.max(...usuarios.map(u => parseInt(u.ID || u.Id || 0))) : 0;
        const novoId = String(maiorId + 1).padStart(8, '0');

        // 2. HANDSHAKE (Token CSRF)
        // DICA: Pedimos o token direto na EntitySet, é mais garantido no SAP
        const handshake = await axios.get(`${SAP_BASE_URL}/${ENTITY_SET}?$top=1`, {
            headers: { ...headersComuns, 'x-csrf-token': 'fetch' }
        });

        const csrfToken = handshake.headers['x-csrf-token'];
        const cookies = handshake.headers['set-cookie'];
        const cookiesLimpos = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

        // 3. POST FINAL (Campos em Maiúsculo conforme SE11)
        const payload = {
            ID: novoId,
            NOME: String(req.body.Nome),
            SENHA: String(req.body.Senha).substring(0, 8)
        };

        const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, payload, {
            headers: {
                ...headersComuns,
                'x-csrf-token': csrfToken,
                'Cookie': cookiesLimpos,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        res.status(201).json(response.data.d);

    } catch (error) {
        // Esse log vai aparecer no Dashboard da Vercel
        const detalhes = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("ERRO CRÍTICO SAP:", detalhes);
        
        res.status(500).json({ 
            error: "Falha na comunicação com SAP", 
            detalhes: detalhes 
        });
    }
});
// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;
