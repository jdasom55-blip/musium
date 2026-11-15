import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { X } from 'lucide-react';
import { ArtworkModal } from './components/ArtworkModal';
import { CatalogSection } from './components/CatalogSection';
import { MuseumCanvas2D } from './components/MuseumCanvas2D';
import { UploadArtworkModal } from './components/UploadArtworkModal';
import { CURATED_ARTWORKS } from './data/curatedArtworks';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
} from './firebase';
import type { MuseumArtwork, MuseumReview } from './types/museum';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [communityArtworks, setCommunityArtworks] = useState<MuseumArtwork[]>([]);
  const [curatedReviewsMap, setCuratedReviewsMap] = useState<Record<string, MuseumReview[]>>({});
  const [loadingArtworks, setLoadingArtworks] = useState(true);

  const [selectedArtwork, setSelectedArtwork] = useState<MuseumArtwork | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [focusArtworkId, setFocusArtworkId] = useState<string | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to published artworks in Firestore
  useEffect(() => {
    if (!authReady) return;

    const path = 'artworks';
    const q = query(collection(db, path), where('status', '==', 'published'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: MuseumArtwork[] = snapshot.docs.map((d, idx) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();
          const frameStyles: Array<'walnut' | 'brass' | 'ebony'> = ['walnut', 'brass', 'ebony'];
          return {
            id: d.id,
            title: String(data.title ?? '무제'),
            artistName: String(data.artistName ?? '익명 작가'),
            description: String(data.description ?? ''),
            imageUrl: String(data.imageDataUrl ?? ''),
            isCurated: false,
            accessionNo: `VIS. ${String(idx + 1).padStart(2, '0')}`,
            mediumLabel: `${Number(data.width ?? 0)} × ${Number(data.height ?? 0)} px · 디지털 압축`,
            compressedSizeBytes: Number(data.compressedSizeBytes ?? 0),
            width: Number(data.width ?? 1200),
            height: Number(data.height ?? 900),
            authorUid: String(data.authorUid ?? ''),
            createdAtMs,
            frameStyle: frameStyles[idx % frameStyles.length],
          };
        });

        // Sort oldest-to-newest so gallery wall slots stay stable as new works append
        items.sort((a, b) => a.createdAtMs - b.createdAtMs);
        // Re-assign sequential VIS accession numbers after sorting
        const numbered = items.map((item, idx) => ({
          ...item,
          accessionNo: `VIS. ${String(idx + 1).padStart(2, '0')}`,
        }));

        setCommunityArtworks(numbered);
        setLoadingArtworks(false);
      },
      (error) => {
        setLoadingArtworks(false);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [authReady]);

  // Subscribe to curated exhibition reviews in Firestore
  useEffect(() => {
    if (!authReady) return;

    const path = 'curated_reviews';
    const q = query(collection(db, path), where('status', '==', 'visible'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const grouped: Record<string, MuseumReview[]> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const curatedId = String(data.curatedId ?? '');
          const createdAtMs =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();
          if (!grouped[curatedId]) grouped[curatedId] = [];
          grouped[curatedId].push({
            id: d.id,
            visitorName: String(data.visitorName ?? ''),
            content: String(data.content ?? ''),
            authorUid: String(data.authorUid ?? ''),
            createdAtMs,
          });
        });

        Object.keys(grouped).forEach((k) => {
          grouped[k].sort((a, b) => b.createdAtMs - a.createdAtMs);
        });
        setCuratedReviewsMap(grouped);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [authReady]);

  const allArtworks = useMemo(
    () => [...CURATED_ARTWORKS, ...communityArtworks],
    [communityArtworks]
  );

  const reviewCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CURATED_ARTWORKS.forEach((c) => {
      counts[c.id] = curatedReviewsMap[c.id]?.length ?? 0;
    });
    return counts;
  }, [curatedReviewsMap]);

  const isAnyModalOpen = Boolean(selectedArtwork) || isUploadOpen || isGuideOpen;

  const handleClearFocus = useCallback(() => {
    setFocusArtworkId(null);
  }, []);

  const handleWalkToArtwork = (artworkId: string) => {
    setFocusArtworkId(artworkId);
    document.getElementById('museum-hall')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAuthToggle = async () => {
    if (user) {
      await signOutUser();
    } else {
      await signInWithGoogle();
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-[#DED6C8] bg-[#FBF9F5]/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#museum-hall"
            className="font-museum-serif text-xl font-bold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
          >
            아틀리에 미술관
          </a>

          {/* Zone 2: Concise Single-line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]">
            <a
              href="#museum-hall"
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              가상 전시실
            </a>
            <a
              href="#catalog-section"
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              작품 도록
            </a>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              관람 안내
            </button>
            <button
              type="button"
              onClick={handleAuthToggle}
              className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {user ? `로그아웃 (${user.displayName?.split(' ')[0] || '관람객'})` : 'Google 로그인'}
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="rounded-lg bg-[#9A3412] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C2D12] transition-colors whitespace-nowrap shrink-0"
            >
              작품 전시하기
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Curatorial Intro Ribbon + 2D Museum Hall */}
        <div id="museum-hall" className="mx-auto max-w-7xl px-4 pt-6 pb-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="font-museum-mono text-xs uppercase tracking-widest text-[#78716C]">
                2D INTERACTIVE VIRTUAL MUSEUM · HALL I &amp; II
              </p>
              <h1 className="mt-1 font-museum-serif text-3xl font-semibold tracking-tight text-[#1C1917] sm:text-4xl">
                빛과 여백의 2D 회랑
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#57534E]">
              <span>상설전 {CURATED_ARTWORKS.length}점</span>
              <span aria-hidden="true">·</span>
              <span>
                관람객 출품 {loadingArtworks ? '...' : `${communityArtworks.length}점`}
              </span>
              <span aria-hidden="true">·</span>
              <span>1MB 이하 자동 압축 저장</span>
            </div>
          </div>

          <MuseumCanvas2D
            artworks={allArtworks}
            reviewCounts={reviewCounts}
            isModalOpen={isAnyModalOpen}
            focusArtworkId={focusArtworkId}
            onClearFocusArtwork={handleClearFocus}
            onSelectArtwork={(art) => setSelectedArtwork(art)}
          />
        </div>

        {/* Exhibition Catalog Archive */}
        <CatalogSection
          artworks={allArtworks}
          onInspectArtwork={(art) => setSelectedArtwork(art)}
          onWalkToArtwork={handleWalkToArtwork}
        />
      </main>

      {/* Quiet Museum Footer */}
      <footer className="border-t border-[#DED6C8] bg-[#F4EFE6]/60 px-4 py-6 text-center text-xs text-[#57534E]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row sm:px-4">
          <span className="font-museum-serif text-sm font-medium text-[#1C1917]">
            아틀리에 2D 가상 미술관
          </span>
          <span>전시 작품 및 관람객 감상평은 Firebase에 실시간으로 보존됩니다.</span>
        </div>
      </footer>

      {/* Artwork Appreciation & Review Modal */}
      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          user={user}
          curatedReviews={
            selectedArtwork.isCurated ? curatedReviewsMap[selectedArtwork.id] ?? [] : []
          }
          onClose={() => setSelectedArtwork(null)}
          onArtworkDeleted={() => setSelectedArtwork(null)}
        />
      )}

      {/* Upload & 1MB Compress Artwork Modal */}
      {isUploadOpen && (
        <UploadArtworkModal
          user={user}
          onClose={() => setIsUploadOpen(false)}
          onUploaded={(newId) => {
            setIsUploadOpen(false);
            if (newId) {
              setFocusArtworkId(newId);
            }
          }}
        />
      )}

      {/* Museum Guide Modal */}
      {isGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/60 p-4 backdrop-blur-xs"
          onClick={() => setIsGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[#D8D0C3] bg-[#FBF9F5] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-4">
              <h2
                id="guide-modal-title"
                className="font-museum-serif text-2xl font-semibold text-[#1C1917]"
              >
                미술관 관람 안내
              </h2>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                aria-label="관람 안내 닫기"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#57534E] hover:bg-[#F3EFE7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-4 space-y-4 text-sm text-[#292524]">
              <div>
                <dt className="font-semibold text-[#1C1917]">01. 2D 캐릭터 이동</dt>
                <dd className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  키보드 방향키 또는 WASD 키로 캐릭터를 움직이거나, 미술관 바닥을 직접 클릭해 원하는 위치로 걸어갈 수 있습니다. 모바일에서는 좌측 하단 방향 패드를 이용해 주세요.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#1C1917]">02. 작품 감상 및 감상평 남기기</dt>
                <dd className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  벽에 걸린 액자를 직접 클릭하거나, 캐릭터가 작품 앞에 섰을 때 스페이스바(Space)를 누르면 작품을 크게 확대해 보고 이름과 감상평을 Firebase에 남길 수 있습니다.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#1C1917]">03. 내 작품 1MB 이하 압축 전시</dt>
                <dd className="mt-1 text-xs leading-relaxed text-[#57534E]">
                  상단의 &lsquo;작품 전시하기&rsquo;를 눌러 컴퓨터의 이미지 파일을 선택하면 자동으로 1MB 이하로 압축됩니다. 작가 이름과 작품 제목을 작성해 저장하면 Hall II 전시 벽면에 바로 걸립니다.
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end border-t border-[#E5DEC9] pt-4">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="rounded-lg bg-[#1C1917] px-4 py-2 text-xs font-medium text-white hover:bg-[#292524]"
              >
                관람 시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
