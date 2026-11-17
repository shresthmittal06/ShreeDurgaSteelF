import { useState } from 'react';
import { Eye, FolderOpen, Image as ImageIcon, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { uploadImageAssetToFirestore } from '../lib/mediaUtils';
import { useStore, type SaveActionMode } from '../context/StoreContext';
import { BrandMark } from './BrandMark';
import { ImageLibraryModal } from './ImageLibraryModal';

interface CompanyLogoProps {
  variant?: 'light' | 'dark';
  className?: string;
}

function parsePositionXY(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const parts = pos.trim().split(/\s+/);
  const parsePct = (s: string | undefined) => {
    if (!s) return 50;
    const n = parseFloat(s.replace('%', ''));
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
  };
  return { x: parsePct(parts[0]), y: parsePct(parts[1]) };
}

export function CompanyLogo({
  variant = 'light',
  className = 'w-8 h-8 shrink-0',
}: CompanyLogoProps) {
  const {
    isAdmin,
    editMode,
    activeContent,
    publishedContent,
    draftContent,
    previewMode,
    resolveMediaSrc,
    saveSiteContent,
  } = useStore();

  const resolvedLogoSrc = !activeContent.logoDeleted
    ? resolveMediaSrc(activeContent.logoUrl)
    : undefined;

  const [open, setOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState('');
  const [draftAlt, setDraftAlt] = useState('');
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [draftDeleted, setDraftDeleted] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraftUrl(activeContent.logoUrl || '');
    setDraftAlt(activeContent.logoAlt || 'SHREE DURGA STEELS Logo');
    const xy = parsePositionXY(activeContent.logoPosition);
    setPosX(xy.x);
    setPosY(xy.y);
    setDraftDeleted(Boolean(activeContent.logoDeleted));
    setStatusMessage(null);
    setErrorMessage(null);
    setShowPreview(true);
    setOpen(true);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await uploadImageAssetToFirestore({
        file,
        usage: 'branding',
        name: `Company Logo (${file.name})`,
        altText: draftAlt || 'SHREE DURGA STEELS Logo',
      });
      setDraftUrl(res.refUrl);
      setDraftDeleted(false);
      setStatusMessage(
        'Logo uploaded permanently. Click SAVE or PUBLISH to update the website.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to upload company logo.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveAction = async (mode: SaveActionMode) => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const base =
        previewMode && draftContent ? draftContent : activeContent || publishedContent;
      const next = {
        ...base,
        logoUrl: draftDeleted ? '' : draftUrl.trim(),
        logoAlt: draftAlt.trim() || 'SHREE DURGA STEELS Logo',
        logoPosition: `${posX}% ${posY}%`,
        logoDeleted: draftDeleted,
      };
      await saveSiteContent(next, mode);
      setStatusMessage(
        mode === 'preview'
          ? 'Logo draft preview saved permanently. Click PUBLISH when ready.'
          : mode === 'save'
          ? 'Company logo saved permanently across devices.'
          : 'Company logo published permanently to live website.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save company logo.'
      );
    } finally {
      setSaving(false);
    }
  };

  const previewResolved = !draftDeleted ? resolveMediaSrc(draftUrl) : undefined;

  const renderLogoVisual = () => {
    if (activeContent.logoDeleted) {
      if (!isAdmin || !editMode) return null;
      return (
        <span className="w-8 h-8 border border-dashed border-[#5B1018] flex items-center justify-center text-[9px] font-mono text-[#5B1018] bg-[#F3E7DA]">
          Logo
        </span>
      );
    }
    if (resolvedLogoSrc) {
      return (
        <img
          src={resolvedLogoSrc}
          alt={activeContent.logoAlt || 'SHREE DURGA STEELS'}
          referrerPolicy="no-referrer"
          style={{
            objectPosition: activeContent.logoPosition || '50% 50%',
            objectFit: 'contain',
          }}
          className={className}
        />
      );
    }
    return <BrandMark variant={variant} className={className} />;
  };

  if (!isAdmin || !editMode) {
    return renderLogoVisual();
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={openEditor}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            openEditor(e as unknown as React.MouseEvent);
          }
        }}
        title="Edit Company Logo"
        className="relative inline-flex items-center justify-center cursor-pointer outline-1 outline-dashed outline-[#5B1018] p-0.5 hover:outline-2"
      >
        {renderLogoVisual()}
        <span className="ml-1 px-1 py-0.5 bg-[#5B1018] text-white text-[9px] font-mono uppercase leading-none inline-flex items-center gap-0.5">
          <ImageIcon className="w-2.5 h-2.5" />
          Logo
        </span>
      </span>

      {open && (
        <div
          className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-4 overflow-y-auto text-[#292321]"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="bg-white border border-black max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-[#B8B8B3]/60 px-6 pt-5 pb-3 shrink-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                  Brand Asset Manager
                </p>
                <h3 className="font-display text-lg font-semibold text-black">
                  Company Logo Management
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
                aria-label="Close logo manager"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-black text-white text-xs font-semibold uppercase cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleUploadLogo}
                  className="sr-only"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-black bg-white text-black text-xs font-semibold uppercase cursor-pointer hover:bg-[#F5F5F5]">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace Image</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleUploadLogo}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-black bg-white text-black text-xs font-semibold uppercase hover:bg-[#F5F5F5]"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Image Library</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#B8B8B3] bg-[#F5F5F5] text-black text-xs font-semibold uppercase hover:border-black"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftDeleted(true);
                  setStatusMessage('Logo marked for deletion. Click SAVE or PUBLISH to confirm.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#5B1018] text-[#5B1018] text-xs font-semibold uppercase hover:bg-[#F3E7DA]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

            {showPreview && (
              <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-white border border-[#B8B8B3]/70 px-4 py-3">
                  {draftDeleted ? (
                    <span className="text-xs font-mono text-[#5B1018]">
                      [Logo Removed]
                    </span>
                  ) : previewResolved ? (
                    <img
                      src={previewResolved}
                      alt={draftAlt || 'SHREE DURGA STEELS'}
                      style={{
                        objectPosition: `${posX}% ${posY}%`,
                        objectFit: 'contain',
                      }}
                      className="w-8 h-8 shrink-0"
                    />
                  ) : (
                    <BrandMark variant="light" className="w-8 h-8 shrink-0" />
                  )}
                  <span className="font-display text-sm font-semibold tracking-[0.06em] text-black">
                    SHREE DURGA STEELS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDraftUrl('');
                    setDraftDeleted(false);
                    setPosX(50);
                    setPosY(50);
                    setStatusMessage('Restored default geometric Brand Mark.');
                  }}
                  className="text-xs font-semibold text-[#5B1018] underline"
                >
                  Use Default Geometric Mark
                </button>
              </div>
            )}

            <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
                Adjust Image Position
              </p>
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div>
                  <span className="font-mono">Horizontal (X: {posX}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full accent-[#5B1018]"
                  />
                </div>
                <div>
                  <span className="font-mono">Vertical (Y: {posY}%)</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full accent-[#5B1018]"
                  />
                </div>
              </div>
              <input
                type="text"
                value={draftAlt}
                onChange={(e) => setDraftAlt(e.target.value)}
                placeholder="Logo Alt Text"
                className="w-full px-3 py-1.5 border border-[#B8B8B3] bg-white text-xs text-black"
              />
            </div>

            {statusMessage && (
              <div className="p-3 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-black">
                {statusMessage}
              </div>
            )}
              {errorMessage && (
                <div className="p-3 bg-[#F3E7DA] border border-[#5B1018] text-xs font-medium text-[#5B1018]">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#B8B8B3]/60 bg-white shrink-0 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
              >
                CANCEL
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || uploading}
                  onClick={() => handleSaveAction('preview')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>PREVIEW</span>
                </button>
                <button
                  type="button"
                  disabled={saving || uploading}
                  onClick={() => handleSaveAction('save')}
                  className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
                >
                  {saving ? 'SAVING...' : 'SAVE'}
                </button>
                <button
                  type="button"
                  disabled={saving || uploading}
                  onClick={() => handleSaveAction('publish')}
                  className="px-5 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] disabled:opacity-60"
                >
                  PUBLISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageLibraryModal
        open={libraryOpen}
        initialUsage="branding"
        onSelectImage={(refUrl, alt) => {
          setDraftUrl(refUrl);
          if (alt) setDraftAlt(alt);
          setDraftDeleted(false);
          setStatusMessage('Logo selected from library. Click SAVE or PUBLISH to confirm.');
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </>
  );
}
