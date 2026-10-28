require('dotenv').config();
const sql = require('mssql');

async function testConnection() {
    try {
        await sql.connect(process.env.CONNECTION_STRING);
        console.log('Conexão com SQL Server estabelecida com sucesso!');

        // Executa uma consulta simples para testar
        const result = await sql.query`SELECT * FROM Categorias`;
        console.log('Resultado da consulta de teste:', result.recordset);

        // Testa SYSTEM_USER() para auditoria
        const userResult = await sql.query('SELECT SUSER_NAME() AS CurrentUser');
        console.log('Usuário atual no banco (SUSER_NAME()):', userResult.recordset[0].CurrentUser);

        await sql.close();
        console.log('Conexão fechada.');
    } catch (err) {
        console.error('Falha na conexão com SQL Server:', err.message);
    }
}

testConnection();