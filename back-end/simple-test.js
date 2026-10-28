#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sql = require('mssql');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database connection pool
let pool;

async function connectToDatabase() {
    try {
        pool = await sql.connect(process.env.CONNECTION_STRING);
        console.log('✅ Conexão com SQL Server estabelecida com sucesso!');
    } catch (err) {
        console.error('❌ Falha na conexão com SQL Server:', err.message);
        process.exit(1);
    }
}

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'API está funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: pool ? 'Connected' : 'Disconnected'
    });
});

// Start server
async function startServer() {
    await connectToDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📱 Acesse: http://localhost:${PORT}`);
        console.log(`❤️  Health check: http://localhost:${PORT}/health`);
        console.log(`🧪 Teste: http://localhost:${PORT}/test`);
    });
}

startServer().catch(console.error);