import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { Maximize2, Minimize2, Trash2, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { MuseumArtwork, MuseumReview } from '../types/museum';
import { formatBytes } from '../utils/imageCompressor';

interface ArtworkModalProps {
  artwork: MuseumArtwork;
  user: User | null;
  curatedReviews: MuseumReview[];
  onClose: () => void;
  onArtworkDeleted: (artworkId: string) => void;
}

export const ArtworkModal: React.FC<ArtworkModalProps> = ({
  artwork,
  user,
  curatedReviews,
  onClose,
  onArtworkDeleted,
}) => {
  const [comments, setComments] = useState<MuseumReview[]>([]);
  const [loadingComments, setLoadingComments] = useState(!artwork.isCurated);
  const [visitorName, setVisitorName] = useState(user?.displayName?.slice(0, 40) || '');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [confirmDeleteArt, setConfirmDeleteArt] = useState(false);
  const [deletingArt, setDeletingArt] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName && !visitorName) {
      setVisitorName(user.displayName.slice(0, 40));
    }
  }, [user, visitorName]);

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Subscribe to comments for user-uploaded artworks
  useEffect(() => {
    if (artwork.isCurated) {
      setLoadingComments(false);
      return;
    }

    const path = `artworks/${artwork.id}/comments`;
    const q = query(collection(db, 'artworks', artwork.id, 'comments'), where('status', '==', 'visible'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: MuseumReview[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAtMs =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();
          return {
            id: d.id,
            visitorName: String(data.visitorName ?? ''),
            content: String(data.content ?? ''),
            authorUid: String(data.authorUid ?? ''),
            createdAtMs,
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setComments(list);
        setLoadingComments(false);
      },
      (error) => {
        setLoadingComments(false);
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [artwork.id, artwork.isCurated]);

  const displayedReviews = artwork.isCurated ? curatedReviews : comments;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = visitorName.trim();
    const trimmedContent = content.trim();

    if (!trimmedName) {
      setFormError('이름을 입력해 주세요.');
      return;
    }
    if (!trimmedContent) {
      setFormError('감상평을 입력해 주세요.');
      return;
    }

    if (user && !user.emailVerified) {
      setFormError('이메일 인증이 완료된 Google 계정으로만 감상평을 남길 수 있습니다.');
      return;
    }

    const authorUid = user ? user.uid : 'guest';

    setSubmitting(true);
    try {
      if (artwork.isCurated) {
        const path = 'curated_reviews';
        try {
          await addDoc(collection(db, path), {
            curatedId: artwork.id,
            visitorName: trimmedName.slice(0, 40),
            content: trimmedContent.slice(0, 500),
            authorUid,
            status: 'visible',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      } else {
        const path = `artworks/${artwork.id}/comments`;
        try {
          await addDoc(collection(db, 'artworks', artwork.id, 'comments'), {
            artworkId: artwork.id,
            visitorName: trimmedName.slice(0, 40),
            content: trimmedContent.slice(0, 500),
            authorUid,
            status: 'visible',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
      }
      setContent('');
    } catch (err) {
      setFormError('감상평 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeletingReviewId(reviewId);
    try {
      if (artwork.isCurated) {
        const path = `curated_reviews/${reviewId}`;
        try {
          await deleteDoc(doc(db, 'curated_reviews', reviewId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      } else {
        const path = `artworks/${artwork.id}/comments/${reviewId}`;
        try {
          await deleteDoc(doc(db, 'artworks', artwork.id, 'comments', reviewId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleDeleteArtwork = async () => {
    if (artwork.isCurated || !user || artwork.authorUid !== user.uid) return;
    setDeletingArt(true);
    const path = `artworks/${artwork.id}`;
    try {
      await deleteDoc(doc(db, 'artworks', artwork.id));
      onArtworkDeleted(artwork.id);
    } catch (error) {
      setDeletingArt(false);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const formatDate = (ms: number) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/60 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="artwork-modal-title"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#D8D0C3] bg-[#FBF9F5] shadow-2xl lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Museum Artwork Viewer */}
        <div className="relative flex flex-1 flex-col items-center justify-center bg-[#EBE6DF] p-6 lg:p-10">
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="font-museum-mono text-xs uppercase tracking-widest text-[#57534E]">
              {artwork.accessionNo}
            </span>
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D8D0C3] bg-[#FBF9F5]/90 px-2.5 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-white transition-colors"
            >
              {zoomed ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>기본 크기</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>작품 확대</span>
                </>
              )}
            </button>
          </div>

          <div
            className={`mt-6 overflow-auto transition-transform duration-200 ${
              zoomed ? 'max-h-[72vh] w-full' : 'max-h-[420px] lg:max-h-[540px]'
            }`}
          >
            <div className="mx-auto inline-block border-[10px] border-[#4A3529] bg-[#FBF9F5] p-3 shadow-[0_20px_40px_-14px_rgba(28,25,23,0.45)]">
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                referrerPolicy="no-referrer"
                className={`block object-contain transition-transform duration-200 ${
                  zoomed ? 'max-h-none w-full' : 'max-h-[360px] lg:max-h-[470px] w-auto'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Right: Curatorial Placard & Visitor Reviews */}
        <div className="flex w-full flex-col border-t border-[#DED6C8] bg-[#FBF9F5] lg:w-[440px] lg:border-t-0 lg:border-l">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[#E5DEC9] px-6 py-5">
            <div className="min-w-0">
              <p className="font-museum-mono text-[11px] uppercase tracking-widest text-[#78716C]">
                {artwork.isCurated ? '상설 기획전 소장품' : '관람객 전시 작품'}
              </p>
              <h2
                id="artwork-modal-title"
                className="mt-1 font-museum-serif text-2xl font-semibold leading-tight text-[#1C1917]"
              >
                {artwork.title}
              </h2>
              <p className="mt-1 text-sm font-medium text-[#44403C]">{artwork.artistName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="작품 감상 창 닫기"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent text-[#57534E] hover:border-[#DED6C8] hover:bg-[#F3EFE7] hover:text-[#1C1917] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Metadata & Curatorial Description */}
          <div className="border-b border-[#E5DEC9] px-6 py-4 text-sm">
            {artwork.description && (
              <p className="mb-3 leading-relaxed text-[#44403C]">{artwork.description}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[#57534E]">
              <div>
                <dt className="text-[#78716C]">규격 / 매체</dt>
                <dd className="mt-0.5 font-museum-mono text-[#292524]">{artwork.mediumLabel}</dd>
              </div>
              {artwork.compressedSizeBytes ? (
                <div>
                  <dt className="text-[#78716C]">저장 용량 (1MB 이하)</dt>
                  <dd className="mt-0.5 font-museum-mono text-[#292524]">
                    {formatBytes(artwork.compressedSizeBytes)}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-[#78716C]">분류</dt>
                  <dd className="mt-0.5 text-[#292524]">아틀리에 상설전</dd>
                </div>
              )}
            </dl>

            {/* Owner Delete Action */}
            {!artwork.isCurated && user && artwork.authorUid === user.uid && (
              <div className="mt-4 flex items-center justify-end border-t border-[#EBE4D8] pt-3">
                {!confirmDeleteArt ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteArt(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716C] hover:text-[#9A3412] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>내 작품 내리기</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9A3412]">정말 미술관에서 내릴까요?</span>
                    <button
                      type="button"
                      disabled={deletingArt}
                      onClick={handleDeleteArtwork}
                      className="rounded-md bg-[#9A3412] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#7C2D12] disabled:opacity-50"
                    >
                      {deletingArt ? '삭제 중...' : '확인'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteArt(false)}
                      className="rounded-md border border-[#D8D0C3] px-2.5 py-1 text-xs text-[#44403C] hover:bg-[#F3EFE7]"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visitor Reviews List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                관람객 감상평
              </h3>
              <span className="font-museum-mono text-xs text-[#78716C]">
                {displayedReviews.length}건
              </span>
            </div>

            {loadingComments ? (
              <p className="py-6 text-center text-xs text-[#78716C]">감상평을 불러오는 중입니다...</p>
            ) : displayedReviews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#DFD7CA] bg-[#F5F1E8]/60 px-4 py-6 text-center">
                <p className="text-xs text-[#57534E]">
                  아직 남겨진 감상평이 없습니다. 첫 번째 감상평을 남겨보세요.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {displayedReviews.map((rev) => (
                  <li
                    key={rev.id}
                    className="rounded-lg border border-[#E5DEC9] bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1C1917]">
                        {rev.visitorName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-museum-mono text-[11px] text-[#78716C]">
                          {formatDate(rev.createdAtMs)}
                        </span>
                        {user && rev.authorUid === user.uid && (
                          <button
                            type="button"
                            disabled={deletingReviewId === rev.id}
                            onClick={() => handleDeleteReview(rev.id)}
                            aria-label="내 감상평 삭제"
                            className="text-[#78716C] hover:text-[#9A3412] disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#292524]">
                      {rev.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add Name & Review Form */}
          <form
            onSubmit={handleSubmitReview}
            className="border-t border-[#DED6C8] bg-[#F4EFE6] px-6 py-4"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <label
                htmlFor="review-visitor-name"
                className="text-xs font-semibold text-[#292524]"
              >
                이름과 감상평 남기기
              </label>
              <span className="font-museum-mono text-[11px] text-[#78716C]">
                {content.length}/500
              </span>
            </div>

            <div className="space-y-2.5">
              <input
                id="review-visitor-name"
                type="text"
                maxLength={40}
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="관람객 이름"
                className="w-full rounded-lg border border-[#D8D0C3] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:outline-none"
              />
              <textarea
                rows={2}
                maxLength={500}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="작품을 보며 느낀 인상이나 감상을 남겨주세요..."
                className="w-full resize-none rounded-lg border border-[#D8D0C3] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:outline-none"
              />

              {formError && (
                <p className="text-xs font-medium text-[#9A3412]" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#9A3412] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#7C2D12] disabled:opacity-50 transition-colors"
              >
                {submitting ? '저장하는 중...' : '감상평 남기기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
