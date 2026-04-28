const express = require('express');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SAP_BASE_URL = 'https://undaunted-overhear-landmass.ngrok-free.dev/sap/opu/odata/sap/ZLOGINTSTOD_SRV_01';
const ENTITY_SET = 'loginTstSet';
const AUTH_HEADER = 'Basic ZGV2ZWxvcGVyOmV0ZWNhbXA=';

//
// 🔐 LOGIN (SEGURO)
//
app.post('/api/login', async (req, res) => {
    try {
        const { login, senha } = req.body;

        if (!login || !senha) {
            return res.status(400).json({ error: "Preencha todos os campos" });
        }

        const response = await axios.get(
            `${SAP_BASE_URL}/${ENTITY_SET}?$format=json`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'ngrok-skip-browser-warning': 'true'
                }
            }
        );

        const users = response.data.d.results;

        const user = users.find(u =>
            u.Cpf === login ||
            u.Email?.toLowerCase() === login.toLowerCase()
        );

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // 🔐 comparar senha criptografada
        const senhaValida = await bcrypt.compare(senha, user.Senha);

        if (!senhaValida) {
            return res.status(401).json({ error: "Senha incorreta" });
        }

        // ❌ remover senha antes de enviar
        delete user.Senha;

        res.json(user);

    } catch (error) {
        console.error("Erro login:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

//
// 📝 CADASTRO
//
app.post('/api/cadastro', async (req, res) => {
    try {
        const { Cpf, Email, Nome, Senha } = req.body;

        if (!Cpf || !Email || !Nome || !Senha) {
            return res.status(400).json({ error: "Preencha todos os campos" });
        }

        // 1. Buscar usuários existentes
        const listRes = await axios.get(
            `${SAP_BASE_URL}/${ENTITY_SET}?$format=json`,
            {
                headers: {
                    'Authorization': AUTH_HEADER,
                    'ngrok-skip-browser-warning': 'true'
                }
            }
        );

        const users = listRes.data.d.results;

        // 🔒 CPF único
        const existeCpf = users.find(u => u.Cpf === Cpf);
        if (existeCpf) {
            return res.status(400).json({ error: "CPF já cadastrado" });
        }

        // 🔒 EMAIL único
        const existeEmail = users.find(u =>
            u.Email?.toLowerCase() === Email.toLowerCase()
        );
        if (existeEmail) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }

        // 🔐 criptografar senha
        const senhaHash = await bcrypt.hash(Senha, 10);

        const payload = {
            Cpf,
            Email,
            Nome,
            Senha: senhaHash
        };

        // 2. Buscar CSRF Token
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

        // 3. Enviar pro SAP
        const response = await axios.post(
            `${SAP_BASE_URL}/${ENTITY_SET}`,
            payload,
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

// app.listen(3000, () => console.log(`🚀 http://localhost:3000`));
module.exports = app;
