# ⚡ LeadFlow — Rastreamento de Leads por Plataforma

Sistema completo para registrar leads, identificar a origem (YouTube, Instagram, Kwai etc.) e analisar o desempenho de cada canal de comunicação.

---

## 🗂 Estrutura

```
leadflow/
├── frontend/                  → Vite + React + Tailwind
├── backend/                   → Python + Flask + MySQL
├── instalar-windows.bat       → ⚡ Instalador automático Windows
├── instalar-linux.sh          → ⚡ Instalador automático Linux/macOS
```

---

## 🌐 URLs do Sistema

| Quem acessa | URL | O que vê |
|---|---|---|
| **Gerente** | `http://IP:4030` | Dashboard completo + todos os dados |
| **Vendedor** | `http://IP:4030/coletar` | Apenas o formulário de registro |
| **API** | `http://IP:4031/api/health` | Backend Flask |

> O vendedor que acessa `/coletar` **não tem** sidebar, não vê dashboard nem leads. Só preenche o formulário.

---

## 🗄 1. Banco de dados

```bash
mysql -u root -p < backend/schema.sql
```

---

## ⚡ 2. Instalação automática

### Windows (como Administrador)
```
botão direito → instalar-windows.bat → Executar como Administrador
```

### Linux / macOS
```bash
sudo bash instalar-linux.sh
```

O instalador:
- Configura ambiente virtual Python
- Detecta seu IP local automaticamente
- Faz o build do frontend com o IP correto
- Registra dois serviços que iniciam com o sistema
- Abre as portas no firewall

---

## 🔧 Instalação manual

```bash
# Backend
cd backend && cp .env.example .env
# edite .env com sua senha MySQL
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py          # roda na porta 4031

# Frontend
cd frontend && cp .env.example .env
# edite VITE_API_URL=http://SEU_IP:4031/api
npm install && npm run build
npx serve dist -l 4030
```

---

## 📋 Funcionalidades

**Formulário do Vendedor (`/coletar`)**
- Nome e telefone do cliente
- Seleção visual da plataforma de origem (botões coloridos)
- Vídeo específico que o cliente assistiu
- Tempo que acompanha o conteúdo
- Interesse / o que busca
- Vendedor responsável
- Observações livres

**Dashboard do Gerente**
- Total de leads (hoje / semana / mês / total)
- Funil de conversão (Novo → Em contato → Convertido → Perdido)
- Gráfico de leads por plataforma com taxas de conversão
- Série temporal 14 dias
- Análise de tempo de acompanhamento (pizza)
- Vídeos mais citados pelos leads

**Analytics**
- Total vs Convertidos por plataforma (barras agrupadas)
- Participação por plataforma (pizza)
- Volume diário 14 dias
- Desempenho por vendedor com taxa de conversão

**Gestão**
- Plataformas: criar, editar, definir cor e ícone, usar atalhos rápidos
- Vendedores: criar e ativar/desativar
- Leads: busca, filtros por plataforma/status/período, troca de status direto na tabela

---

## 📡 Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | /api/health | Status |
| GET/POST | /api/leads/ | Listar / criar lead |
| GET/PUT/DELETE | /api/leads/:id | Detalhe / editar / excluir |
| PATCH | /api/leads/:id/status | Atualizar status |
| GET/POST/PUT/DELETE | /api/platforms/ | CRUD plataformas |
| GET/POST/PUT | /api/vendors/ | CRUD vendedores |
| GET | /api/dashboard/ | Dados do dashboard |
| GET | /api/dashboard/top-videos | Vídeos mais citados |

---

## 🛠 Tecnologias

**Frontend:** Vite · React · Tailwind CSS v3 · React Router · Recharts · Axios · Lucide Icons

**Backend:** Python · Flask · PyMySQL · Flask-CORS · python-dotenv

**Banco:** MySQL 8.0 · Portas: 4030 (frontend) / 4031 (backend)

**Serviços:** NSSM (Windows) · systemd (Linux) · launchd (macOS)
