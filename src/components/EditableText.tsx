import { useState, type CSSProperties } from 'react';
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useStore, type SaveActionMode } from '../context/StoreContext';

interface EditableTextProps {
  id: string;
  defaultText: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  className?: string;
  style?: CSSProperties;
  multiline?: boolean;
  allowDelete?: boolean;
  allowExtraParagraphs?: boolean;
  extraParagraphClassName?: string;
  label?: string;
  onSyncSettingField?: (newValue: string) => void;
}

export function EditableText({
  id,
  defaultText,
  as = 'span',
  className = '',
  style,
  multiline = false,
  allowDelete = true,
  allowExtraParagraphs = false,
  extraParagraphClassName = 'mt-3 text-sm md:text-base text-[#292321]/85 leading-relaxed',
  label,
}: EditableTextProps) {
  const {
    isAdmin,
    editMode,
    activeContent,
    publishedContent,
    draftContent,
    previewMode,
    getText,
    getExtraParagraphs,
    saveSiteContent,
    discardDraft,
  } = useStore();

  const currentText = getText(id, defaultText);
  const currentExtras = getExtraParagraphs(id);

  const [open, setOpen] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [extrasDraft, setExtrasDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInlinePreview, setShowInlinePreview] = useState(false);

  const openEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTextDraft(currentText);
    setExtrasDraft([...currentExtras]);
    setStatusMessage(null);
    setErrorMessage(null);
    setShowInlinePreview(false);
    setOpen(true);
  };

  const buildUpdatedSiteContent = (overrideValue: string, extras: string[]) => {
    const base =
      previewMode && draftContent ? draftContent : activeContent || publishedContent;
    const nextOverrides = { ...(base.textOverrides || {}) };
    nextOverrides[id] = overrideValue;

    const nextExtras = { ...(base.extraParagraphs || {}) };
    const cleanedExtras = extras.map((p) => p.trim()).filter(Boolean);
    if (cleanedExtras.length > 0) {
      nextExtras[id] = cleanedExtras;
    } else {
      delete nextExtras[id];
    }

    return {
      ...base,
      textOverrides: nextOverrides,
      extraParagraphs: nextExtras,
    };
  };

  const handleSaveAction = async (mode: SaveActionMode) => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const next = buildUpdatedSiteContent(textDraft, extrasDraft);
      await saveSiteContent(next, mode);
      if (mode === 'preview') {
        setShowInlinePreview(true);
        setStatusMessage(
          'Draft preview saved permanently. Review on the website and click PUBLISH when ready.'
        );
      } else if (mode === 'save') {
        setStatusMessage('Changes saved permanently across devices.');
      } else {
        setStatusMessage('Changes published permanently to the live website.');
      }
    } catch {
      setErrorMessage('Failed to save changes. Please verify your admin permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteText = async () => {
    setTextDraft('');
  };

  const handleCancel = async () => {
    setOpen(false);
    setShowInlinePreview(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleDiscardPreview = async () => {
    setSaving(true);
    try {
      await discardDraft();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const Tag = as;

  // Public view or Edit Mode OFF
  if (!isAdmin || !editMode) {
    if (!currentText && currentExtras.length === 0) return null;
    return (
      <>
        {currentText ? (
          <Tag className={className} style={style}>
            {currentText}
          </Tag>
        ) : null}
        {allowExtraParagraphs &&
          currentExtras.map((para, idx) => (
            <p key={`${id}-extra-${idx}`} className={extraParagraphClassName}>
              {para}
            </p>
          ))}
      </>
    );
  }

  return (
    <>
      <span
        onClick={openEditor}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            openEditor(e as unknown as React.MouseEvent);
          }
        }}
        title={`Edit ${label || id}`}
        className="group relative inline-block cursor-pointer outline-1 outline-dashed outline-[#5B1018]/60 hover:outline-2 hover:outline-[#5B1018] transition-all"
      >
        {currentText ? (
          <Tag className={className} style={style}>
            {currentText}
          </Tag>
        ) : (
          <span className="inline-block px-2 py-0.5 text-[11px] font-mono bg-[#F3E7DA] text-[#5B1018]">
            [Deleted text — click to restore/edit]
          </span>
        )}
        <span className="hidden group-hover:inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 bg-[#5B1018] text-white text-[10px] font-mono uppercase align-middle">
          <Pencil className="w-2.5 h-2.5" />
          Edit
        </span>
      </span>

      {allowExtraParagraphs &&
        currentExtras.map((para, idx) => (
          <p
            key={`${id}-extra-edit-${idx}`}
            onClick={openEditor}
            className={`${extraParagraphClassName} cursor-pointer outline-1 outline-dashed outline-[#5B1018]/40`}
          >
            {para}
          </p>
        ))}

      {open && (
        <div
          className="fixed inset-0 z-[75] bg-black/65 flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white border border-black max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-[#B8B8B3]/60 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                  Edit Website Text
                </p>
                <h3 className="font-display text-lg font-semibold text-black">
                  {label || id}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 border border-[#B8B8B3] text-black hover:border-black"
                aria-label="Close text editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
                  Text Content
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTextDraft(defaultText)}
                    className="text-[11px] font-medium text-[#292321] hover:text-black underline"
                  >
                    Restore Default
                  </button>
                  {allowDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteText}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B1018] hover:underline"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Text</span>
                    </button>
                  )}
                </div>
              </div>

              {multiline || defaultText.length > 85 ? (
                <textarea
                  rows={4}
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#B8B8B3] text-sm text-black bg-white focus:border-black focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#B8B8B3] text-sm text-black bg-white focus:border-black focus:outline-none"
                />
              )}
            </div>

            {allowExtraParagraphs && (
              <div className="space-y-3 pt-2 border-t border-[#B8B8B3]/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-black">
                    Additional Paragraphs ({extrasDraft.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtrasDraft((prev) => [...prev, ''])}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-[#5B1018] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Paragraph</span>
                  </button>
                </div>

                {extrasDraft.map((para, pIdx) => (
                  <div key={pIdx} className="flex gap-2 items-start">
                    <textarea
                      rows={2}
                      value={para}
                      onChange={(e) =>
                        setExtrasDraft((prev) =>
                          prev.map((row, idx) => (idx === pIdx ? e.target.value : row))
                        )
                      }
                      placeholder="Enter additional paragraph..."
                      className="flex-1 px-3 py-2 border border-[#B8B8B3] text-sm text-black focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExtrasDraft((prev) => prev.filter((_, idx) => idx !== pIdx))
                      }
                      className="p-2 border border-[#B8B8B3] text-[#5B1018] hover:border-[#5B1018]"
                      aria-label="Remove paragraph"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showInlinePreview && (
              <div className="border border-[#B8B8B3] bg-[#F5F5F5] p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5B1018]">
                  Preview Output
                </p>
                {textDraft ? (
                  <p className="text-sm text-black font-medium whitespace-pre-wrap">
                    {textDraft}
                  </p>
                ) : (
                  <p className="text-xs italic text-[#292321]/60">
                    (Element deleted / hidden)
                  </p>
                )}
                {extrasDraft
                  .filter((p) => p.trim())
                  .map((p, idx) => (
                    <p key={idx} className="text-sm text-[#292321]/85">
                      {p}
                    </p>
                  ))}
              </div>
            )}

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

            {/* Required 4 Action Buttons: SAVE, CANCEL, PREVIEW, PUBLISH */}
            <div className="pt-3 border-t border-[#B8B8B3]/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCancel}
                  className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:border-black"
                >
                  CANCEL
                </button>
                {previewMode && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDiscardPreview}
                    className="px-4 py-2.5 border border-[#B8B8B3] bg-white text-xs font-semibold uppercase tracking-[0.06em] text-[#5B1018] hover:border-[#5B1018]"
                  >
                    Discard Draft
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAction('preview')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-black bg-white text-xs font-semibold uppercase tracking-[0.06em] text-black hover:bg-[#F5F5F5]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>PREVIEW</span>
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveAction('save')}
                  className="px-5 py-2.5 bg-black text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#292321] disabled:opacity-60"
                >
                  {saving ? 'SAVING...' : 'SAVE'}
                </button>
                <button
                  type="button"
                  disabled={saving}
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
    </>
  );
}
