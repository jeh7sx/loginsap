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
		// Usamos filter para buscar pelo nome exato
		const url = `${SAP_BASE_URL}/${ENTITY_SET}?$filter=Nome eq '${req.params.nome}'&$format=json`;
		const response = await axios.get(url, {
			// headers: { 'Authorization': AUTH_HEADER }
			headers: {
				'Authorization': AUTH_HEADER,
				'ngrok-skip-browser-warning': 'true' // Isso pula a tela de aviso do ngrok
			}
		});

		// O OData com filter retorna uma lista (results)
		const user = response.data.d.results[0];
		if (user) {
			res.json(user);
		} else {
			res.status(404).json({ error: 'Usuário não encontrado' });
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
			// headers: { 'Authorization': AUTH_HEADER, 'x-csrf-token': 'fetch' }
			headers: {
				'Authorization': AUTH_HEADER,
				'ngrok-skip-browser-warning': 'true' // Isso pula a tela de aviso do ngrok
			}
		});

		const csrfToken = tokenRes.headers['x-csrf-token'];
		const sessionCookie = tokenRes.headers['set-cookie'];

		// 2. Envio do Cadastro
		const response = await axios.post(`${SAP_BASE_URL}/${ENTITY_SET}`, req.body, {
			headers: {
				'Authorization': AUTH_HEADER,
				'x-csrf-token': csrfToken,
				'Cookie': sessionCookie,
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		});
		res.status(201).json(response.data.d);
	} catch (error) {
		console.error("Erro SAP:", error.response ? error.response.data : error.message);
		res.status(500).json({ error: 'Erro ao cadastrar no SAP' });
	}
});

// app.listen(3000, () => console.log(`🚀 Site em http://localhost:3000`));
module.exports = app;