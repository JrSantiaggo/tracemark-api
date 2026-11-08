import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { loadEnv } from '../src/config/env.js';

const env = loadEnv();
const API = process.env.API_URL ?? `http://localhost:${env.PORT}`;
const s3 = new S3Client({ region: env.AWS_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: env.S3_FORCE_PATH_STYLE });

async function call<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

function step(message: string): void {
  console.log(`✔ ${message}`);
}

const suffix = Date.now();
const photographer = await call('POST', '/auth/register', {
  name: 'Fotógrafa Smoke', email: `foto-${suffix}@smoke.test`, password: 'senha-segura-123', role: 'PHOTOGRAPHER',
});
const runner = await call('POST', '/auth/register', {
  name: 'Corredor Smoke', email: `runner-${suffix}@smoke.test`, password: 'senha-segura-123',
});
const asPhotographer = { authorization: `Bearer ${photographer.accessToken}` };
const asRunner = { authorization: `Bearer ${runner.accessToken}` };
step('usuários cadastrados');

const image = Buffer.from('fake-jpeg-bytes-for-smoke-test');
const created = await call('POST', '/photos', {
  photos: [{ title: 'Smoke test', price: '19.90', fileName: 'smoke.jpg', mimeType: 'image/jpeg', fileSize: image.length }],
}, asPhotographer);
const { photo, upload } = created.data[0];
step(`foto ${photo.id} criada em ${photo.status}`);

const form = new FormData();
for (const [key, value] of Object.entries(upload.fields as Record<string, string>)) form.append(key, value);
form.append('file', new Blob([image], { type: 'image/jpeg' }), 'smoke.jpg');
const uploadResponse = await fetch(upload.url, { method: 'POST', body: form });
if (!uploadResponse.ok) throw new Error(`upload S3 falhou: ${uploadResponse.status} ${await uploadResponse.text()}`);
step('upload direto ao S3 via POST pré-assinado');

const confirmed = await call('POST', `/photos/${photo.id}/confirm-upload`, undefined, asPhotographer);
step(`upload confirmado -> ${confirmed.status}`);

const hidden = await fetch(`${API}/photos/${photo.id}`, { headers: asRunner });
if (hidden.status !== 404) throw new Error('foto em processamento não deveria ser visível ao usuário comum');
step('foto em PROCESSING invisível para usuário comum');

const watermarkedKey = `photos/${photo.id}/watermarked.jpg`;
await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: watermarkedKey, Body: Buffer.from('watermarked'), ContentType: 'image/jpeg' }));
await call('PATCH', `/internal/photos/${photo.id}/processing-result`, { status: 'PUBLISHABLE', watermarkedKey }, {
  'x-internal-token': env.INTERNAL_API_TOKEN,
});
step('Worker simulado publicou a foto');

const feed = await call('GET', '/feed?limit=5', undefined, asRunner);
const item = feed.data.find((p: { id: string }) => p.id === photo.id);
if (item?.image?.variant !== 'WATERMARKED') throw new Error('feed deveria entregar a versão com marca-d\'água');
const downloaded = await (await fetch(item.image.url)).text();
if (downloaded !== 'watermarked') throw new Error('URL assinada não retornou a imagem com marca-d\'água');
step('feed do usuário comum entrega imagem WATERMARKED via URL assinada');

const own = await call('GET', `/photos/${photo.id}`, undefined, asPhotographer);
const original = Buffer.from(await (await fetch(own.image.url)).arrayBuffer());
if (own.image.variant !== 'ORIGINAL' || !original.equals(image)) throw new Error('dono deveria receber a original');
step('fotógrafo dono recebe a imagem ORIGINAL');

await call('POST', `/photos/${photo.id}/comments`, { content: 'Foto incrível!' }, asRunner);
const notifications = await call('GET', '/notifications', undefined, asPhotographer);
step(`comentário criado; fotógrafo tem ${notifications.unreadCount} notificações não lidas`);

console.log('\nFluxo completo validado.');
