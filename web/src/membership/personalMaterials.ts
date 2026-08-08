import { membershipConfig } from './config';

export const PERSONAL_LIBRARY_CLOUD_ENTITLEMENT = 'rhythmcoach.personal_library_cloud';

export interface CloudPersonalMaterial {
  id: string;
  clientId: string;
  title: string;
  content: string;
  tip?: string;
  deliveryMarkup?: string;
  updatedAt: string;
}

interface CloudPersonalMaterialRow {
  id: string;
  client_id: string;
  title: string;
  content: string;
  tip: string | null;
  delivery_markup: string | null;
  updated_at: string;
}

interface SaveCloudPersonalMaterialInput {
  clientId: string;
  title: string;
  content: string;
  tip?: string;
  deliveryMarkup?: string;
}

const endpoint = `${membershipConfig.supabaseUrl}/rest/v1/rhythmcoach_personal_materials`;

function requestHeaders(accessToken: string, prefer?: string): HeadersInit {
  return {
    apikey: membershipConfig.supabasePublishableKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}

function toMaterial(row: CloudPersonalMaterialRow): CloudPersonalMaterial {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    content: row.content,
    tip: row.tip ?? undefined,
    deliveryMarkup: row.delivery_markup ?? undefined,
    updatedAt: row.updated_at
  };
}

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => ({})) as { message?: string; error?: string };
  return new Error(payload.message ?? payload.error ?? `Personal library request failed (${response.status}).`);
}

export async function listCloudPersonalMaterials(accessToken: string): Promise<CloudPersonalMaterial[]> {
  const response = await fetch(
    `${endpoint}?select=id,client_id,title,content,tip,delivery_markup,updated_at&order=updated_at.desc`,
    { headers: requestHeaders(accessToken) }
  );
  if (!response.ok) throw await responseError(response);
  const rows = await response.json() as CloudPersonalMaterialRow[];
  return rows.map(toMaterial);
}

export async function saveCloudPersonalMaterial(
  accessToken: string,
  userId: string,
  material: SaveCloudPersonalMaterialInput
): Promise<CloudPersonalMaterial> {
  const response = await fetch(`${endpoint}?on_conflict=user_id,client_id`, {
    method: 'POST',
    headers: requestHeaders(accessToken, 'resolution=merge-duplicates,return=representation'),
    body: JSON.stringify({
      user_id: userId,
      client_id: material.clientId,
      title: material.title.slice(0, 120),
      content: material.content.slice(0, 20000),
      tip: material.tip || null,
      delivery_markup: material.deliveryMarkup || null,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) throw await responseError(response);
  const rows = await response.json() as CloudPersonalMaterialRow[];
  if (!rows[0]) throw new Error('Personal library save returned no material.');
  return toMaterial(rows[0]);
}

export async function deleteCloudPersonalMaterial(accessToken: string, materialId: string): Promise<void> {
  const response = await fetch(`${endpoint}?id=eq.${encodeURIComponent(materialId)}`, {
    method: 'DELETE',
    headers: requestHeaders(accessToken)
  });
  if (!response.ok) throw await responseError(response);
}
