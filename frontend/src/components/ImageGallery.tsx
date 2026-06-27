import { useState, useEffect, useRef } from 'react';
import { ImageAttachment } from '../types';
import { listImages, deleteImage, updateImageLabel, uploadImage, uploadImages, getLabelSuggestions } from '../api/images';
import { X, Upload, Tag, Trash2, Folder, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  workOrderId: string;
}

export default function ImageGallery({ workOrderId }: Props) {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [lightbox, setLightbox] = useState<ImageAttachment | null>(null);
  const [labelInputs, setLabelInputs] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    try {
      const data = await listImages(workOrderId);
      setImages(data);
      const keys = Object.keys(
        data.reduce<Record<string, ImageAttachment[]>>((acc, img) => {
          const key = img.label?.trim() || '__unlabeled__';
          (acc[key] ??= []).push(img);
          return acc;
        }, {})
      ).sort((a, b) => {
        if (a === '__unlabeled__') return 1;
        if (b === '__unlabeled__') return -1;
        return a.localeCompare(b);
      });
      if (keys.length > 0) setOpenFolders(new Set(keys));
    } catch { /* */ }
  };

  const fetchSuggestions = async (q?: string) => {
    try {
      const data = await getLabelSuggestions(q);
      setSuggestions(data);
    } catch { /* */ }
  };

  useEffect(() => {
    fetchImages();
    fetchSuggestions();
  }, [workOrderId]);

  const toggleFolder = (key: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const fileList = Array.from(files);
    try {
      await uploadImages(workOrderId, fileList);
    } catch {
      await Promise.all(
        fileList.map((file) => uploadImage(workOrderId, file, '').catch(() => {}))
      );
    }
    setUploading(false);
    fetchImages();
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    await deleteImage(id);
    fetchImages();
    if (lightbox?.id === id) setLightbox(null);
  };

  const handleRelabel = async (id: string) => {
    const label = labelInputs[id];
    if (label === undefined || label === null) return;
    await updateImageLabel(id, label);
    fetchImages();
  };

  const baseUrl = '/uploads/';

  const grouped = images.reduce<Record<string, ImageAttachment[]>>((acc, img) => {
    const key = img.label?.trim() || '__unlabeled__';
    (acc[key] ??= []).push(img);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__unlabeled__') return 1;
    if (b === '__unlabeled__') return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="card-header">Attachments ({images.length})</h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-primary text-xs px-3 py-1.5"
        >
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No images attached</p>
      ) : (
        <div className="space-y-2">
          {groupKeys.map((key) => {
            const isOpen = openFolders.has(key);
            const label = key === '__unlabeled__' ? 'Unlabeled' : key;
            return (
              <div key={key} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleFolder(key)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {isOpen ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                  <Folder size={14} className="text-brand-500 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">({grouped[key].length})</span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                      {grouped[key].map((img) => (
                        <div key={img.id} className="group relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-card-hover transition-shadow">
                          <img
                            src={`${baseUrl}${img.stored_filename}`}
                            alt={img.label || img.original_filename}
                            className="w-full h-32 object-cover cursor-pointer"
                            onClick={() => setLightbox(img)}
                          />
                          <div className="p-2">
                            <div className="flex items-center gap-1">
                              <Tag size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                              <input
                                value={labelInputs[img.id] ?? img.label ?? ''}
                                onChange={(e) => setLabelInputs((p) => ({ ...p, [img.id]: e.target.value }))}
                                onBlur={() => handleRelabel(img.id)}
                                onFocus={() => fetchSuggestions()}
                                placeholder="Add label..."
                                className="w-full text-xs border-0 p-0 bg-transparent focus:ring-0 text-gray-700 dark:text-gray-300 placeholder-gray-400"
                                list={`suggestions-${img.id}`}
                              />
                              <datalist id={`suggestions-${img.id}`}>
                                {suggestions.map((s) => <option key={s} value={s} />)}
                              </datalist>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(img.id)}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/70"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow">
              <X size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <img src={`${baseUrl}${lightbox.stored_filename}`} alt={lightbox.label || ''} className="max-w-full max-h-[85vh] rounded-lg" />
            {lightbox.label && <p className="text-white text-sm mt-2 text-center">{lightbox.label}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
