# StockFlow — Sistema de Gestão de Estoque e Inventário

## Visão Geral

StockFlow é um sistema web completo para gestão de estoque, inventário e logística de armazém. Desenvolvido com React, TypeScript e Lovable Cloud.

**URL publicada:** https://stocksflow.lovable.app

---

## Funcionalidades

### 🔐 Autenticação e Controle de Acesso
- Login e cadastro com e-mail e senha
- Verificação de e-mail obrigatória
- Aprovação de novos usuários pelo administrador
- Primeiro usuário cadastrado é automaticamente admin
- Recuperação de senha via e-mail
- Controle de roles: `admin` e `user`

### 📊 Dashboard
- **Indicadores em tempo real:** itens em estoque, taxa de ocupação, vagas livres, vencimentos próximos, vencidos, NCs abertas
- **Gráfico de barras:** movimentações recentes por dia
- **Gráfico de pizza:** distribuição de estoque por categoria de produto
- **Alertas:** produtos vencendo nos próximos 30 dias e não conformidades abertas

### 📦 Materiais (Produtos)
- Cadastro de produtos com SKU, nome, descrição, categoria, unidade de medida
- Campos: estoque mínimo, estoque máximo, peso, dimensões, validade (shelf life)
- Categorias: Placa ST, Placa RU, Placa RF, Fortíssima, Perfil Metálico, Acessório, Massa, Fita
- Unidades: unidade, metro, m², pacote, caixa, kg, litro
- Ativação/desativação de produtos

### 📋 Estoque (Inventário)
- Visualização de todos os itens em estoque com produto, endereço, quantidade, lote, datas
- **Entrada manual** de materiais com seleção de produto (SKU), endereço destino, quantidade, lote, datas de fabricação/validade, status
- **Edição e exclusão** de registros de estoque
- Filtro por status de inventário
- Associação de status customizáveis aos itens

### 📍 Endereços (Locações)
- Cadastro de endereços do armazém: área, posição, tipo de local, capacidade
- Endereço completo gerado automaticamente (full_address)
- Ativação/desativação de endereços
- Áreas: RUA, RUAMN, RUAMX, L, R, CONG, etc.

### 🗺️ Layout do Armazém
- **Visualização em lista:** tabela com todos os endereços e ocupação
- **Visualização planta:** mapa visual do armazém baseado no layout físico real
  - Zonas mapeadas às áreas do banco de dados
  - Barras de ocupação por zona com indicador visual de cores
  - Clique em zona para ver endereços detalhados daquela área
  - Zonas: Ruas, Rua MN, Rua MX, Área L, Área R, Congelados

### 🔄 Movimentações
- Tipos: Entrada, Saída, Transferência, Ajuste, Devolução
- Registro manual com produto, origem, destino, quantidade, lote, documento de referência, observações
- **Edição e exclusão** de movimentações (admin)
- **Importação via Excel (SAP):** upload de planilha com colunas SKU, Quantidade, Lote, Data
  - Entradas: requer seleção manual de endereço destino
  - Saídas: consumo automático por FIFO (First In, First Out)
- Filtro por tipo de movimentação
- Histórico completo com data/hora

### ⚠️ Não Conformidades
- Registro de ocorrências: divergência de quantidade, produto avariado, validade vencida, produto errado, FIFO violado, endereço errado, outros
- Status: aberta, em análise, resolvida, encerrada
- Classificação de dano: PAV (Perda por Avaria) ou IF (Inutilização por Fabricação)
- Campos: descrição, valor esperado, valor real, ação corretiva
- Vinculação a produto e endereço

### 🤖 Assistente IA
- Chat com IA especialista em gestão de estoque e inventário
- Análise de dados em tempo real do seu estoque
- Geração de relatórios e insights
- Sugestões de estratégias de gestão (FIFO, giro de estoque, etc.)
- Alertas inteligentes sobre vencimentos, ocupação e movimentações

### 👥 Administração (Admin)
- **Gestão de Usuários:** aprovar/rejeitar novos cadastros, promover a admin
- **Status de Estoque:** criar e gerenciar status customizáveis com cores e ordenação

---

## Estrutura Técnica

| Tecnologia | Uso |
|---|---|
| React + TypeScript | Frontend |
| Tailwind CSS + shadcn/ui | Design system |
| Lovable Cloud | Backend, banco de dados, autenticação, edge functions |
| TanStack React Query | Gerenciamento de estado e cache |
| Recharts | Gráficos no dashboard |
| xlsx | Importação de planilhas Excel |
| date-fns | Formatação de datas (pt-BR) |
| react-markdown | Renderização de respostas da IA |

---

## Páginas e Rotas

| Rota | Página | Acesso |
|---|---|---|
| `/login` | Login / Cadastro | Público |
| `/reset-password` | Recuperação de Senha | Público |
| `/` | Dashboard | Autenticado |
| `/materiais` | Materiais (Produtos) | Autenticado |
| `/estoque` | Estoque (Inventário) | Autenticado |
| `/enderecos` | Endereços | Autenticado |
| `/layout` | Layout do Armazém | Autenticado |
| `/movimentacoes` | Movimentações | Autenticado |
| `/nao-conformidades` | Não Conformidades | Autenticado |
| `/assistente` | Assistente IA | Autenticado |
| `/admin/usuarios` | Gestão de Usuários | Admin |
| `/admin/status` | Status de Estoque | Admin |

---

## Atualizações

> Este documento é atualizado conforme novas funcionalidades são implementadas.

**Última atualização:** 30/03/2026
