import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { CheckCircle2, ImagePlus, Upload, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType, signInWithGoogle } from '../firebase';
import {
  compressImageUnder1MB,
  formatBytes,
  type CompressedImageResult,
} from '../utils/imageCompressor';

interface UploadArtworkModalProps {
  user: User | null;
  onClose: () => void;
  onUploaded: (newArtworkId: string) => void;
}

export const UploadArtworkModal: React.FC<UploadArtworkModalProps> = ({
  user,
  onClose,
  onUploaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [artistName, setArtistName] = useState(user?.displayName?.slice(0, 50) || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressed, setCompressed] = useState<CompressedImageResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (user?.displayName && !artistName) {
      setArtistName(user.displayName.slice(0, 50));
    }
  }, [user, artistName]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setCompressing(true);
    try {
      const result = await compressImageUnder1MB(file);
      setCompressed(result);
    } catch (err) {
      setCompressed(null);
      setErrorMsg(
        err instanceof Error ? err.message : '이미지 압축 중 오류가 발생했습니다.'
      );
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!compressed) {
      setErrorMsg('먼저 컴퓨터에서 미술작품 이미지를 선택해 주세요.');
      return;
    }
    const trimmedArtist = artistName.trim();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedArtist) {
      setErrorMsg('작가 이름을 입력해 주세요.');
      return;
    }
    if (!trimmedTitle) {
      setErrorMsg('작품 제목을 입력해 주세요.');
      return;
    }
    if (compressed.compressedSizeBytes > 1_048_576 || compressed.dataUrl.length > 920_000) {
      setErrorMsg('압축된 이미지가 1MB 제한을 초과했습니다. 다른 이미지를 선택해 주세요.');
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      try {
        const cred = await signInWithGoogle();
        currentUser = cred.user;
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? `Google 로그인에 실패했습니다: ${err.message}`
            : 'Google 로그인에 실패했습니다.'
        );
        return;
      }
    }

    if (!currentUser.emailVerified) {
      setErrorMsg('이메일 인증이 완료된 Google 계정으로만 작품을 전시할 수 있습니다.');
      return;
    }

    setSaving(true);
    const path = 'artworks';
    try {
      const payload: Record<string, unknown> = {
        title: trimmedTitle.slice(0, 80),
        artistName: trimmedArtist.slice(0, 50),
        imageDataUrl: compressed.dataUrl,
        compressedSizeBytes: compressed.compressedSizeBytes,
        width: compressed.width,
        height: compressed.height,
        authorUid: currentUser.uid,
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (trimmedDesc) {
        payload.description = trimmedDesc.slice(0, 500);
      }

      let docId = '';
      try {
        const docRef = await addDoc(collection(db, path), payload);
        docId = docRef.id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }

      onUploaded(docId);
    } catch (err) {
      setErrorMsg('작품을 Firebase에 저장하지 못했습니다. 다시 시도해 주세요.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/60 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#D8D0C3] bg-[#FBF9F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DEC9] px-6 py-5">
          <div>
            <p className="font-museum-mono text-[11px] uppercase tracking-widest text-[#78716C]">
              HALL II · VISITOR EXHIBITION
            </p>
            <h2
              id="upload-modal-title"
              className="mt-1 font-museum-serif text-2xl font-semibold text-[#1C1917]"
            >
              내 미술작품 전시하기
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="업로드 창 닫기"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[#57534E] hover:bg-[#F3EFE7] hover:text-[#1C1917] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Image File Picker + 1MB Compression Preview */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#292524]">
                작품 이미지 (자동 1MB 이하 압축)
              </span>
              {compressed && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#14532D]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>1MB 이하 압축 완료</span>
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!compressed ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? 'border-[#9A3412] bg-[#9A3412]/5'
                    : 'border-[#CFC6B8] bg-[#F4EFE6]/60 hover:border-[#9A3412]/60'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DED6C8] bg-[#FBF9F5] text-[#9A3412]">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-medium text-[#1C1917]">
                  {compressing
                    ? '이미지를 1MB 이하로 압축하는 중입니다...'
                    : '컴퓨터에서 미술작품 이미지를 선택하거나 끌어다 놓으세요'}
                </p>
                <p className="mt-1 text-xs text-[#57534E]">
                  고용량 JPG, PNG, WebP 파일도 자동으로 1MB 이하로 최적화하여 저장합니다.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#DED6C8] bg-[#EBE6DF] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="mx-auto shrink-0 border-[6px] border-[#5C4033] bg-[#FBF9F5] p-2 shadow-md">
                    <img
                      src={compressed.dataUrl}
                      alt="압축된 작품 미리보기"
                      className="h-36 w-44 object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-1.5">
                      <span className="text-[#57534E]">원본 용량</span>
                      <span className="font-museum-mono text-[#292524]">
                        {formatBytes(compressed.originalSizeBytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-1.5">
                      <span className="text-[#57534E]">압축 후 용량</span>
                      <span className="font-museum-mono font-semibold text-[#14532D]">
                        {formatBytes(compressed.compressedSizeBytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[#D8D0C3] pb-1.5">
                      <span className="text-[#57534E]">해상도</span>
                      <span className="font-museum-mono text-[#292524]">
                        {compressed.width} × {compressed.height} px
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#CFC6B8] bg-[#FBF9F5] px-3 py-1.5 text-xs font-medium text-[#1C1917] hover:bg-white transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>다른 작품 선택</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Artist Name & Artwork Title */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="upload-artist-name"
                className="mb-1.5 block text-xs font-semibold text-[#292524]"
              >
                이름 (작가명) <span className="text-[#9A3412]">*</span>
              </label>
              <input
                id="upload-artist-name"
                type="text"
                maxLength={50}
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="예: 김아틀리에"
                className="w-full rounded-lg border border-[#D8D0C3] bg-white px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="upload-artwork-title"
                className="mb-1.5 block text-xs font-semibold text-[#292524]"
              >
                작품 제목 <span className="text-[#9A3412]">*</span>
              </label>
              <input
                id="upload-artwork-title"
                type="text"
                maxLength={80}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 가을 창가의 빛"
                className="w-full rounded-lg border border-[#D8D0C3] bg-white px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="upload-artwork-desc"
                className="block text-xs font-semibold text-[#292524]"
              >
                작품 설명 (선택)
              </label>
              <span className="font-museum-mono text-[11px] text-[#78716C]">
                {description.length}/500
              </span>
            </div>
            <textarea
              id="upload-artwork-desc"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="작품에 담긴 이야기나 제작 기법을 자유롭게 적어주세요."
              className="w-full resize-none rounded-lg border border-[#D8D0C3] bg-white px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#9A3412] focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-[#9A3412]/30 bg-[#9A3412]/10 px-4 py-2.5 text-xs font-medium text-[#9A3412]"
            >
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#E5DEC9] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#D8D0C3] px-4 py-2.5 text-sm font-medium text-[#44403C] hover:bg-[#F3EFE7] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || compressing}
              className="rounded-lg bg-[#9A3412] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7C2D12] disabled:opacity-50 transition-colors"
            >
              {saving
                ? '파이어베이스에 저장 중...'
                : user
                  ? '저장하고 미술관에 걸기'
                  : 'Google 로그인 후 저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
