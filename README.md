# TraceMark API

API REST do **TraceMark**, plataforma em que fotógrafos publicam fotos de corridas de rua e usuários as visualizam com marca-d'água. Projeto acadêmico de Computação em Nuvem (UFC).

**Stack:** Node.js 24 · TypeScript · Fastify · Prisma · PostgreSQL · Zod · JWT · AWS SDK v3 (S3) · Vitest

## Como rodar

Pré-requisitos: Node.js ≥ 22 e Docker.

```bash
npm install
cp .env.example .env            # preencha JWT_SECRET e INTERNAL_API_TOKEN (openssl rand -base64 48)
docker compose up -d --wait     # PostgreSQL (cria os bancos tracemark e tracemark_test)
npm run db:migrate
npm run dev                     # http://localhost:3333 · Swagger em /docs
```

Para testar uploads reais sem conta AWS, suba também o emulador S3 local (SeaweedFS):

```bash
docker compose --profile storage up -d --wait
npm run storage:setup           # cria o bucket (exige S3_ENDPOINT=http://localhost:8333 no .env)
npm run smoke                   # valida o fluxo completo contra a API rodando
```

| Script                        | Função                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| `npm test`                    | Testes unitários + integração (PostgreSQL real, banco `tracemark_test`) |
| `npm run typecheck`           | Checagem de tipos                                                       |
| `npm run build` / `npm start` | Build e execução em produção                                            |
| `npm run db:migrate:deploy`   | Aplica migrations (produção)                                            |
| `npm run job:expire-uploads`  | Marca como `ERROR` uploads abandonados                                  |

## Funcionalidades

- **Auth:** cadastro (`PHOTOGRAPHER` ou `USER`), login e JWT.
- **Fotos:** o fotógrafo cria um lote de fotos (até `MAX_PHOTOS_PER_UPLOAD`, padrão 30) e recebe URLs pré-assinadas para enviar os arquivos direto ao S3.
- **Feed:** apenas fotos publicáveis, paginado. O dono vê a original; os demais, a versão com marca-d'água.
- **Comentários:** criar, listar e excluir (autor ou dono da foto).
- **Compras (simulada):** o usuário "compra" uma foto publicada, sem gateway de pagamento, e passa a poder baixar a original por uma URL assinada que expira em 60s.
- **Notificações:** foto publicada, falha no processamento, novo comentário e nova venda.

## Endpoints

| Método     | Rota                                                 | Acesso                      |
| ---------- | ---------------------------------------------------- | --------------------------- |
| POST       | `/auth/register`, `/auth/login`                      | público                     |
| GET        | `/auth/me`                                           | autenticado                 |
| GET / PATCH | `/users/:id` / `/users/me`                          | autenticado                 |
| POST       | `/photos`                                            | fotógrafo                   |
| POST       | `/photos/:id/upload-url`                             | dono (nova URL de upload)   |
| POST       | `/photos/:id/confirm-upload`                         | dono                        |
| GET        | `/photos/me`                                         | fotógrafo                   |
| GET        | `/photos/:id`                                        | autenticado                 |
| GET        | `/feed`                                              | autenticado                 |
| POST / GET | `/photos/:photoId/comments`                          | autenticado                 |
| DELETE     | `/comments/:id`                                      | autor ou dono da foto       |
| POST       | `/photos/:id/purchase`                               | autenticado (exceto o dono) |
| GET        | `/photos/:id/download`                               | comprador ou dono           |
| GET        | `/purchases/me`                                      | autenticado                 |
| GET        | `/notifications`                                     | autenticado                 |
| PATCH      | `/notifications/:id/read`, `/notifications/read-all` | autenticado                 |
| PATCH      | `/internal/photos/:id/processing-result`             | Worker (`x-internal-token`) |
| GET        | `/health`                                            | público                     |

Detalhes de cada rota em **`/docs`** (Swagger). Listas retornam `{ data, nextCursor }`; erros retornam `{ error: { code, message } }`.

## Fluxo de publicação

```
1. POST /photos                    → foto criada em UPLOADING + URL pré-assinada
2. Frontend envia o arquivo ao S3  → photos/{id}/original.jpg
3. POST /photos/:id/confirm-upload → PROCESSING
4. Worker aplica a marca-d'água    → photos/{id}/watermarked.jpg   (próxima etapa)
5. Worker chama /internal/...      → PUBLISHABLE → aparece no feed
```

Estados: `UPLOADING → PROCESSING → PUBLISHABLE`, ou `ERROR` em caso de falha.

## Organização

Cada módulo em `src/modules/` (auth, users, photos, feed, comments, notifications) segue Clean Architecture:

| Pasta             | Responsabilidade                              |
| ----------------- | --------------------------------------------- |
| `domain/`         | Entidades e regras de negócio                 |
| `application/`    | Casos de uso e contratos (interfaces)         |
| `infrastructure/` | Implementações: Prisma, S3, JWT               |
| `presentation/`   | Rotas HTTP, validação e formato das respostas |

Dependências comuns (S3, JWT, hash de senha, Prisma) ficam em `src/shared/` e são montadas em [src/container.ts](src/container.ts). Para trocar o S3 por outro provedor, basta uma nova implementação de `StorageGateway`.

## Variáveis de ambiente

Veja [.env.example](.env.example). Principais:

| Variável                  | Descrição                                  |
| ------------------------- | ------------------------------------------ |
| `DATABASE_URL` 🔒         | PostgreSQL local ou RDS                    |
| `JWT_SECRET` 🔒           | Segredo do JWT (≥ 32 caracteres)           |
| `INTERNAL_API_TOKEN` 🔒   | Token usado pelo Worker (≥ 32 caracteres)  |
| `S3_BUCKET`, `AWS_REGION` | Bucket privado das fotos                   |
| `S3_ENDPOINT`             | Apenas para o emulador local               |
| `CORS_ORIGINS`            | Origens do frontend                        |
| `MAX_PHOTOS_PER_UPLOAD`   | Fotos por lote de upload (padrão 30, máx. 100) |
| `ORIGINAL_DOWNLOAD_URL_TTL_SECONDS` | Validade da URL de download da original (padrão 60s) |

🔒 Em produção, esses valores vêm do **AWS Secrets Manager**, nunca de arquivo `.env`.

## Deploy na AWS

```bash
docker build -t tracemark-api .
```

- **EC2:** roda o container, com uma **IAM Role** que permite `s3:PutObject`, `s3:GetObject` e `s3:ListBucket` no bucket. Nenhuma chave AWS no código ou no `.env`.
- **RDS:** basta apontar `DATABASE_URL` para ele e rodar `npx prisma migrate deploy`. Para SSL, use o certificado da AWS (`NODE_EXTRA_CA_CERTS=global-bundle.pem`).
- **S3:** bucket privado, com CORS liberando `POST` e `GET` para o domínio do frontend.

## Integração com o Worker

O Worker identifica a foto pela chave do S3 (`photos/{photoId}/original.*`) e informa o resultado:

```http
PATCH /internal/photos/{photoId}/processing-result
x-internal-token: <INTERNAL_API_TOKEN>

{ "status": "PUBLISHABLE", "watermarkedKey": "photos/{photoId}/watermarked.jpg" }
{ "status": "ERROR", "reason": "motivo da falha" }
```

A chamada é idempotente: reenviar o mesmo estado não tem efeito, então reentregas do SQS são seguras.
