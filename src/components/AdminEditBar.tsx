import React, { useState } from 'react';
import {
  Check,
  Eye,
  Pencil,
  Save,
  Settings,
  Sparkles,
  RotateCcw,
  X,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface AdminEditBarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function AdminEditBar({ currentPath, onNavigate }: AdminEditBarProps) {
  const {
    isAdmin,
    adminMode,
    toggleAdminMode,
    editMode,
    setEditMode,
    previewMode,
    setPreviewMode,
    saveAllChanges,
    discardDraft,
  } = useStore();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Toggle Edit Mode ON/OFF
  const handleToggleEditMode = () => {
    const nextState = !editMode;
    setEditMode(nextState);
    if (nextState) {
      toggleAdminMode(true);
      setPreviewMode(true);
    }
  };

  // Save All Changes permanently
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      await saveAllChanges();
      setSaveSuccess('All text and image changes have been saved permanently!');
      setTimeout(() => {
        setSaveSuccess(null);
      }, 4000);
    } catch {
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Revert / Cancel Draft
  const handleDiscardChanges = async () => {
    if (window.confirm('Revert all unsaved text and image edits back to the published version?')) {
      setSaving(true);
      try {
        await discardDraft();
        setSaveSuccess('Reverted edits back to published version.');
        setTimeout(() => setSaveSuccess(null), 3000);
      } finally {
        setSaving(false);
      }
    }
  };

  // Only render edit bar if admin mode is explicitly active
  if (!isAdmin) return null;

  return (
    <>
      {/* Top Fixed/Sticky Bar */}
      <header
        role="region"
        aria-label="Website Content Editor Bar"
        className={`w-full transition-colors duration-200 text-xs border-b ${
          editMode
            ? 'bg-[#181818] border-[#5B1018] text-white shadow-md'
            : 'bg-black border-[#292321] text-white'
        }`}
      >
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left Side: Status & Mode Indicator */}
          <div className="flex items-center gap-3">
            {editMode ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="font-bold uppercase tracking-wider text-emerald-400 text-[11px]">
                  EDIT MODE: ON
                </span>
                <span className="text-[#B8B8B3] text-[11px] hidden md:inline">
                  — Click on any text or image below to edit directly
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#B8B8B3]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8B8B3]/50"></span>
                <span className="font-semibold uppercase tracking-wider text-white text-[11px]">
                  WEBSITE MODE: VIEW ONLY
                </span>
                <span className="hidden lg:inline text-[#B8B8B3]/70 text-[11px]">
                  (Turn Edit Mode ON to edit text &amp; images)
                </span>
              </div>
            )}

            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-950 border border-emerald-500/80 text-emerald-300 text-[11px] font-semibold animate-fade-in">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>{saveSuccess}</span>
              </span>
            )}
          </div>

          {/* Right Side: Primary Controls (EDIT MODE ON/OFF + SAVE CHANGES) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* The Master EDIT MODE ON/OFF Toggle Switch */}
            <div className="inline-flex items-center bg-white/10 p-0.5 rounded-full border border-white/20">
              <button
                type="button"
                onClick={() => {
                  if (editMode) handleToggleEditMode();
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-all ${
                  !editMode
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
                title="View site as normal customer"
              >
                EDIT MODE: OFF
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editMode) handleToggleEditMode();
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 transition-all ${
                  editMode
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Turn on editing for text and photos"
              >
                <Pencil className="w-3 h-3" />
                <span>EDIT MODE: ON</span>
              </button>
            </div>

            {/* When in Edit Mode: The SAVE CHANGES Button */}
            {editMode && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAll}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#5B1018] hover:bg-[#430b11] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm border border-[#D8BFA8]/40"
                  title="Save all edited texts, images, and settings permanently"
                >
                  {saving ? (
                    <span>Saving Changes...</span>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-[#D8BFA8]" />
                      <span>SAVE CHANGES</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleDiscardChanges}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-white/70 hover:text-white text-[11px] uppercase tracking-wider transition-colors"
                  title="Revert unsaved changes"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Revert</span>
                </button>
              </>
            )}

            {/* CMS / Admin Panel Link */}
            {currentPath !== '/admin' && (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-white/60 hover:text-white text-[11px] uppercase tracking-wider transition-colors border-l border-white/20 pl-3"
                title="Open CMS for bulk product and media management"
              >
                <Settings className="w-3 h-3" />
                <span className="hidden sm:inline">Admin CMS</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Action Pill in bottom-right corner for effortless access anywhere on page */}
      <aside
        aria-label="Quick Editor Bar"
        className="fixed bottom-5 right-5 z-40 bg-black/90 backdrop-blur-md text-white p-2 border border-white/20 shadow-2xl flex items-center gap-2 text-xs"
      >
        <button
          type="button"
          onClick={handleToggleEditMode}
          className={`px-3 py-1.5 font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
            editMode
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-white text-black hover:bg-[#F5F5F5]'
          }`}
          title={editMode ? 'Click to turn Edit Mode OFF' : 'Click to turn Edit Mode ON'}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>{editMode ? 'EDIT MODE: ON' : 'EDIT MODE: OFF'}</span>
        </button>

        {editMode && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="px-3 py-1.5 bg-[#5B1018] hover:bg-[#430b11] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors"
            title="Save all changes to website"
          >
            <Save className="w-3.5 h-3.5 text-[#D8BFA8]" />
            <span>SAVE</span>
          </button>
        )}
      </aside>
    </>
  );
}
