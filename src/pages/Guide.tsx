import ReactMarkdown from 'react-markdown';

const readmeContent = `# StockFlow — Sistema de Gestão de Estoque e Inventário

## Visão Geral

StockFlow é um sistema web completo para gestão de estoque, inventário e logística de armazém.

---

## Funcionalidades

### 🔐 Autenticação e Controle de Acesso
- Login e cadastro com e-mail e senha
- Verificação de e-mail obrigatória
- Aprovação/reprovação de novos usuários pelo administrador
- Primeiro usuário cadastrado é automaticamente admin
- Recuperação de senha via e-mail
- Edição de perfis de usuários (nome, cargo)

### 📊 Dashboard
- Indicadores em tempo real: itens em estoque, ocupação, vagas livres, vencimentos, NCs abertas
- Gráfico de barras: movimentações recentes por dia
- Gráfico de pizza: distribuição por categoria
- Alertas de vencimentos e não conformidades

### 📦 Materiais (Produtos)
- Cadastro com SKU, nome, descrição, categoria, unidade
- Campos: estoque mín/máx, peso, dimensões, validade
- Categorias: Placa ST/RU/RF/Fortíssima, Perfil, Acessório, Massa, Fita

### 📋 Estoque (Inventário)
- Visualização com produto, endereço, quantidade, lote, datas
- Entrada manual com seleção de SKU, endereço, quantidade, lote, datas, status
- Edição e exclusão de registros
- Filtro por status

### 📍 Endereços (Locações)
- Cadastro: área, posição, tipo, capacidade
- Endereço completo automático
- Ativação/desativação

### 🗺️ Layout do Armazém
- Visualização em lista e planta
- Mapa visual com zonas mapeadas
- Barras de ocupação por zona
- Clique para ver detalhes

### 🔄 Movimentações
- Tipos: Entrada, Saída, Transferência, Ajuste, Devolução
- Registro manual e importação via Excel (SAP)
- Saídas com FIFO automático
- Edição/exclusão (admin)

### 📊 Contagens de Inventário
- Registro de contagens diárias e mensais
- Leitor de QR Code para identificação automática de materiais
- Importação de contagens via Excel
- Histórico com gráfico de linha por rua/dia

### ⚠️ Não Conformidades
- Tipos: divergência, avariado, vencido, errado, FIFO violado, endereço errado
- Status: aberta, em análise, resolvida, encerrada
- Classificação de dano: PAV ou IF

### 🤖 Assistente IA
- Chat com IA especialista em estoque
- Análise de dados em tempo real
- Relatórios e estratégias

### 👥 Administração
- Aprovar/reprovar/remover usuários
- Editar perfis de usuários
- Gerenciar status de estoque customizáveis

---

## Páginas e Rotas

| Rota | Página | Acesso |
|---|---|---|
| \`/login\` | Login / Cadastro | Público |
| \`/reset-password\` | Recuperação de Senha | Público |
| \`/\` | Dashboard | Autenticado |
| \`/materiais\` | Materiais | Autenticado |
| \`/estoque\` | Estoque | Autenticado |
| \`/enderecos\` | Endereços | Autenticado |
| \`/layout\` | Layout do Armazém | Autenticado |
| \`/movimentacoes\` | Movimentações | Autenticado |
| \`/nao-conformidades\` | Não Conformidades | Autenticado |
| \`/contagens\` | Contagens de Inventário | Autenticado |
| \`/assistente\` | Assistente IA | Autenticado |
| \`/guia\` | Guia do Sistema | Autenticado |
| \`/admin/usuarios\` | Gestão de Usuários | Admin |
| \`/admin/status\` | Status de Estoque | Admin |
`;

const Guide = () => {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0">
        <ReactMarkdown>{readmeContent}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Guide;
