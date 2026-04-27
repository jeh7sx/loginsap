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
        const nomeDigitado = req.params.nome;
        const url = `${SAP_BASE_URL}/${ENTITY_SET}?$filter=Nome eq '${nomeDigitado}'&$format=json`;
        
        const response = await axios.get(url, {
            headers: {
                'Authorization': AUTH_HEADER,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const results = response.data.d.results;

        // 1. Verifica se a lista não está vazia
        // 2. Verifica se o nome retornado é EXATAMENTE o nome digitado
        if (results && results.length > 0 && results[0].Nome === nomeDigitado) {
            res.json(results[0]);
        } else {
            res.status(404).json({ error: 'Usuário não encontrado ou filtro inválido' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro na conexão com SAP' });
    }
});
// Rota para Cadastro
app.post('/api/cadastro', async (req, res) => {
    try {
        // 1. Handshake para Token e Cookie
        const tokenRes = await axios.get(SAP_BASE_URL, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': 'fetch', // ESSENCIAL: Avisa ao SAP que você quer um token
                'ngrok-skip-browser-warning': 'true'
            }
        });

        // Captura o token e OS cookies (pode vir mais de um)
        const csrfToken = tokenRes.headers['x-csrf-token'];
        const cookies = tokenRes.headers['set-cookie']; 

        if (!csrfToken) {
            console.error("SAP não retornou token CSRF");
            return res.status(500).json({ error: 'Erro de segurança: Token não recebido' });
        }

        // 2. Envio do Cadastro
        const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, req.body, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': csrfToken,
                'Cookie': cookies ? cookies.join('; ') : '', // Garante que a sessão seja mantida
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        res.status(201).json(response.data.d);
    } catch (error) {
        // Log detalhado para você ver o erro real no terminal do VS Code
        if (error.response) {
            console.error("Erro SAP (Detalhes):", JSON.stringify(error.response.data));
            console.error("Status SAP:", error.response.status);
        } else {
            console.error("Erro de Rede/Configuração:", error.message);
        }
        res.status(500).json({ error: 'Erro ao cadastrar no SAP' });
    }
});

// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;
