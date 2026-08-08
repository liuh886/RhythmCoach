import './personalLibrary.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Language } from '../types';
import { isDeliveryMarkupAligned } from '../domain/deliveryMarkup';
import { useMembership } from '../membership/MembershipProvider';
import {
  deleteCloudPersonalMaterial,
  listCloudPersonalMaterials,
  PERSONAL_LIBRARY_CLOUD_ENTITLEMENT,
  saveCloudPersonalMaterial,
  type CloudPersonalMaterial
} from '../membership/personalMaterials';
import type { ScriptMaterial } from './materials';

const DRAFTS_KEY = 'rhythm_custom_materials';

function safeLocalMaterials(): ScriptMaterial[] {
  try {
    const saved = localStorage.getItem(DRAFTS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ScriptMaterial => Boolean(
      item
      && typeof item === 'object'
      && 'id' in item
      && 'title' in item
      && 'content' in item
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.content === 'string'
    ));
  } catch {
    return [];
  }
}

function cloudToMaterial(material: CloudPersonalMaterial): ScriptMaterial {
  return {
    id: material.clientId,
    title: material.title,
    content: material.content,
    tip: material.tip,
    deliveryMarkup: material.deliveryMarkup
  };
}

export function usePersonalLibrary(language: Language) {
  const membership = useMembership();
  const [localMaterials, setLocalMaterials] = useState<ScriptMaterial[]>([]);
  const [cloudMaterials, setCloudMaterials] = useState<CloudPersonalMaterial[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');

  useEffect(() => {
    setLocalMaterials(safeLocalMaterials());
  }, []);

  const cloudEnabled = Boolean(
    membership.user
    && membership.hasEntitlement(PERSONAL_LIBRARY_CLOUD_ENTITLEMENT)
  );

  const cloudIds = useMemo(
    () => new Set(cloudMaterials.map((material) => material.clientId)),
    [cloudMaterials]
  );

  const materials = useMemo(() => [
    ...cloudMaterials.map(cloudToMaterial),
    ...localMaterials.filter((material) => !cloudIds.has(material.id))
  ], [cloudIds, cloudMaterials, localMaterials]);

  const persistLocal = useCallback((next: ScriptMaterial[]) => {
    setLocalMaterials(next);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
  }, []);

  const refreshCloud = useCallback(async () => {
    if (!cloudEnabled) {
      setCloudMaterials([]);
      setCloudError('');
      return;
    }

    setCloudLoading(true);
    setCloudError('');
    try {
      const token = await membership.getAccessToken();
      if (!token) throw new Error(language === 'zh' ? '登录状态已失效，请重新登录。' : 'Your sign-in session has expired.');
      setCloudMaterials(await listCloudPersonalMaterials(token));
    } catch (error) {
      setCloudError(error instanceof Error
        ? error.message
        : language === 'zh' ? '云端素材加载失败。' : 'Cloud library failed to load.');
    } finally {
      setCloudLoading(false);
    }
  }, [cloudEnabled, language, membership]);

  const save = useCallback(async (material: ScriptMaterial) => {
    const nextLocal = [material, ...localMaterials.filter((item) => item.id !== material.id)];
    persistLocal(nextLocal);

    if (!cloudEnabled || !membership.user) return;

    setCloudError('');
    try {
      const token = await membership.getAccessToken();
      if (!token) throw new Error(language === 'zh' ? '登录状态已失效，请重新登录。' : 'Your sign-in session has expired.');
      const saved = await saveCloudPersonalMaterial(token, membership.user.id, {
        clientId: material.id,
        title: material.title,
        content: material.content,
        tip: material.tip,
        deliveryMarkup: material.deliveryMarkup
      });
      setCloudMaterials((items) => [saved, ...items.filter((item) => item.clientId !== saved.clientId)]);
    } catch (error) {
      setCloudError(error instanceof Error
        ? error.message
        : language === 'zh' ? '在线保存失败，本机副本已保留。' : 'Cloud save failed; the local copy is still available.');
    }
  }, [cloudEnabled, language, localMaterials, membership, persistLocal]);

  const remove = useCallback(async (material: ScriptMaterial) => {
    persistLocal(localMaterials.filter((item) => item.id !== material.id));
    const cloud = cloudMaterials.find((item) => item.clientId === material.id);
    if (!cloud || !cloudEnabled) return;

    setCloudError('');
    try {
      const token = await membership.getAccessToken();
      if (!token) throw new Error(language === 'zh' ? '登录状态已失效，请重新登录。' : 'Your sign-in session has expired.');
      await deleteCloudPersonalMaterial(token, cloud.id);
      setCloudMaterials((items) => items.filter((item) => item.id !== cloud.id));
    } catch (error) {
      setCloudError(error instanceof Error
        ? error.message
        : language === 'zh' ? '云端删除失败。' : 'Cloud delete failed.');
    }
  }, [cloudEnabled, cloudMaterials, language, localMaterials, membership, persistLocal]);

  const importFile = useCallback(async (file: File) => {
    const parsed = JSON.parse(await file.text()) as unknown;
    if (!Array.isArray(parsed)) throw new Error('Expected an array');
    const valid = parsed
      .filter((item): item is Record<string, unknown> => Boolean(
        item
        && typeof item === 'object'
        && 'title' in item
        && 'content' in item
        && typeof item.title === 'string'
        && typeof item.content === 'string'
      ))
      .map((item) => {
        const content = String(item.content);
        const rawMarkup = typeof item.deliveryMarkup === 'string' ? item.deliveryMarkup : '';
        return {
          id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: String(item.title),
          content,
          tip: typeof item.tip === 'string' ? item.tip : undefined,
          deliveryMarkup: isDeliveryMarkupAligned(rawMarkup, content) ? rawMarkup : undefined
        } satisfies ScriptMaterial;
      });
    persistLocal([...valid, ...localMaterials]);
  }, [localMaterials, persistLocal]);

  const exportFile = useCallback(() => {
    if (materials.length === 0) return;
    const blob = new Blob([JSON.stringify(materials, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rhythmcoach_personal_library_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [materials]);

  return {
    materials,
    cloudEnabled,
    cloudIds,
    cloudLoading,
    cloudError,
    refreshCloud,
    save,
    remove,
    importFile,
    exportFile
  };
}
