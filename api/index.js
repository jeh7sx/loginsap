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
app.post('/api/cadastro', async (req, res) => {
    try {
        // 1. Buscar CSRF Token + Cookie (OBRIGATÓRIO pro SAP)
        const tokenRes = await axios.get(SAP_BASE_URL, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': 'fetch',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const csrfToken = tokenRes.headers['x-csrf-token'];
        const sessionCookie = tokenRes.headers['set-cookie'];

        // ⚠️ Garantir que o cookie está no formato certo
        const cookie = Array.isArray(sessionCookie)
            ? sessionCookie.join(';')
            : sessionCookie;

        // 2. Enviar cadastro pro SAP
        const response = await axios.post(
            `${SAP_BASE_URL}/${ENTITY_SET}`,
            req.body,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'x-csrf-token': csrfToken,
                    'Cookie': cookie,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            }
        );

        // 3. Retornar resposta
        res.status(201).json(response.data.d);

    } catch (error) {
        console.error("❌ Erro detalhado SAP:",
            error.response ? error.response.data : error.message
        );

        res.status(500).json({
            error: error.response?.data || 'Erro ao cadastrar no SAP'
        });
    }
});
// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;
