import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, Loader2, Search, Video, Presentation, FileText, Trash2, Copy, Check } from 'lucide-react';
import { toast } from '../../../lib/toast';
import { adminFetch } from '../../hooks/useD1Query';

interface Asset {
  id: string;
  key: string;
  url: string;
  size: number;
  uploadedAt: string;
  name: string;
  type: string;
}

interface AssetManagerModalProps {
  onClose: () => void;
  onSelect: (url: string) => void;
  /** Render as an embedded panel instead of a full-screen modal overlay. */
  inline?: boolean;
}

function iconFor(asset: Asset) {
  const type = asset.type || '';
  if (type.startsWith('image/')) return null; // thumbnail shown instead
  if (type.startsWith('video/')) return <Video className="w-8 h-8 text-blue-400" />;
  if (type.includes('presentation') || asset.url.match(/\.pptx?$/i)) return <Presentation className="w-8 h-8 text-orange-400" />;
  if (type === 'application/pdf' || asset.url.match(/\.pdf$/i)) return <FileText className="w-8 h-8 text-red-400" />;
  return <File className="w-8 h-8 text-slate-300" />;
}

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetManagerModal({ onClose, onSelect, inline }: AssetManagerModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await adminFetch('/academy/assets') as { success: boolean; assets: any[] };
      if (data.success && data.assets) {
        setAssets(data.assets.map((a: any) => ({
          id: a.id,
          key: a.id,
          url: a.url,
          size: a.file_size,
          uploadedAt: a.created_at,
          name: a.file_name,
          type: a.file_type,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchAssets(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const { url } = await adminFetch('/academy/upload', {
        method: 'POST',
        body: formData
      }) as { url: string };

      await adminFetch('/academy/assets', {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          url: url
        })
      });

      toast.success('Asset uploaded successfully!');
      fetchAssets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload asset');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== asset.id) {
      setConfirmDeleteId(asset.id);
      setTimeout(() => setConfirmDeleteId(prev => (prev === asset.id ? null : prev)), 3000);
      return;
    }
    setConfirmDeleteId(null);
    try {
      setDeletingId(asset.id);
      await adminFetch(`/academy/assets?id=${asset.id}`, { method: 'DELETE' });
      toast.success('Asset deleted');
      setAssets(prev => prev.filter(a => a.id !== asset.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete asset');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = asset.url.startsWith('http') ? asset.url : window.location.origin + asset.url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredAssets = assets.filter(a => !search.trim() || a.name.toLowerCase().includes(search.trim().toLowerCase()));

  const content = (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleUpload}
            accept="image/*,video/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload New Asset'}
          </button>
        </div>
      </div>

      <div className={`${inline ? 'min-h-[240px]' : 'flex-1'} bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center border-dashed`}>
        {loading ? (
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        ) : filteredAssets.length === 0 ? (
          <>
            <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mb-4">
              <File className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-800 font-medium mb-1">{assets.length === 0 ? 'No assets uploaded yet' : 'No assets match your search'}</h3>
            <p className="text-slate-500 text-sm max-w-md">Upload images, PDFs, videos, or PowerPoint presentations to use them across your courses.</p>
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full h-full content-start text-left overflow-y-auto">
            {filteredAssets.map((asset) => (
              <div
                key={asset.key}
                className="border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-400 hover:shadow-md transition-colors cursor-pointer bg-white group flex flex-col"
                onClick={() => onSelect(asset.url)}
              >
                <div className="h-28 bg-slate-100 flex items-center justify-center p-2 relative">
                  <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors z-10 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition-colors transform scale-95">
                      Select Asset
                    </span>
                  </div>
                  {asset.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                    <img src={asset.url} alt="asset" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                  ) : (
                    iconFor(asset)
                  )}
                </div>
                <div className="p-2.5 border-t border-slate-200 bg-white flex-1 flex flex-col">
                  <p className="text-xs font-medium text-slate-700 truncate" title={asset.name}>{asset.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatSize(asset.size)} · {new Date(asset.uploadedAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={e => handleCopy(asset, e)}
                      title="Copy URL"
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      {copiedId === asset.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={e => handleDelete(asset, e)}
                      disabled={deletingId === asset.id}
                      title={confirmDeleteId === asset.id ? 'Click again to confirm delete' : 'Delete asset'}
                      className={`p-1 rounded transition-colors ml-auto ${confirmDeleteId === asset.id ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                      {deletingId === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmDeleteId === asset.id ? (
                        <span className="text-[11px] font-medium px-1">Confirm?</span>
                      ) : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (inline) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white sm:rounded-xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[85vh] flex flex-col overflow-hidden shadow-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <h2 className="text-lg font-medium text-slate-800">Asset Manager</h2>
          <button onClick={onClose} className="p-2.5 -mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 space-y-6">
          {content}
        </div>
      </div>
    </div>
  );
}
