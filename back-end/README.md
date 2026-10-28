# API de Controle de Gastos

Esta é uma API RESTful desenvolvida com Node.js e Express.js para gerenciar gastos com integração SQL Server.

## Funcionalidades

- ✅ Registrar novos gastos
- ✅ Listar todos os gastos
- ✅ Buscar gasto por ID
- ✅ Atualizar gastos existentes
- ✅ Excluir gastos
- ✅ Validação de dados
- ✅ Segurança com Helmet e CORS
- ✅ Conexão com SQL Server

## Pré-requisitos

- Node.js (versão 14+)
- SQL Server (configurado no arquivo .env)
- npm ou yarn

## Instalação

1. Navegue até a pasta do back-end:
```bash
cd back-end
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env`:
```env
CONNECTION_STRING=Server=SEU_SERVIDOR\\SQLEXPRESS;Database=ControleGastos;User Id=SEU_USUARIO;Password=SUA_SENHA;TrustServerCertificate=True;
```

## Como Rodar a API

### Modo Produção
```bash
npm start
```

### Modo Desenvolvimento (com auto-restart)
```bash
npm run dev
```

## Endpoints da API

### Health Check
- **GET** `/health`
  - Verifica se o servidor está rodando e se o banco de dados está conectado

### Gastos (Expenses)

#### Registrar novo gasto
- **POST** `/api/gastos`
  ```json
  {
    "descricao": "Compra de supermercado",
    "valor": 150.75,
    "data": "2024-01-15",
    "categoriaId": 1,
    "userId": 1
  }
  ```

#### Listar todos os gastos
- **GET** `/api/gastos`

#### Buscar gasto por ID
- **GET** `/api/gastos/:id`

#### Atualizar gasto
- **PUT** `/api/gastos/:id`
  ```json
  {
    "descricao": "Compra de supermercado atualizada",
    "valor": 160.00,
    "data": "2024-01-15",
    "categoriaId": 1
  }
  ```

#### Excluir gasto
- **DELETE** `/api/gastos/:id`

## Estrutura de Dados Esperada

### Tabela Gastos
- `id` (INT, Primary Key)
- `descricao` (NVARCHAR)
- `valor` (DECIMAL(10,2))
- `data` (DATE)
- `categoriaId` (INT, Foreign Key)
- `userId` (INT, Foreign Key)
- `dataRegistro` (DATETIME, default GETDATE())

### Tabela Categorias
- `id` (INT, Primary Key)
- `nome` (NVARCHAR)

### Tabela Usuarios
- `id` (INT, Primary Key)
- `nome` (NVARCHAR)

## Exemplos de Uso

### Registrar um gasto
```bash
curl -X POST http://localhost:3000/api/gastos \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Almoço no restaurante",
    "valor": 45.50,
    "data": "2024-01-15",
    "categoriaId": 2,
    "userId": 1
  }'
```

### Listar todos os gastos
```bash
curl http://localhost:3000/api/gastos
```

### Atualizar um gasto
```bash
curl -X PUT http://localhost:3000/api/gastos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "descricao": "Almoço atualizado",
    "valor": 50.00,
    "data": "2024-01-15",
    "categoriaId": 2
  }'
```

### Excluir um gasto
```bash
curl -X DELETE http://localhost:3000/api/gastos/1
```

## Configuração do Banco de Dados

O arquivo `.env` deve conter a string de conexão com seu SQL Server:

```env
CONNECTION_STRING=Server=DESKTOP-4LV9A51\\SQLEXPRESS;Database=ControleGastos;User Id=devTeste;Password=123;TrustServerCertificate=True;
```

Certifique-se de que:
1. O SQL Server está rodando
2. O banco de dados `ControleGastos` existe
3. O usuário tem permissão para acessar as tabelas
4. As tabelas `Gastos`, `Categorias` e `Usuarios` existem

## Resolução de Problemas

### Erro de conexão com o banco
- Verifique se o SQL Server está rodando
- Confirme a string de conexão no arquivo `.env`
- Verifique se o banco de usuário e senha estão corretos

### Porta já em uso
- A API usa a porta 3000 por padrão
- Você pode mudar alterando a variável `PORT` no código ou setando a variável de ambiente `PORT`

### Dependências não encontradas
- Execute `npm install` para instalar todas as dependências

## Licença

ISC