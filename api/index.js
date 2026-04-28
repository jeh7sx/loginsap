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
app.get('/api/login/:login', async (req, res) => {
    try {
        const login = req.params.login.trim().toLowerCase();

        const url = `${SAP_BASE_URL}/${ENTITY_SET}?$format=json`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': AUTH_HEADER,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const users = response.data.d.results;

        const usuarioEncontrado = users.find(u => {
            const cpf = u.Cpf?.trim();
            const email = u.Email?.toLowerCase().trim();

            return cpf === login || email === login;
        });

        if (usuarioEncontrado) {
            res.json(usuarioEncontrado);
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }

    } catch (error) {
        console.error("Erro login:", error.message);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});
// Rota para Cadastro
app.post('/api/cadastro', async (req, res) => {
    try {
        // 1. Buscar usuários existentes
        const listRes = await axios.get(`${SAP_BASE_URL}/${ENTITY_SET}?$format=json`, {
            headers: {
                'Authorization': AUTH_HEADER,
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const users = listRes.data.d.results;

        const existe = users.find(u => u.Cpf === req.body.Cpf);

        if (existe) {
            return res.status(400).json({ error: "CPF já cadastrado" });
        }

        // 2. Buscar CSRF Token + Cookie
        const tokenRes = await axios.get(`${SAP_BASE_URL}/${ENTITY_SET}`, {
            headers: {
                'Authorization': AUTH_HEADER,
                'x-csrf-token': 'fetch',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        const csrfToken = tokenRes.headers['x-csrf-token'];
        const sessionCookie = tokenRes.headers['set-cookie'];

        const cookie = Array.isArray(sessionCookie)
            ? sessionCookie.join(';')
            : sessionCookie;

        // 3. Enviar cadastro
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

        res.status(201).json(response.data.d);

    } catch (error) {
        console.error("❌ ERRO SAP:", error.response?.data || error.message);

        res.status(500).json({
            error: error.response?.data || 'Erro ao cadastrar no SAP'
        });
    }
});
// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;
