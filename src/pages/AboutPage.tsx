import { useState } from 'react';
import { ArrowRight, Pencil } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { EditableText } from '../components/EditableText';
import {
  AboutEditorPanel,
  buildDefaultAboutBlocks,
  buildDefaultAboutIntro,
  buildDefaultAboutPhotos,
} from '../components/AboutEditorPanel';
import { LoopingVideo } from '../components/LoopingVideo';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const {
    settings,
    activeContent,
    categoriesWithOverrides,
    resolveMediaSrc,
    isAdmin,
    editMode,
  } = useStore();
  const [editorOpen, setEditorOpen] = useState(false);

  const introParagraphs =
    activeContent.aboutIntroParagraphs !== undefined
      ? activeContent.aboutIntroParagraphs
      : buildDefaultAboutIntro(settings);

  const aboutBlocks =
    activeContent.aboutBlocks !== undefined
      ? activeContent.aboutBlocks
      : buildDefaultAboutBlocks(settings);

  const aboutPhotos =
    activeContent.aboutPhotos !== undefined
      ? activeContent.aboutPhotos
      : buildDefaultAboutPhotos();

  const imagePlacement = activeContent.aboutImagePlacement || 'left';

  return (
    <div className="bg-white">
      <section className="bg-[#F5F5F5] border-b border-[#B8B8B3]/60 py-14 md:py-20">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <EditableText
                id="about.header.eyebrow"
                defaultText="Company Profile"
                label="About Page Eyebrow"
                as="p"
                className="text-xs font-semibold tracking-[0.12em] uppercase text-[#5B1018] mb-3"
              />
              <EditableText
                id="about.header.heading"
                defaultText="About SHREE DURGA STEELS"
                label="About Page Main Heading"
                as="h1"
                className="font-display text-3xl md:text-5xl font-semibold text-black tracking-tight max-w-3xl"
              />
              {introParagraphs.length > 0 && (
                <div className="mt-4 space-y-3 max-w-2xl">
                  {introParagraphs.map((para, idx) => (
                    <p
                      key={idx}
                      className="text-base md:text-lg text-[#292321]/85 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && editMode && (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5B1018] text-white text-xs font-semibold uppercase tracking-[0.06em] hover:bg-[#430b11] shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit About Us Blocks, Paragraphs &amp; Photos</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 border-b border-[#B8B8B3]/60">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {aboutPhotos.length > 0 && (
              <div
                className={`lg:col-span-6 space-y-6 ${
                  imagePlacement === 'right' ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                {aboutPhotos.map((photo, idx) => {
                  const isVideo = photo.mediaType === 'video' && Boolean(photo.videoId);
                  const resolved = resolveMediaSrc(photo.src);
                  if (!isVideo && !resolved) return null;
                  return (
                    <figure key={photo.id || idx} className="space-y-2">
                      <div className="border border-[#B8B8B3]/70 bg-[#F5F5F5] aspect-[4/3] overflow-hidden">
                        {isVideo ? (
                          <LoopingVideo
                            videoId={photo.videoId}
                            fallbackImgSrc={resolved}
                            fallbackAlt={
                              photo.alt ||
                              'SHREE DURGA STEELS stainless steel manufacturing environment'
                            }
                            style={{
                              objectPosition: photo.position || '50% 50%',
                              objectFit: photo.fit || 'cover',
                            }}
                            className="w-full h-full"
                          />
                        ) : (
                          <img
                            src={resolved}
                            alt={
                              photo.alt ||
                              'SHREE DURGA STEELS stainless steel manufacturing environment'
                            }
                            referrerPolicy="no-referrer"
                            style={{
                              objectPosition: photo.position || '50% 50%',
                              objectFit: photo.fit || 'cover',
                            }}
                            className="w-full h-full"
                          />
                        )}
                      </div>
                      {photo.caption && (
                        <figcaption className="text-xs text-[#292321]/75">
                          {photo.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            )}

            <div
              className={`${
                aboutPhotos.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'
              } space-y-8 ${
                imagePlacement === 'right' ? 'lg:order-1' : 'lg:order-2'
              }`}
            >
              {aboutBlocks.map((block, idx) => (
                <div
                  key={block.id || idx}
                  className={
                    idx < aboutBlocks.length - 1
                      ? 'pb-6 border-b border-[#B8B8B3]/50'
                      : ''
                  }
                >
                  {block.heading && (
                    <h2 className="font-display text-xl font-semibold text-black mb-2">
                      {block.heading}
                    </h2>
                  )}
                  <div className="space-y-2.5">
                    {block.paragraphs.map((para, pIdx) => (
                      <p
                        key={pIdx}
                        className="text-sm text-[#292321]/85 leading-relaxed"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-[#F5F5F5] border-b border-[#B8B8B3]/60">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
          <EditableText
            id="about.divisions.heading"
            defaultText="Core Manufacturing & Supply Divisions"
            label="About Divisions Heading"
            as="h2"
            className="font-display text-2xl font-semibold text-black mb-8"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categoriesWithOverrides.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-[#B8B8B3]/70 p-7 flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-black mb-2">
                    {category.title}
                  </h3>
                  <p className="text-sm text-[#292321]/80 leading-relaxed mb-6">
                    {category.shortDescription}
                  </p>
                </div>
                <a
                  href={`/products/${category.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`/products/${category.id}`);
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase text-[#5B1018] hover:text-black transition-colors"
                >
                  <EditableText
                    id="about.divisions.viewCta"
                    defaultText="View Category"
                    label="Division Card Button"
                    allowDelete={false}
                  />
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <EditableText
              id="about.cta.heading"
              defaultText="Discuss Your Wholesale or Commercial Requirements"
              label="About Bottom CTA Heading"
              as="h2"
              className="font-display text-2xl font-semibold text-black"
            />
            <EditableText
              id="about.cta.description"
              defaultText="Submit a multi-product quotation request or connect directly with our team."
              label="About Bottom CTA Description"
              as="p"
              multiline
              allowExtraParagraphs
              className="mt-2 text-sm text-[#292321]/80"
            />
          </div>
          <a
            href="/quote"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/quote');
            }}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#5B1018] text-white text-xs font-semibold tracking-[0.08em] uppercase hover:bg-[#430b11] transition-colors whitespace-nowrap shrink-0"
          >
            <EditableText
              id="about.cta.button"
              defaultText="GET A QUOTE"
              label="About Bottom CTA Button"
              allowDelete={false}
            />
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-[75] bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-black max-w-4xl w-full p-6 max-h-[92vh] overflow-y-auto">
            <AboutEditorPanel isModal onClose={() => setEditorOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
