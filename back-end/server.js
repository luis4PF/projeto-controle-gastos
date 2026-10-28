require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sql = require('mssql');

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
        console.log('Conexão com SQL Server estabelecida com sucesso!');
    } catch (err) {
        console.error('Falha na conexão com SQL Server:', err.message);
        process.exit(1);
    }
}

// API endpoint for registering expenses
app.post('/api/gastos', async (req, res) => {
    try {
        const { descricao, valor, data, categoriaId, userId } = req.body;

        // Basic validation
        if (!descricao || !valor || !data || !categoriaId || !userId) {
            return res.status(400).json({ 
                error: 'Todos os campos são obrigatórios: descricao, valor, data, categoriaId, userId' 
            });
        }

        if (isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'O valor deve ser um número positivo' });
        }

        const result = await pool.request()
            .input('descricao', sql.NVarChar, descricao)
            .input('valor', sql.Decimal(10, 2), parseFloat(valor))
            .input('data', sql.Date, new Date(data))
            .input('categoriaId', sql.Int, categoriaId)
            .input('userId', sql.Int, userId)
            .query(`
                INSERT INTO Gastos (descricao, valor, data, categoriaId, userId, dataRegistro)
                VALUES (@descricao, @valor, @data, @categoriaId, @userId, GETDATE())
                
                SELECT SCOPE_IDENTITY() AS id
            `);

        const novoGastoId = result.recordset[0].id;

        res.status(201).json({
            success: true,
            message: 'Gasto registrado com sucesso',
            data: {
                id: novoGastoId,
                descricao,
                valor: parseFloat(valor),
                data,
                categoriaId,
                userId
            }
        });

    } catch (error) {
        console.error('Erro ao registrar gasto:', error.message);
        res.status(500).json({ 
            error: 'Erro interno ao registrar gasto',
            details: error.message 
        });
    }
});

// API endpoint to get all expenses
app.get('/api/gastos', async (req, res) => {
    try {
        const result = await pool.request()
            .query(`
                SELECT g.id, g.descricao, g.valor, g.data, g.dataRegistro, 
                       c.nome as categoriaNome, u.nome as usuarioNome
                FROM Gastos g
                LEFT JOIN Categorias c ON g.categoriaId = c.id
                LEFT JOIN Usuarios u ON g.userId = u.id
                ORDER BY g.data DESC, g.dataRegistro DESC
            `);

        res.json({
            success: true,
            data: result.recordset
        });

    } catch (error) {
        console.error('Erro ao buscar gastos:', error.message);
        res.status(500).json({ 
            error: 'Erro interno ao buscar gastos',
            details: error.message 
        });
    }
});

// API endpoint to get expense by ID
app.get('/api/gastos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT g.id, g.descricao, g.valor, g.data, g.dataRegistro, 
                       c.nome as categoriaNome, u.nome as usuarioNome
                FROM Gastos g
                LEFT JOIN Categorias c ON g.categoriaId = c.id
                LEFT JOIN Usuarios u ON g.userId = u.id
                WHERE g.id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Gasto não encontrado' });
        }

        res.json({
            success: true,
            data: result.recordset[0]
        });

    } catch (error) {
        console.error('Erro ao buscar gasto:', error.message);
        res.status(500).json({ 
            error: 'Erro interno ao buscar gasto',
            details: error.message 
        });
    }
});

// API endpoint to update expense
app.put('/api/gastos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao, valor, data, categoriaId } = req.body;

        // Basic validation
        if (!descricao || !valor || !data || !categoriaId) {
            return res.status(400).json({ 
                error: 'Todos os campos são obrigatórios: descricao, valor, data, categoriaId' 
            });
        }

        if (isNaN(valor) || valor <= 0) {
            return res.status(400).json({ error: 'O valor deve ser um número positivo' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('descricao', sql.NVarChar, descricao)
            .input('valor', sql.Decimal(10, 2), parseFloat(valor))
            .input('data', sql.Date, new Date(data))
            .input('categoriaId', sql.Int, categoriaId)
            .query(`
                UPDATE Gastos 
                SET descricao = @descricao, valor = @valor, data = @data, categoriaId = @categoriaId
                WHERE id = @id
            `);

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Gasto não encontrado' });
        }

        res.json({
            success: true,
            message: 'Gasto atualizado com sucesso',
            data: { id, descricao, valor: parseFloat(valor), data, categoriaId }
        });

    } catch (error) {
        console.error('Erro ao atualizar gasto:', error.message);
        res.status(500).json({ 
            error: 'Erro interno ao atualizar gasto',
            details: error.message 
        });
    }
});

// API endpoint to delete expense
app.delete('/api/gastos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Gastos WHERE id = @id');

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Gasto não encontrado' });
        }

        res.json({
            success: true,
            message: 'Gasto excluído com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir gasto:', error.message);
        res.status(500).json({ 
            error: 'Erro interno ao excluir gasto',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: pool ? 'Connected' : 'Disconnected'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo deu errado!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Start server
async function startServer() {
    await connectToDatabase();
    
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });
}

startServer().catch(console.error);