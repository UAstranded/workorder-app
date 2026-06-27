import client from './client';
import { ImageAttachment } from '../types';

export async function uploadImage(workOrderId: string, file: File, label: string): Promise<ImageAttachment> {
  const form = new FormData();
  form.append('file', file);
  form.append('label', label);
  const { data } = await client.post(`/images/upload/${workOrderId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadImages(workOrderId: string, files: File[]): Promise<ImageAttachment[]> {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const { data } = await client.post(`/images/upload-multiple/${workOrderId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listImages(workOrderId: string): Promise<ImageAttachment[]> {
  const { data } = await client.get(`/images/work-order/${workOrderId}`);
  return data;
}

export async function deleteImage(imageId: string): Promise<void> {
  await client.delete(`/images/${imageId}`);
}

export async function updateImageLabel(imageId: string, label: string): Promise<ImageAttachment> {
  const { data } = await client.patch(`/images/${imageId}/label`, { label });
  return data;
}

export async function getLabelSuggestions(q?: string): Promise<string[]> {
  const { data } = await client.get('/images/labels', { params: { q } });
  return data;
}
