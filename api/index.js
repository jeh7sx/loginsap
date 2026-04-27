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
       // const url = `${SAP_BASE_URL}/${ENTITY_SET}?$filter=Nome eq '${nomeDigitado}'&$format=json`;
        const url = `${SAP_BASE_URL}/${ENTITY_SET}?$filter=substringof('${nomeDigitado}', Nome)&$format=json`;
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
        // Use .trim() para ignorar os espaços do SAP na hora de comparar
        // if (results && results.length > 0 && results[0].Nome.trim() === nomeDigitado.trim()) {
        //     res.json(results[0]);
        // }
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
        console.log("Iniciando tentativa de cadastro para:", req.body.Nome);

        // 1. Handshake para obter Token e Cookies de Sessão
        const handshake = await axios.get(SAP_BASE_URL, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': 'fetch',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const csrfToken = handshake.headers['x-csrf-token'];
        const cookies = handshake.headers['set-cookie']; // Array de cookies

        if (!csrfToken) {
            console.error("ERRO: SAP não enviou o token x-csrf-token.");
            return res.status(500).json({ error: "Erro de segurança: Token ausente." });
        }

        // 2. Envio do POST com os cookies da sessão anterior
        const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, req.body, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': csrfToken,
                // Importante: transformar o array de cookies em uma string única separada por ';'
                'Cookie': cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        console.log("✅ Cadastro realizado com sucesso no SAP!");
        res.status(201).json(response.data.d);

    } catch (error) {
        // --- LOG DE ERRO DETALHADO ---
        if (error.response) {
            console.error("❌ Erro no SAP. Status:", error.response.status);
            // Se o erro for 403, o problema é o Token ou Cookie
            // Se for 400, o problema são os dados enviados (campos errados)
            console.error("Detalhes do erro:", JSON.stringify(error.response.data));
        } else {
            console.error("❌ Erro de conexão:", error.message);
        }
        res.status(500).json({ error: 'Erro ao cadastrar no SAP. Verifique o terminal.' });
    }
});

// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;
