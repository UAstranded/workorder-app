import { useState, useEffect, useRef } from 'react';
import { ImageAttachment } from '../types';
import { listImages, deleteImage, updateImageLabel, uploadImage, getLabelSuggestions } from '../api/images';
import { X, Upload, Tag, Trash2, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  workOrderId: string;
}

export default function ImageGallery({ workOrderId }: Props) {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [lightbox, setLightbox] = useState<ImageAttachment | null>(null);
  const [labelInputs, setLabelInputs] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    try {
      const data = await listImages(workOrderId);
      setImages(data);
    } catch { /* */ }
  };

  const fetchSuggestions = async (q?: string) => {
    try {
      const data = await getLabelSuggestions(q);
      setSuggestions(data);
    } catch { /* */ }
  };

  useEffect(() => { fetchImages(); fetchSuggestions(); }, [workOrderId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        await uploadImage(workOrderId, file, '');
      } catch { /* */ }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload'}
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
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No images attached</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={`${baseUrl}${img.stored_filename}`}
                alt={img.label || img.original_filename}
                className="w-full h-32 object-cover cursor-pointer"
                onClick={() => setLightbox(img)}
              />
              <div className="p-2">
                <div className="flex items-center gap-1">
                  <Tag size={12} className="text-gray-400 shrink-0" />
                  <input
                    value={labelInputs[img.id] ?? img.label ?? ''}
                    onChange={(e) => {
                      setLabelInputs((p) => ({ ...p, [img.id]: e.target.value }));
                    }}
                    onBlur={() => handleRelabel(img.id)}
                    onFocus={() => fetchSuggestions()}
                    placeholder="Add label..."
                    className="w-full text-xs border-0 p-0 bg-transparent focus:ring-0"
                    list={`suggestions-${img.id}`}
                  />
                  <datalist id={`suggestions-${img.id}`}>
                    {suggestions.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow">
              <X size={20} />
            </button>
            <img src={`${baseUrl}${lightbox.stored_filename}`} alt={lightbox.label || ''} className="max-w-full max-h-[85vh] rounded-lg" />
            {lightbox.label && <p className="text-white text-sm mt-2 text-center">{lightbox.label}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
