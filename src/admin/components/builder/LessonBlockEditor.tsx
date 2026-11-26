import React, { useState } from 'react';
import { Film, FileText, Video, Image as ImageIcon, FileBox, Presentation, GripVertical, Trash2, ClipboardCheck, ClipboardList, FolderOpen, UploadCloud, Loader2 } from 'lucide-react';
import { MarkdownAiEditor } from './MarkdownAiEditor';
import { QuizBlockEditor } from './QuizBlockEditor';
import { AssignmentBlockEditor } from './AssignmentBlockEditor';
import { AssetManagerModal } from './AssetManagerModal';
import { VideoAiEditPanel } from './VideoAiEditPanel';
import { adminFetch } from '../../hooks/useD1Query';
import { toast } from '../../../lib/toast';

export type BlockType = 'markdown' | 'video' | 'image' | 'ppt' | 'quiz' | 'assignment' | 'interactive_video';

export interface LessonBlock {
  id: string;
  type: BlockType;
  content: string;
}

interface LessonBlockEditorProps {
  blocks: LessonBlock[];
  onChange: (blocks: LessonBlock[]) => void;
  courseId: string;
  lessonId: string;
}

export function LessonBlockEditor({ blocks, onChange, courseId, lessonId }: LessonBlockEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pickerForBlockId, setPickerForBlockId] = useState<string | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  const handleDirectUpload = async (blockId: string, file: File) => {
    setUploadingBlockId(blockId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { url } = await adminFetch('/academy/upload', { method: 'POST', body: formData }) as { url: string };
      updateBlock(blockId, url);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingBlockId(null);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: LessonBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === 'quiz' || type === 'assignment' ? '{}' : ''
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + direction];
    newBlocks[index + direction] = temp;
    onChange(newBlocks);
  };

  const reorderByDrag = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    onChange(newBlocks);
  };

  const renderBlockEditor = (block: LessonBlock) => {
    switch (block.type) {
      case 'markdown':
        return (
          <MarkdownAiEditor
            value={block.content}
            onChange={(val) => updateBlock(block.id, val)}
          />
        );
      case 'video': {
        const isEmbeddable = block.content.includes('youtube.com') || block.content.includes('youtu.be') || block.content.includes('cloudflarestream.com');
        const embedSrc = block.content.includes('watch?v=') ? block.content.replace('watch?v=', 'embed/') : block.content;
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste YouTube, Vimeo, or MP4 URL, or browse your library..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800"
              />
              <button
                onClick={() => setPickerForBlockId(block.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                <FolderOpen className="w-4 h-4" /> Browse
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors shrink-0 cursor-pointer">
                {uploadingBlockId === block.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Upload
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  disabled={uploadingBlockId === block.id}
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleDirectUpload(block.id, file); e.target.value = ''; }}
                />
              </label>
            </div>
            {block.content && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                {isEmbeddable ? (
                  <iframe src={embedSrc} className="w-full h-full" allowFullScreen title="Video preview" />
                ) : (
                  <video src={block.content} controls className="w-full h-full" />
                )}
              </div>
            )}
          </div>
        );
      }
      case 'image':
      case 'ppt':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={block.type === 'ppt' ? "Paste public PPT/PDF URL, or browse your library..." : "Paste image URL, or browse your library..."}
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-slate-800"
              />
              <button
                onClick={() => setPickerForBlockId(block.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                <FolderOpen className="w-4 h-4" /> Browse
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors shrink-0 cursor-pointer">
                {uploadingBlockId === block.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Upload
                <input
                  type="file"
                  className="hidden"
                  accept={block.type === 'ppt' ? '.ppt,.pptx,.pdf' : 'image/*'}
                  disabled={uploadingBlockId === block.id}
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleDirectUpload(block.id, file); e.target.value = ''; }}
                />
              </label>
            </div>
            {block.content && block.type === 'image' && (
              <img src={block.content} alt="Preview" className="max-h-64 rounded-lg object-contain bg-slate-100" />
            )}
            {block.content && block.type === 'ppt' && (
              <div className="aspect-video w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(block.content)}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                />
              </div>
            )}
          </div>
        );
      case 'quiz':
        return (
          <QuizBlockEditor
            courseId={courseId}
            value={block.content}
            onChange={(val) => updateBlock(block.id, val)}
          />
        );
      case 'assignment':
        return (
          <AssignmentBlockEditor
            lessonId={lessonId}
            value={block.content}
            onChange={(val) => updateBlock(block.id, val)}
          />
        );
      case 'interactive_video': {
        let v: any = null;
        try { v = JSON.parse(block.content); } catch { /* shown as unreadable below */ }
        if (!v?.src) return <p className="text-rose-600 text-sm">This interactive video's data is unreadable. Remove it and publish it again from the Video Studio.</p>;
        const mins = Math.floor(v.duration / 60), secs = String(Math.round(v.duration % 60)).padStart(2, '0');
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
              <span className="font-bold">{v.title || 'Lesson video'}</span>
              <span>{mins}:{secs}</span>
              <span>{v.chapters?.length ?? 0} scenes</span>
              <span>{(v.stations || []).length} stations</span>
              <span>{v.checkpoints?.length ?? 0} question{(v.checkpoints?.length ?? 0) === 1 ? '' : 's'}</span>
            </div>
            <video src={v.src} controls preload="metadata" className="w-full max-w-xl rounded-lg bg-black aspect-video" />
            <p className="text-xs text-slate-500">Students must watch at least 90% and answer the questions to complete the lesson.</p>
            <VideoAiEditPanel
              key={v.videoId}
              courseId={courseId}
              lessonId={lessonId}
              videoId={v.videoId}
              onRebuilt={(json) => updateBlock(block.id, json)}
            />
          </div>
        );
      }
      default:
        return <p className="text-slate-500">Editor for {block.type} is not yet implemented.</p>;
    }
  };

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case 'markdown': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'video': return <Video className="w-4 h-4 text-blue-500" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case 'ppt': return <Presentation className="w-4 h-4 text-orange-500" />;
      case 'quiz': return <ClipboardCheck className="w-4 h-4 text-indigo-500" />;
      case 'assignment': return <ClipboardList className="w-4 h-4 text-amber-500" />;
      case 'interactive_video': return <Film className="w-4 h-4 text-sky-500" />;
      default: return <FileBox className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) reorderByDrag(dragIndex, index); setDragIndex(null); }}
            className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${dragIndex === index ? 'opacity-50 border-indigo-300' : 'border-slate-200'}`}
          >
            <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="flex flex-col shrink-0">
                  <button disabled={index === 0} onClick={() => moveBlock(index, -1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">▲</button>
                  <button disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)} className="text-slate-400 hover:text-slate-700 disabled:opacity-30">▼</button>
                </div>
                <span className="hidden sm:inline cursor-grab text-slate-400 hover:text-slate-600 shrink-0" title="Drag to reorder">
                  <GripVertical className="w-4 h-4" />
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">{getBlockIcon(block.type)}</span>
                  <span className="text-sm font-bold text-slate-700 capitalize truncate">{block.type === 'interactive_video' ? 'Interactive video' : `${block.type} Block`}</span>
                </div>
              </div>
              <button
                onClick={() => removeBlock(block.id)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-white">
              {renderBlockEditor(block)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mr-2">Add Block:</span>
        <button onClick={() => addBlock('markdown')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
          <FileText className="w-4 h-4" /> Text / Markdown
        </button>
        <button onClick={() => addBlock('video')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
          <Video className="w-4 h-4" /> Video
        </button>
        <button onClick={() => addBlock('image')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
          <ImageIcon className="w-4 h-4" /> Image
        </button>
        <button onClick={() => addBlock('ppt')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
          <Presentation className="w-4 h-4" /> PPT / PDF Slide
        </button>
        <button onClick={() => addBlock('quiz')} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors">
          <ClipboardCheck className="w-4 h-4" /> Quiz
        </button>
        <button onClick={() => addBlock('assignment')} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition-colors">
          <ClipboardList className="w-4 h-4" /> Assignment
        </button>
      </div>

      {pickerForBlockId && (
        <AssetManagerModal
          onClose={() => setPickerForBlockId(null)}
          onSelect={(url) => {
            updateBlock(pickerForBlockId, url.startsWith('http') ? url : window.location.origin + url);
            setPickerForBlockId(null);
          }}
        />
      )}
    </div>
  );
}
