import React, { useState } from 'react';
import { Eye, Footprints } from 'lucide-react';
import type { MuseumArtwork } from '../types/museum';
import { formatBytes } from '../utils/imageCompressor';

interface CatalogSectionProps {
  artworks: MuseumArtwork[];
  onInspectArtwork: (artwork: MuseumArtwork) => void;
  onWalkToArtwork: (artworkId: string) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  artworks,
  onInspectArtwork,
  onWalkToArtwork,
}) => {
  const [filter, setFilter] = useState<'all' | 'curated' | 'community'>('all');

  const filtered = artworks.filter((item) => {
    if (filter === 'curated') return item.isCurated;
    if (filter === 'community') return !item.isCurated;
    return true;
  });

  const curatedCount = artworks.filter((a) => a.isCurated).length;
  const communityCount = artworks.filter((a) => !a.isCurated).length;

  return (
    <section
      id="catalog-section"
      aria-labelledby="catalog-heading"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-[#DED6C8] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-museum-mono text-xs uppercase tracking-widest text-[#78716C]">
            EXHIBITION ARCHIVE · {artworks.length} WORKS
          </p>
          <h2
            id="catalog-heading"
            className="mt-1.5 font-museum-serif text-3xl font-semibold text-[#1C1917]"
          >
            전시 작품 도록
          </h2>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-[#DED6C8] bg-[#F4EFE6] p-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            전체 ({artworks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('curated')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'curated'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            상설 기획전 ({curatedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('community')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'community'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            관람객 출품작 ({communityCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-[#CFC6B8] bg-[#F4EFE6]/50 px-6 py-12 text-center">
          <p className="font-museum-serif text-xl font-medium text-[#1C1917]">
            아직 출품된 관람객 작품이 없습니다
          </p>
          <p className="mt-2 text-sm text-[#57534E]">
            상단의 &lsquo;작품 전시하기&rsquo; 버튼을 눌러 첫 번째 작품을 등록해 보세요.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((art) => (
            <article
              key={art.id}
              className="group flex flex-col justify-between rounded-xl border border-[#DFD7CA] bg-white p-4 transition-shadow duration-200 hover:shadow-md"
            >
              <div>
                <button
                  type="button"
                  onClick={() => onInspectArtwork(art)}
                  className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#E5DEC9] bg-[#EBE6DF]"
                >
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>

                <div className="mt-3.5">
                  <div className="flex items-center gap-2 text-[11px] text-[#78716C]">
                    <span className="font-museum-mono">{art.accessionNo}</span>
                    <span aria-hidden="true">·</span>
                    <span>{art.isCurated ? '상설 소장' : '관람객 출품'}</span>
                    {art.compressedSizeBytes && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-museum-mono">
                          {formatBytes(art.compressedSizeBytes)}
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="mt-1 truncate font-museum-serif text-lg font-semibold text-[#1C1917]">
                    {art.title}
                  </h3>
                  <p className="mt-0.5 truncate text-xs font-medium text-[#57534E]">
                    {art.artistName}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-[#F0EAE0] pt-3">
                <button
                  type="button"
                  onClick={() => onInspectArtwork(art)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#F4EFE6] px-3 py-2 text-xs font-medium text-[#1C1917] hover:bg-[#EBE3D5] transition-colors whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5 text-[#9A3412]" />
                  <span>감상 및 리뷰</span>
                </button>
                <button
                  type="button"
                  onClick={() => onWalkToArtwork(art.id)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#DED6C8] px-3 py-2 text-xs font-medium text-[#44403C] hover:border-[#9A3412]/50 hover:text-[#9A3412] transition-colors whitespace-nowrap"
                  title="2D 캐릭터를 이 작품 앞으로 이동"
                >
                  <Footprints className="h-3.5 w-3.5" />
                  <span>이동</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
