# VendorFlow

VendorFlow é uma aplicação B2B para cadastro e aprovação de fornecedores em múltiplas organizações. O MVP demonstra isolamento entre tenants, permissões por vínculo, fluxo de aprovação e trilha auditável de status.

## Demonstração visual

![Percurso curto pelo login, dashboard, lista e histórico](docs/demo.gif)

| Dashboard com métricas da API | Lista com filtro de status | Histórico de aprovação |
| --- | --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Lista filtrada](docs/screenshots/suppliers-filtered.png) | ![Histórico](docs/screenshots/status-history.png) |

O arquivo [docs/demo.gif](docs/demo.gif) é um vídeo curto em formato GIF, gerado a partir de capturas reais da aplicação local. Os nomes, e-mails e identificadores dos fornecedores de demonstração são fictícios.

Percurso de avaliação: entrar com a conta ADMIN de demonstração → abrir **Suppliers** → criar um fornecedor com identificador único → aprová-lo → abrir o detalhe e conferir o evento de aprovação, autor e data no histórico.

## Arquitetura

```mermaid
flowchart LR
    Browser[React 19 / Vinext] -->|JWT| API[Django REST Framework]
    API --> Auth[Usuários e memberships]
    API --> Domain[Fornecedores e eventos de status]
    Auth --> DB[(SQLite local / PostgreSQL produção)]
    Domain --> DB
```

O frontend consulta a API para login, dashboard, lista, filtros, paginação, detalhe e mutações. O backend aplica as permissões mesmo quando uma rota é acessada diretamente. Cada usuário pode ter um papel diferente em cada organização.

| Ação | VIEWER | MANAGER | ADMIN |
| --- | :---: | :---: | :---: |
| Consultar fornecedores e histórico | ✓ | ✓ | ✓ |
| Criar e editar |  | ✓ | ✓ |
| Aprovar ou rejeitar pendentes |  | ✓ | ✓ |
| Suspender aprovados e excluir |  |  | ✓ |

As transições permitidas são `PENDING → APPROVED`, `PENDING → REJECTED` e `APPROVED → SUSPENDED`. Cada criação ou transição nova gera um evento com autor e data. Registros anteriores à migração não têm histórico retroativo inventado.

## Executar localmente

Requisitos: Python 3.9+, Node.js 22.13+ e npm.

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
$env:VENDORFLOW_DEMO_PASSWORD="defina-uma-senha-de-12-caracteres-ou-mais"
python manage.py seed_demo
python manage.py runserver
```

Em outro terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm start
```

Abra `http://localhost:3000`. O seed cria contas fictícias `alex@vendorflow.demo` (ADMIN), `carlos@vendorflow.demo` (MANAGER), `maria@vendorflow.demo` (VIEWER) e `nina@northstar.demo` (ADMIN de outra organização). Todas usam a senha fornecida em `VENDORFLOW_DEMO_PASSWORD` na primeira criação. O comando é idempotente e não redefine senhas de contas existentes.

## API

| Endpoint | Finalidade |
| --- | --- |
| `POST /api/auth/token/` e `/api/auth/token/refresh/` | Login e renovação JWT |
| `GET /api/me/` | Usuário autenticado |
| `GET /api/organizations/` | Organizações e papéis |
| `GET /api/organizations/{id}/members/` | Responsáveis válidos |
| `GET /api/organizations/{id}/suppliers/` | Busca, `status`, `responsible`, `ordering`, `page`, `page_size` |
| `GET /api/organizations/{id}/suppliers/summary/` | Métricas e itens que requerem atenção |
| `GET/POST /api/organizations/{id}/suppliers/` | Lista e criação |
| `GET/PATCH/DELETE /api/organizations/{id}/suppliers/{supplier_id}/` | Detalhe e manutenção |
| `POST .../{supplier_id}/approve/`, `reject/`, `suspend/` | Fluxo de status |

Documentação OpenAPI: `http://127.0.0.1:8000/api/docs/`.

## Verificação

```powershell
cd backend
.\venv\Scripts\python.exe manage.py test
cd ..\frontend
npm run lint
npx tsc --noEmit
npm run build
```

Os 34 testes de API cobrem autenticação e refresh, isolamento entre organizações, permissões dos três papéis, filtros, paginação, transições, histórico e idempotência do seed da demo. O percurso local também foi validado no navegador: login de ADMIN, aprovação e histórico; login de MANAGER, rejeição; login de VIEWER, bloqueio da criação; e redirecionamento ao login após logout.

A renovação automática do frontend foi conferida com `JWT_ACCESS_LIFETIME_SECONDS=2` no backend: depois de receber `401`, o cliente chamou `/api/auth/token/refresh/`, repetiu a requisição e manteve a lista disponível. O valor padrão continua em 300 segundos.

## Publicação

O frontend antigo está publicado no Sites, mas esta versão integrada **ainda não foi publicada**. Para uma demonstração pública e gratuita, o plano é usar [Render Free Web Service](https://render.com/docs/free) para a API Django e [Neon Free](https://neon.com/blog/neon-free-plan-1-gb-per-project) para PostgreSQL persistente. O banco gratuito do Render expira em 30 dias; por isso ele não foi escolhido para os dados da demo.

O [render.yaml](render.yaml) define o serviço gratuito e usa o [Dockerfile](backend/Dockerfile). Na inicialização, o serviço executa migrações, cria os dados fictícios de forma idempotente quando `VENDORFLOW_DEMO_PASSWORD` está configurada e inicia o Gunicorn na porta fornecida pelo Render. `GET /api/health/` é a verificação de disponibilidade.

Para publicar:

1. Criar um projeto gratuito no Neon e copiar sua `DATABASE_URL` PostgreSQL com TLS (`sslmode=require`). Guardar a URL apenas no painel do Render.
2. Colocar `backend/`, `frontend/` e `render.yaml` em um repositório GitHub. O diretório raiz atual ainda não é um repositório Git; `frontend/` possui um repositório interno usado pelo Sites. Resolver essa estrutura antes de conectar o GitHub, preservando o histórico existente.
3. No Render, criar uma **Blueprint** a partir desse repositório. Informar `DATABASE_URL` e uma senha exclusiva de demonstração com pelo menos 12 caracteres quando solicitado. `DJANGO_SECRET_KEY` é gerada pelo Render. O host público do Render é incorporado automaticamente às configurações do Django.
4. Confirmar `https://<api>.onrender.com/api/health/`, `/api/docs/` e o login das quatro contas fictícias. Testar ADMIN, MANAGER, VIEWER, acesso cruzado entre organizações e histórico após aprovação.
5. Configurar `NEXT_PUBLIC_API_URL=https://<api>.onrender.com/api` no build do frontend, publicar a versão integrada no Sites e executar o percurso em uma janela privada do navegador. Somente então abrir o acesso do Site para visitantes e divulgar as credenciais da demo.

O Render gratuito suspende o serviço após 15 minutos sem tráfego; a primeira requisição seguinte pode levar cerca de um minuto. O Neon Free oferece, em outubro de 2026, 1 GB de armazenamento e 100 CU-horas mensais por projeto. Esses limites servem para uma demo de portfólio, com possível espera no primeiro login, e devem ser conferidos novamente antes da publicação. Fontes: [limites do Render](https://render.com/docs/free) e [plano gratuito do Neon](https://neon.com/blog/neon-free-plan-1-gb-per-project).

Variáveis necessárias para o backend em produção:

```text
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<gerada pelo Render>
DJANGO_CORS_ALLOWED_ORIGINS=<origem pública do frontend>
DATABASE_URL=postgresql://...?...sslmode=require
VENDORFLOW_DEMO_PASSWORD=<senha exclusiva com pelo menos 12 caracteres>
```

O projeto Sites atual tem acesso restrito ao proprietário. Ainda faltam as contas/projetos Neon e Render, o repositório remoto e a URL efetiva da API para concluir e verificar a publicação ponta a ponta.

## Decisão de escopo do plano antigo

| Item | Decisão |
| --- | --- |
| Histórico de status | **Incluído neste MVP.** Exibido no detalhe e persistido como eventos com autor e data. |
| Contatos adicionais | **Adiado.** E-mail e telefone principais permanecem; uma entidade de múltiplos contatos só entra se houver caso de uso real. |
| Importação/exportação CSV | **Adiada.** Não bloqueia este MVP nem o próximo projeto; reavaliar apenas se uma demo ou usuário exigir volume de dados. |

O próximo projeto pode começar após a publicação e revisão deste MVP, sem esperar contatos ou CSV.
