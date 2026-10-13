# VendorFlow

VendorFlow é uma aplicação B2B para cadastro e aprovação de fornecedores em múltiplas organizações. O MVP demonstra isolamento entre tenants, permissões por vínculo, fluxo de aprovação e trilha auditável de status.

![Capa do VendorFlow: cadastro, aprovação e histórico auditável](docs/cover.png)

## Experimente a demonstração

1. Abra a [interface pública](https://vendorflow-web.onrender.com/login).
2. Entre com a conta fictícia **ADMIN**: `alex@vendorflow.demo` / `VF-Demo-2026!Access`.
3. Acesse **Suppliers → Add supplier**, informe nome e um **Tax ID único e fictício**, e salve.
4. Abra o fornecedor, clique em **Approve** e confirme no modal.
5. Confira **Status history** no detalhe: a transição, o autor e a data vêm da API.

O ambiente é compartilhado e a conta ADMIN pode alterar ou excluir registros. **Use apenas dados fictícios; não cadastre informações reais ou confidenciais.** Os serviços gratuitos do Render podem demorar no primeiro acesso após inatividade.

## Percurso visual

![Demonstração em seis quadros: lista, cadastro, revisão, confirmação, aprovação e histórico](docs/demo.gif)

O GIF mostra seis etapas capturadas na [aplicação publicada](https://vendorflow-web.onrender.com/login), não telas ilustrativas. Abra as capturas de **1280 × 800 px** para ler os detalhes: [cadastro](docs/screenshots/supplier-create.png), [aprovação](docs/screenshots/supplier-approve.png) e [histórico](docs/screenshots/status-history.png). O fornecedor usado na gravação foi removido ao final.

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

## Demonstração online

- Interface pública: [vendorflow-web.onrender.com](https://vendorflow-web.onrender.com/login)
- API: [vendorflow-api-rlbq.onrender.com](https://vendorflow-api-rlbq.onrender.com/api/health/)
- Documentação da API: [Swagger](https://vendorflow-api-rlbq.onrender.com/api/docs/)

As credenciais e o percurso guiado estão no início deste README. A API expõe um [endpoint de saúde](https://vendorflow-api-rlbq.onrender.com/api/health/) que retorna `{"status": "ok"}` quando o serviço está ativo.

O frontend Vinext e a API Django rodam em serviços web gratuitos separados no Render; o PostgreSQL persistente fica no Neon. O [render.yaml](render.yaml) descreve a API, executa migrações e seed idempotente na inicialização e permite CORS para a interface. O frontend é um serviço Node com build `cd frontend && npm ci --include=dev && npm run build` e start `cd frontend && npm run start:production`. O frontend recebe `NEXT_PUBLIC_API_URL=https://vendorflow-api-rlbq.onrender.com/api` no Render.

O plano gratuito do Render pode suspender os serviços após inatividade, então o primeiro acesso pode demorar. As horas gratuitas são compartilhadas entre os dois serviços; confira [limites atuais do Render](https://render.com/docs/free) antes de usar a demo em uma apresentação.

A [revisão de dependências](docs/dependency-review.md) registra as correções aplicadas e os alertas transitivos ainda pendentes; esta demonstração deve continuar usando apenas dados fictícios.

`DATABASE_URL` e `DJANGO_SECRET_KEY` permanecem secretas e configuradas apenas no Render. A senha da **conta fictícia compartilhada** é pública acima; não a reutilize em outra implantação. Para uma implantação nova, informe um banco PostgreSQL com TLS e uma senha de demonstração própria. A senha do seed só é aplicada quando a conta fictícia é criada pela primeira vez.

## Decisão de escopo do plano antigo

| Item | Decisão |
| --- | --- |
| Histórico de status | **Incluído neste MVP.** Exibido no detalhe e persistido como eventos com autor e data. |
| Contatos adicionais | **Adiado.** E-mail e telefone principais permanecem; uma entidade de múltiplos contatos só entra se houver caso de uso real. |
| Importação/exportação CSV | **Adiada.** Não bloqueia este MVP nem o próximo projeto; reavaliar apenas se uma demo ou usuário exigir volume de dados. |

O próximo projeto pode começar após a publicação e revisão deste MVP, sem esperar contatos ou CSV.
