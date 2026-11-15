import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Eye, MessageSquare } from 'lucide-react';
import type { MuseumArtwork } from '../types/museum';

interface MuseumCanvas2DProps {
  artworks: MuseumArtwork[];
  reviewCounts: Record<string, number>;
  isModalOpen: boolean;
  focusArtworkId: string | null;
  onClearFocusArtwork: () => void;
  onSelectArtwork: (artwork: MuseumArtwork) => void;
}

interface PlacedArtwork {
  artwork: MuseumArtwork;
  x: number; // center X in world coordinates
  isCuratedWing: boolean;
}

const WORLD_PADDING_LEFT = 220;
const ARTWORK_SPACING = 400;
const WING_DIVIDER_GAP = 220;
const WORLD_PADDING_RIGHT = 260;

// Walkable floor vertical bounds (in pixels within the 620px tall museum stage)
const STAGE_HEIGHT = 600;
const WALL_HEIGHT = 330;
const FLOOR_MIN_Y = 365;
const FLOOR_MAX_Y = 555;
const CHARACTER_SPEED = 290; // px/sec

type FacingDir = 'front' | 'back' | 'left' | 'right';
type GalleryTheme = 'classic' | 'modern' | 'minimal';

interface ThemeConfig {
  label: string;
  outerBorder: string;
  outerBg: string;
  wallBorder: string;
  wallBackground: string;
  trackColor: string;
  showWainscoting: boolean;
  wainscotingBg: string;
  wainscotingBorder: string;
  wingLabelText: string;
  wingTitleText: string;
  wingAccentText: string;
  pillarClass: string;
  emptyCardClass: string;
  floorColor: string;
  floorGrid: string;
  floorGridSize: string;
  spotlightNear: string;
  spotlightIdle: string;
  plaqueClass: string;
  plaqueTitleClass: string;
  plaqueMetaClass: string;
  benchLegFill: string;
  benchTopFill: string;
  benchHighlightFill: string;
  planterPotFill: string;
  planterRimFill: string;
  rippleBorder: string;
  ringOffsetClass: string;
}

const GALLERY_THEMES: Record<GalleryTheme, ThemeConfig> = {
  classic: {
    label: '고전',
    outerBorder: 'border-[#E2DBD0]',
    outerBg: 'bg-[#EBE6DF]',
    wallBorder: 'border-[#D8D0C3]',
    wallBackground: 'linear-gradient(180deg, #F4F0E8 0%, #FBF9F5 45%, #F4EFE6 100%)',
    trackColor: 'bg-[#292524]',
    showWainscoting: true,
    wainscotingBg: 'bg-[#EFEAE0]',
    wainscotingBorder: 'border-[#E4DDD0]',
    wingLabelText: 'text-[#78716C]',
    wingTitleText: 'text-[#44403C]',
    wingAccentText: 'text-[#9A3412]',
    pillarClass:
      'border-[#DED6C8] bg-gradient-to-r from-[#EAE4D9] via-[#F9F7F2] to-[#E5DED2]',
    emptyCardClass: 'border-[#CFC6B8] bg-[#FBF9F5]/85 text-[#1C1917]',
    floorColor: '#E9E3D8',
    floorGrid:
      'linear-gradient(to right, rgba(120,113,108,0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.09) 1px, transparent 1px)',
    floorGridSize: '88px 54px',
    spotlightNear:
      'linear-gradient(180deg, rgba(254, 243, 199, 0.58) 0%, rgba(254, 243, 199, 0) 92%)',
    spotlightIdle:
      'linear-gradient(180deg, rgba(254, 243, 199, 0.28) 0%, rgba(254, 243, 199, 0) 90%)',
    plaqueClass: 'border-[#DED6C8] bg-[#FBF9F5]/95',
    plaqueTitleClass: 'text-[#1C1917]',
    plaqueMetaClass: 'text-[#57534E]',
    benchLegFill: '#44403C',
    benchTopFill: '#A6825E',
    benchHighlightFill: '#C49E76',
    planterPotFill: '#9A3412',
    planterRimFill: '#7C2D12',
    rippleBorder: 'border-[#9A3412]/70',
    ringOffsetClass: 'ring-offset-[#F7F4EE]',
  },
  modern: {
    label: '모던',
    outerBorder: 'border-[#2E3136]',
    outerBg: 'bg-[#1D1F22]',
    wallBorder: 'border-[#383B40]',
    wallBackground: 'linear-gradient(180deg, #1B1D20 0%, #25282C 52%, #1E2024 100%)',
    trackColor: 'bg-[#0C0D0E]',
    showWainscoting: false,
    wainscotingBg: 'bg-[#1A1C1F]',
    wainscotingBorder: 'border-[#2E3136]',
    wingLabelText: 'text-[#A1A1AA]',
    wingTitleText: 'text-[#F4F4F5]',
    wingAccentText: 'text-[#FDBA74]',
    pillarClass:
      'border-[#3F4248] bg-gradient-to-r from-[#26282C] via-[#32353B] to-[#222428]',
    emptyCardClass: 'border-[#3F4248] bg-[#18191B]/85 text-[#F4F4F5]',
    floorColor: '#2B2E33',
    floorGrid:
      'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)',
    floorGridSize: '112px 68px',
    spotlightNear:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 92%)',
    spotlightIdle:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 90%)',
    plaqueClass: 'border-[#3F4248] bg-[#18191B]/95',
    plaqueTitleClass: 'text-[#F5F5F4]',
    plaqueMetaClass: 'text-[#A8A29E]',
    benchLegFill: '#18181B',
    benchTopFill: '#52525B',
    benchHighlightFill: '#71717A',
    planterPotFill: '#3F3F46',
    planterRimFill: '#27272A',
    rippleBorder: 'border-[#FDBA74]/80',
    ringOffsetClass: 'ring-offset-[#23262A]',
  },
  minimal: {
    label: '미니멀',
    outerBorder: 'border-[#E5E5E5]',
    outerBg: 'bg-[#F5F5F5]',
    wallBorder: 'border-[#E5E5E5]',
    wallBackground: 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 60%, #FAFAFA 100%)',
    trackColor: 'bg-[#D4D4D4]',
    showWainscoting: false,
    wainscotingBg: 'bg-[#FAFAFA]',
    wainscotingBorder: 'border-[#EFEFEF]',
    wingLabelText: 'text-[#737373]',
    wingTitleText: 'text-[#171717]',
    wingAccentText: 'text-[#171717]',
    pillarClass: 'border-[#E5E5E5] bg-[#F7F7F7]',
    emptyCardClass: 'border-[#D4D4D4] bg-white/90 text-[#171717]',
    floorColor: '#F3F3F4',
    floorGrid:
      'linear-gradient(to right, rgba(23,23,23,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,23,23,0.035) 1px, transparent 1px)',
    floorGridSize: '140px 84px',
    spotlightNear:
      'linear-gradient(180deg, rgba(229, 229, 229, 0.65) 0%, rgba(255, 255, 255, 0) 92%)',
    spotlightIdle:
      'linear-gradient(180deg, rgba(229, 229, 229, 0.3) 0%, rgba(255, 255, 255, 0) 90%)',
    plaqueClass: 'border-[#E5E5E5] bg-white/95',
    plaqueTitleClass: 'text-[#171717]',
    plaqueMetaClass: 'text-[#737373]',
    benchLegFill: '#525252',
    benchTopFill: '#D4D4D4',
    benchHighlightFill: '#E5E5E5',
    planterPotFill: '#E5E5E5',
    planterRimFill: '#D4D4D4',
    rippleBorder: 'border-[#171717]/60',
    ringOffsetClass: 'ring-offset-white',
  },
};

export const MuseumCanvas2D: React.FC<MuseumCanvas2DProps> = ({
  artworks,
  reviewCounts,
  isModalOpen,
  focusArtworkId,
  onClearFocusArtwork,
  onSelectArtwork,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const characterRef = useRef<HTMLDivElement | null>(null);

  // Compute placed artwork positions horizontally across Hall I (Curated) & Hall II (Visitor Uploads)
  const curatedList = artworks.filter((a) => a.isCurated);
  const communityList = artworks.filter((a) => !a.isCurated);

  const placedArtworks: PlacedArtwork[] = [];
  let cursorX = WORLD_PADDING_LEFT + 140;

  curatedList.forEach((art) => {
    placedArtworks.push({ artwork: art, x: cursorX, isCuratedWing: true });
    cursorX += ARTWORK_SPACING;
  });

  const dividerX = cursorX - ARTWORK_SPACING / 2 + WING_DIVIDER_GAP / 2;
  if (communityList.length > 0) {
    cursorX += WING_DIVIDER_GAP;
    communityList.forEach((art) => {
      placedArtworks.push({ artwork: art, x: cursorX, isCuratedWing: false });
      cursorX += ARTWORK_SPACING;
    });
  }

  const worldWidth = Math.max(
    1440,
    (placedArtworks.length > 0 ? placedArtworks[placedArtworks.length - 1].x : 800) +
      WORLD_PADDING_RIGHT
  );

  // Character physics state stored in refs for 60fps animation loop without re-renders
  const posRef = useRef({ x: 360, y: 455 });
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const dpadRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const walkPhaseRef = useRef(0);
  const cameraXRef = useRef(0);

  const [facing, setFacing] = useState<FacingDir>('front');
  const [isWalking, setIsWalking] = useState(false);
  const [walkStepFrame, setWalkStepFrame] = useState(0);
  const [nearbyArtworkId, setNearbyArtworkId] = useState<string | null>(null);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [charDepthY, setCharDepthY] = useState(455);
  const [galleryTheme, setGalleryTheme] = useState<GalleryTheme>('classic');

  const activeTheme = GALLERY_THEMES[galleryTheme];

  const nearbyArtwork = placedArtworks.find((p) => p.artwork.id === nearbyArtworkId)?.artwork ?? null;

  // Track viewport width
  useEffect(() => {
    const updateSize = () => {
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.clientWidth);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Walk character automatically to a newly uploaded or selected artwork from the catalog
  useEffect(() => {
    if (!focusArtworkId) return;
    const match = placedArtworks.find((p) => p.artwork.id === focusArtworkId);
    if (match) {
      targetRef.current = { x: match.x, y: 410 };
    }
    onClearFocusArtwork();
  }, [focusArtworkId, placedArtworks, onClearFocusArtwork]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysRef.current[key] = true;
        targetRef.current = null; // manual control cancels click-to-walk target
      }

      if ((e.key === ' ' || e.key === 'Enter' || key === 'e') && nearbyArtwork) {
        e.preventDefault();
        onSelectArtwork(nearbyArtwork);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      delete keysRef.current[key];
    };

    const handleBlur = () => {
      keysRef.current = {};
      dpadRef.current = { dx: 0, dy: 0 };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isModalOpen, nearbyArtwork, onSelectArtwork]);

  // Main 60fps animation loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let lastFacing: FacingDir = 'front';
    let lastWalking = false;
    let lastStepFrame = 0;
    let lastNearbyId: string | null = null;
    let lastDepthY = Math.round(posRef.current.y);

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      let vx = 0;
      let vy = 0;

      if (!isModalOpen) {
        const k = keysRef.current;
        if (k['arrowleft'] || k['a']) vx -= 1;
        if (k['arrowright'] || k['d']) vx += 1;
        if (k['arrowup'] || k['w']) vy -= 1;
        if (k['arrowdown'] || k['s']) vy += 1;

        if (vx === 0 && vy === 0 && (dpadRef.current.dx !== 0 || dpadRef.current.dy !== 0)) {
          vx = dpadRef.current.dx;
          vy = dpadRef.current.dy;
        }

        if (vx === 0 && vy === 0 && targetRef.current) {
          const dx = targetRef.current.x - posRef.current.x;
          const dy = targetRef.current.y - posRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 6) {
            vx = dx / dist;
            vy = dy / dist;
          } else {
            posRef.current.x = targetRef.current.x;
            posRef.current.y = targetRef.current.y;
            targetRef.current = null;
          }
        }
      }

      const moving = vx !== 0 || vy !== 0;
      if (moving) {
        const mag = Math.hypot(vx, vy) || 1;
        const nx = vx / mag;
        const ny = vy / mag;

        posRef.current.x = Math.max(85, Math.min(worldWidth - 85, posRef.current.x + nx * CHARACTER_SPEED * dt));
        posRef.current.y = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, posRef.current.y + ny * CHARACTER_SPEED * 0.85 * dt));

        let nextFacing: FacingDir = lastFacing;
        if (Math.abs(nx) >= Math.abs(ny)) {
          nextFacing = nx >= 0 ? 'right' : 'left';
        } else {
          nextFacing = ny >= 0 ? 'front' : 'back';
        }
        if (nextFacing !== lastFacing) {
          lastFacing = nextFacing;
          setFacing(nextFacing);
        }

        walkPhaseRef.current += dt * 11;
        const stepBucket = Math.floor(walkPhaseRef.current) % 4;
        if (stepBucket !== lastStepFrame) {
          lastStepFrame = stepBucket;
          setWalkStepFrame(stepBucket);
        }
      } else if (lastWalking) {
        walkPhaseRef.current = 0;
        if (lastStepFrame !== 0) {
          lastStepFrame = 0;
          setWalkStepFrame(0);
        }
      }

      if (moving !== lastWalking) {
        lastWalking = moving;
        setIsWalking(moving);
      }

      const roundedY = Math.round(posRef.current.y);
      if (Math.abs(roundedY - lastDepthY) >= 2) {
        lastDepthY = roundedY;
        setCharDepthY(roundedY);
      }

      // Smooth camera follow
      const maxCamX = Math.max(0, worldWidth - viewportWidth);
      const desiredCamX = Math.max(0, Math.min(maxCamX, posRef.current.x - viewportWidth * 0.5));
      cameraXRef.current += (desiredCamX - cameraXRef.current) * Math.min(1, dt * 7.5);

      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${-cameraXRef.current.toFixed(1)}px, 0, 0)`;
      }
      if (characterRef.current) {
        const bobOffset = moving ? Math.abs(Math.sin(walkPhaseRef.current)) * -3.5 : 0;
        characterRef.current.style.transform = `translate3d(${(posRef.current.x - 32).toFixed(1)}px, ${(posRef.current.y - 86 + bobOffset).toFixed(1)}px, 0)`;
      }

      // Find nearest artwork within viewing range
      let closestId: string | null = null;
      let closestDist = 145;
      for (const item of placedArtworks) {
        const dist = Math.hypot(posRef.current.x - item.x, (posRef.current.y - 385) * 0.65);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = item.artwork.id;
        }
      }
      if (closestId !== lastNearbyId) {
        lastNearbyId = closestId;
        setNearbyArtworkId(closestId);
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isModalOpen, placedArtworks, viewportWidth, worldWidth]);

  // Click-to-walk on gallery floor
  const handleFloorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isModalOpen) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const worldX = e.clientX - rect.left + cameraXRef.current;
      const worldY = e.clientY - rect.top;

      if (worldY >= WALL_HEIGHT + 12) {
        const clampedX = Math.max(85, Math.min(worldWidth - 85, worldX));
        const clampedY = Math.max(FLOOR_MIN_Y, Math.min(FLOOR_MAX_Y, worldY));
        targetRef.current = { x: clampedX, y: clampedY };
        setClickRipple({ x: clampedX, y: clampedY, key: Date.now() });
      }
    },
    [isModalOpen, worldWidth]
  );

  // Decorative benches placed along the central aisle
  const benchPositions: number[] = [];
  for (let bx = 560; bx < worldWidth - 360; bx += 780) {
    benchPositions.push(bx);
  }

  // Leg & arm offsets for crisp 4-phase walk animation
  const legSwing = isWalking ? [6, 0, -6, 0][walkStepFrame] : 0;
  const armSwing = isWalking ? [-5, 0, 5, 0][walkStepFrame] : 0;

  return (
    <section
      aria-label="2D 가상 미술관 전시 공간"
      className={`relative w-full select-none overflow-hidden rounded-xl border shadow-sm transition-colors duration-300 ${activeTheme.outerBorder} ${activeTheme.outerBg}`}
    >
      {/* Main Interactive Gallery Viewport */}
      <div
        ref={viewportRef}
        onClick={handleFloorClick}
        className="relative w-full overflow-hidden cursor-crosshair"
        style={{ height: `${STAGE_HEIGHT}px` }}
      >
        {/* Gallery Background Theme Switcher (Classic / Modern / Minimal) */}
        <div
          onClick={(e) => e.stopPropagation()}
          role="group"
          aria-label="미술관 전시실 배경 테마 선택"
          className="absolute top-3.5 right-3.5 z-30 flex items-center gap-1 rounded-lg border border-[#D8D0C3] bg-[#FBF9F5]/95 p-1 shadow-sm backdrop-blur-xs"
        >
          {(Object.keys(GALLERY_THEMES) as GalleryTheme[]).map((themeKey) => {
            const isActive = galleryTheme === themeKey;
            return (
              <button
                key={themeKey}
                type="button"
                aria-pressed={isActive}
                onClick={() => setGalleryTheme(themeKey)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#1C1917] text-white shadow-xs'
                    : 'text-[#57534E] hover:bg-[#EBE6DF] hover:text-[#1C1917]'
                }`}
              >
                {GALLERY_THEMES[themeKey].label}
              </button>
            );
          })}
        </div>

        {/* Horizontally Scrolling 2D Museum Hall */}
        <div
          ref={worldRef}
          className="relative top-0 left-0 h-full will-change-transform"
          style={{ width: `${worldWidth}px` }}
        >
          {/* Gallery Wall Surface */}
          <div
            className={`absolute top-0 left-0 w-full border-b transition-colors duration-300 ${activeTheme.wallBorder}`}
            style={{
              height: `${WALL_HEIGHT}px`,
              background: activeTheme.wallBackground,
            }}
          >
            {/* Ceiling Track Lighting Rail */}
            <div className={`absolute top-5 left-0 right-0 h-2 opacity-90 ${activeTheme.trackColor}`} />

            {/* Classical Wainscoting / Minimalist Skirting */}
            {activeTheme.showWainscoting ? (
              <>
                <div className="absolute bottom-14 left-0 right-0 h-px bg-[#DFD7CA]" />
                <div
                  className={`absolute bottom-0 left-0 right-0 h-14 border-t ${activeTheme.wainscotingBg} ${activeTheme.wainscotingBorder}`}
                />
              </>
            ) : (
              <div
                className={`absolute bottom-0 left-0 right-0 h-3 border-t ${activeTheme.wainscotingBg} ${activeTheme.wainscotingBorder}`}
              />
            )}

            {/* Wing Header Plaques */}
            <div
              className={`absolute top-11 flex items-center gap-3 text-xs tracking-widest uppercase ${activeTheme.wingLabelText}`}
              style={{ left: `${WORLD_PADDING_LEFT - 110}px` }}
            >
              <span className="font-museum-mono">HALL I</span>
              <span aria-hidden="true">·</span>
              <span className={`font-medium ${activeTheme.wingTitleText}`}>
                상설 기획전 · Permanent Collection
              </span>
            </div>

            {communityList.length > 0 && (
              <>
                {/* Architectural Column Dividing Wings */}
                <div
                  className={`absolute top-0 bottom-0 w-10 border-x ${activeTheme.pillarClass}`}
                  style={{ left: `${dividerX - 20}px` }}
                />
                <div
                  className={`absolute top-11 flex items-center gap-3 text-xs tracking-widest uppercase ${activeTheme.wingLabelText}`}
                  style={{ left: `${dividerX + 52}px` }}
                >
                  <span className="font-museum-mono">HALL II</span>
                  <span aria-hidden="true">·</span>
                  <span className={`font-medium ${activeTheme.wingAccentText}`}>
                    관람객 아틀리에 · Community Gallery
                  </span>
                </div>
              </>
            )}

            {/* Empty Community Wing Invitation if no uploads yet */}
            {communityList.length === 0 && (
              <div
                className={`absolute top-24 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center ${activeTheme.emptyCardClass}`}
                style={{ left: `${cursorX + 40}px`, width: '250px' }}
              >
                <span className="font-museum-mono text-[11px] uppercase tracking-widest opacity-70">
                  HALL II · OPEN WALL
                </span>
                <p className="mt-2 font-museum-serif text-lg font-semibold">
                  관람객 전시 공간
                </p>
                <p className="mt-1 text-xs leading-relaxed opacity-80">
                  상단의 &lsquo;작품 전시하기&rsquo; 버튼으로 첫 작품을 걸어보세요.
                </p>
              </div>
            )}
          </div>

          {/* Gallery Floor */}
          <div
            className="absolute left-0 right-0 bottom-0 transition-colors duration-300"
            style={{
              top: `${WALL_HEIGHT}px`,
              backgroundColor: activeTheme.floorColor,
              backgroundImage: activeTheme.floorGrid,
              backgroundSize: activeTheme.floorGridSize,
            }}
          >
            {/* Subtle Floor Skirting Shadow */}
            <div className="h-4 w-full bg-gradient-to-b from-black/8 to-transparent" />
          </div>

          {/* Click-to-walk Floor Ripple Indicator */}
          {clickRipple && (
            <div
              key={clickRipple.key}
              className={`pointer-events-none absolute h-7 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-ping ${activeTheme.rippleBorder}`}
              style={{ left: `${clickRipple.x}px`, top: `${clickRipple.y}px` }}
            />
          )}

          {/* Framed Artworks Along the Gallery Wall */}
          {placedArtworks.map(({ artwork, x }) => {
            const isNearby = nearbyArtworkId === artwork.id;
            const aspectRatio =
              artwork.width && artwork.height ? artwork.width / artwork.height : 4 / 3;
            const isPortrait = aspectRatio < 0.92;
            const frameW = isPortrait ? 156 : 204;
            const frameH = isPortrait ? 198 : 156;
            const reviewCount = reviewCounts[artwork.id] ?? 0;

            const frameBorderClass =
              artwork.frameStyle === 'brass'
                ? 'border-[#8C6D3F] bg-[#FBF9F5]'
                : artwork.frameStyle === 'ebony'
                  ? 'border-[#292524] bg-[#FBF9F5]'
                  : 'border-[#5C4033] bg-[#FBF9F5]';

            return (
              <div
                key={artwork.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${x}px`,
                  top: '20px',
                  transform: 'translateX(-50%)',
                  width: '280px',
                }}
              >
                {/* Ceiling Track Spotlight Fixture */}
                <div className={`h-4 w-6 rounded-b-sm shadow-sm ${activeTheme.trackColor}`} />
                {/* Soft Spotlight Cone */}
                <div
                  className="pointer-events-none -mt-1 transition-opacity duration-200"
                  style={{
                    width: '240px',
                    height: '250px',
                    background: isNearby
                      ? activeTheme.spotlightNear
                      : activeTheme.spotlightIdle,
                    clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)',
                  }}
                />

                {/* Clickable Framed Artwork */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectArtwork(artwork);
                  }}
                  aria-label={`${artwork.title} - ${artwork.artistName} 작품 감상하기`}
                  className={`group relative -mt-[215px] flex flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9A3412] transition-transform duration-200 ${
                    isNearby ? '-translate-y-1 scale-[1.03]' : 'hover:-translate-y-1 hover:scale-[1.02]'
                  }`}
                >
                  {/* Outer Museum Frame + Passe-Partout Mat */}
                  <div
                    className={`relative border-[7px] p-2.5 shadow-[0_14px_28px_-10px_rgba(28,25,23,0.35)] transition-shadow duration-200 ${frameBorderClass} ${
                      isNearby ? `ring-2 ring-[#9A3412]/70 ring-offset-2 ${activeTheme.ringOffsetClass}` : ''
                    }`}
                    style={{ width: `${frameW}px`, height: `${frameH}px` }}
                  >
                    <div className="relative h-full w-full overflow-hidden border border-[#E2DBD0] bg-[#EAE4D9]">
                      <img
                        src={artwork.imageUrl}
                        alt={`${artwork.title} (${artwork.artistName})`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {/* Hover / Nearby View Prompt Overlay */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/35 transition-opacity duration-200 ${
                          isNearby ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FBF9F5]/95 px-2.5 py-1 text-xs font-medium text-[#1C1917] shadow-sm">
                          <Eye className="h-3.5 w-3.5 text-[#9A3412]" />
                          <span>감상하기</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Museum Wall Plaque (Label) */}
                  <div
                    className={`mt-3 w-52 rounded-sm border px-3 py-1.5 text-left shadow-xs transition-colors duration-300 ${activeTheme.plaqueClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate font-museum-serif text-sm font-semibold ${activeTheme.plaqueTitleClass}`}
                      >
                        {artwork.title}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 font-museum-mono text-[11px] opacity-80 ${activeTheme.plaqueMetaClass}`}
                      >
                        <MessageSquare className="h-3 w-3" />
                        {reviewCounts[artwork.id] !== undefined ? reviewCount : '리뷰'}
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${activeTheme.plaqueMetaClass}`}
                    >
                      <span className="truncate">{artwork.artistName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-museum-mono shrink-0">{artwork.accessionNo}</span>
                    </div>
                  </div>
                </button>

                {/* Floor Proximity Light Marker */}
                <div
                  className={`pointer-events-none mt-10 h-5 w-36 rounded-full transition-opacity duration-200 ${
                    isNearby ? 'bg-[#9A3412]/15 opacity-100 ring-1 ring-[#9A3412]/35' : 'opacity-0'
                  }`}
                />
              </div>
            );
          })}

          {/* Decorative Potted Olive Trees & Gallery Benches */}
          {placedArtworks.map(
            ({ x }, idx) =>
              idx % 2 === 0 && (
                <div
                  key={`plant-${x}`}
                  className="pointer-events-none absolute"
                  style={{ left: `${x + 185}px`, top: '286px', zIndex: 5 }}
                >
                  {/* Planter + Stylized Botanical Foliage */}
                  <svg width="46" height="72" viewBox="0 0 46 72" fill="none" aria-hidden="true">
                    <ellipse cx="23" cy="67" rx="14" ry="4" fill="rgba(28,25,23,0.18)" />
                    <path d="M13 46H33L30 66H16L13 46Z" fill={activeTheme.planterPotFill} />
                    <rect x="11" y="43" width="24" height="5" rx="1.5" fill={activeTheme.planterRimFill} />
                    <path d="M23 43V20" stroke="#57534E" strokeWidth="2.5" strokeLinecap="round" />
                    <ellipse cx="16" cy="24" rx="9" ry="7" fill="#4D6B4A" />
                    <ellipse cx="30" cy="26" rx="8" ry="6" fill="#3F5A3C" />
                    <ellipse cx="23" cy="14" rx="10" ry="9" fill="#5D7D59" />
                  </svg>
                </div>
              )
          )}

          {benchPositions.map((bx) => (
            <div
              key={`bench-${bx}`}
              className="pointer-events-none absolute"
              style={{
                left: `${bx}px`,
                top: '485px',
                transform: 'translateX(-50%)',
                zIndex: charDepthY >= 510 ? 10 : 30,
              }}
            >
              {/* Gallery Bench */}
              <svg width="132" height="44" viewBox="0 0 132 44" fill="none" aria-hidden="true">
                <ellipse cx="66" cy="39" rx="58" ry="5" fill="rgba(28,25,23,0.16)" />
                <rect x="14" y="22" width="10" height="16" rx="1" fill={activeTheme.benchLegFill} />
                <rect x="108" y="22" width="10" height="16" rx="1" fill={activeTheme.benchLegFill} />
                <rect x="4" y="10" width="124" height="14" rx="2" fill={activeTheme.benchTopFill} />
                <rect x="4" y="10" width="124" height="5" rx="2" fill={activeTheme.benchHighlightFill} />
              </svg>
            </div>
          ))}

          {/* Movable 2D Human Character (Museum Visitor) */}
          <div
            ref={characterRef}
            className="pointer-events-none absolute top-0 left-0 will-change-transform"
            style={{ width: '64px', height: '94px', zIndex: 25 }}
            aria-hidden="true"
          >
            <svg width="64" height="94" viewBox="0 0 64 94" fill="none">
              {/* Ground Shadow */}
              <ellipse cx="32" cy="86" rx="16" ry="5" fill="rgba(28, 25, 23, 0.22)" />

              {/* Left & Right Legs with Walk Swing */}
              <g transform={`translate(0, ${legSwing > 0 ? -Math.abs(legSwing) * 0.35 : 0})`}>
                <rect
                  x={facing === 'left' ? 25 : facing === 'right' ? 27 : 23}
                  y={62 + (legSwing > 0 ? -2 : 1)}
                  width="6"
                  height="21"
                  rx="3"
                  fill="#292524"
                />
                <ellipse
                  cx={facing === 'left' ? 27 : facing === 'right' ? 30 : 26}
                  cy={83 + (legSwing > 0 ? -2 : 1)}
                  rx="4.5"
                  ry="2.5"
                  fill="#1C1917"
                />
              </g>
              <g transform={`translate(0, ${legSwing < 0 ? -Math.abs(legSwing) * 0.35 : 0})`}>
                <rect
                  x={facing === 'left' ? 31 : facing === 'right' ? 33 : 35}
                  y={62 + (legSwing < 0 ? -2 : 1)}
                  width="6"
                  height="21"
                  rx="3"
                  fill="#1C1917"
                />
                <ellipse
                  cx={facing === 'left' ? 33 : facing === 'right' ? 36 : 38}
                  cy={83 + (legSwing < 0 ? -2 : 1)}
                  rx="4.5"
                  ry="2.5"
                  fill="#0C0A09"
                />
              </g>

              {/* Back Arm */}
              <rect
                x={facing === 'left' ? 36 : facing === 'right' ? 20 : 14}
                y={37 + armSwing * 0.4}
                width="6"
                height="21"
                rx="3"
                fill="#44403C"
              />

              {/* Museum Visitor Coat / Torso */}
              <path
                d="M19 36C19 32.5 22 30 26 30H38C42 30 45 32.5 45 36L47 64H17L19 36Z"
                fill="#33302E"
              />
              {/* Coat Lapel & Inner Shirt */}
              {facing !== 'back' && (
                <path d="M29 31H35L33 49H31L29 31Z" fill="#F5F0E8" />
              )}

              {/* Warm Terracotta Scarf */}
              <rect x="21" y="28" width="22" height="6" rx="3" fill="#9A3412" />
              {facing !== 'back' && (
                <rect x="33" y="31" width="5" height="12" rx="2" fill="#B4421A" />
              )}

              {/* Front Arm & Tiny Sketchbook */}
              <rect
                x={facing === 'left' ? 22 : facing === 'right' ? 36 : 44}
                y={37 - armSwing * 0.4}
                width="6"
                height="21"
                rx="3"
                fill="#57534E"
              />

              {/* Head */}
              <circle cx="32" cy="19" r="11.5" fill="#F2D2B6" />

              {/* Hair */}
              {facing === 'back' ? (
                <path
                  d="M20 20C20 11.5 25 6.5 32 6.5C39 6.5 44 11.5 44 20C44 24 41 26 32 26C23 26 20 24 20 20Z"
                  fill="#292524"
                />
              ) : (
                <path
                  d="M20.5 18C20.5 10.5 25.5 6.5 32 6.5C38.5 6.5 43.5 10.5 43.5 18C41 14 37 12.5 32 13C27 12.5 23 14 20.5 18Z"
                  fill="#292524"
                />
              )}

              {/* Directional Eyes */}
              {facing === 'front' && (
                <>
                  <circle cx="28" cy="19.5" r="1.4" fill="#1C1917" />
                  <circle cx="36" cy="19.5" r="1.4" fill="#1C1917" />
                </>
              )}
              {facing === 'left' && (
                <>
                  <circle cx="25.5" cy="19.5" r="1.4" fill="#1C1917" />
                  <circle cx="30.5" cy="19.5" r="1.4" fill="#1C1917" />
                </>
              )}
              {facing === 'right' && (
                <>
                  <circle cx="33.5" cy="19.5" r="1.4" fill="#1C1917" />
                  <circle cx="38.5" cy="19.5" r="1.4" fill="#1C1917" />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Floating Proximity Action Hint */}
        {nearbyArtwork && !isModalOpen && (
          <div className="pointer-events-none absolute top-16 sm:top-4 left-1/2 -translate-x-1/2 z-30">
            <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-[#D8D0C3] bg-[#FBF9F5]/95 px-4 py-2 shadow-md">
              <div className="text-left">
                <p className="font-museum-serif text-sm font-semibold text-[#1C1917]">
                  {nearbyArtwork.title}
                </p>
                <p className="text-xs text-[#57534E]">
                  {nearbyArtwork.artistName} · 스페이스바 또는 클릭하여 감상평 남기기
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectArtwork(nearbyArtwork);
                }}
                className="shrink-0 whitespace-nowrap rounded-md bg-[#9A3412] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#7C2D12] transition-colors"
              >
                작품 보기
              </button>
            </div>
          </div>
        )}

        {/* Compact On-Screen D-Pad for Touch / Mouse Navigation */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-4 z-30 flex flex-col items-center gap-1 rounded-xl border border-[#D8D0C3] bg-[#FBF9F5]/90 p-1.5 shadow-sm backdrop-blur-xs"
          aria-label="캐릭터 방향 이동 패드"
        >
          <button
            type="button"
            aria-label="위로 이동"
            onPointerDown={() => {
              targetRef.current = null;
              dpadRef.current = { dx: 0, dy: -1 };
            }}
            onPointerUp={() => (dpadRef.current = { dx: 0, dy: 0 })}
            onPointerLeave={() => (dpadRef.current = { dx: 0, dy: 0 })}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#44403C] hover:bg-[#EBE6DF] active:bg-[#DED6C8]"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="왼쪽으로 이동"
              onPointerDown={() => {
                targetRef.current = null;
                dpadRef.current = { dx: -1, dy: 0 };
              }}
              onPointerUp={() => (dpadRef.current = { dx: 0, dy: 0 })}
              onPointerLeave={() => (dpadRef.current = { dx: 0, dy: 0 })}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[#44403C] hover:bg-[#EBE6DF] active:bg-[#DED6C8]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="아래로 이동"
              onPointerDown={() => {
                targetRef.current = null;
                dpadRef.current = { dx: 0, dy: 1 };
              }}
              onPointerUp={() => (dpadRef.current = { dx: 0, dy: 0 })}
              onPointerLeave={() => (dpadRef.current = { dx: 0, dy: 0 })}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[#44403C] hover:bg-[#EBE6DF] active:bg-[#DED6C8]"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="오른쪽으로 이동"
              onPointerDown={() => {
                targetRef.current = null;
                dpadRef.current = { dx: 1, dy: 0 };
              }}
              onPointerUp={() => (dpadRef.current = { dx: 0, dy: 0 })}
              onPointerLeave={() => (dpadRef.current = { dx: 0, dy: 0 })}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[#44403C] hover:bg-[#EBE6DF] active:bg-[#DED6C8]"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Subtle Control Guide Bottom-Right */}
        <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden sm:flex items-center gap-2 rounded-lg border border-[#D8D0C3] bg-[#FBF9F5]/90 px-3 py-1.5 text-xs text-[#57534E]">
          <Compass className="h-3.5 w-3.5 text-[#9A3412]" />
          <span>방향키 / WASD 이동 · 바닥 클릭 이동 · 작품 클릭 감상</span>
        </div>
      </div>

      {/* Bottom Exhibition Hall Quick-Jump Corridor Strip */}
      <div className="flex items-center gap-2 overflow-x-auto border-t border-[#DED6C8] bg-[#FBF9F5] px-4 py-2.5">
        <span className="shrink-0 font-museum-mono text-[11px] uppercase tracking-wider text-[#78716C]">
          전시 동선 ({placedArtworks.length})
        </span>
        <span className="text-[#D6CEBE]" aria-hidden="true">
          |
        </span>
        <div className="flex items-center gap-2">
          {placedArtworks.map(({ artwork, x }) => {
            const active = nearbyArtworkId === artwork.id;
            return (
              <button
                key={`nav-${artwork.id}`}
                type="button"
                onClick={() => {
                  targetRef.current = { x, y: 410 };
                }}
                className={`flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#9A3412] bg-[#9A3412]/10 font-medium text-[#9A3412]'
                    : 'border-[#E2DBD0] bg-white text-[#44403C] hover:border-[#C8BFB0] hover:text-[#1C1917]'
                }`}
              >
                <span className="font-museum-mono text-[10px] opacity-75">
                  {artwork.accessionNo}
                </span>
                <span className="max-w-[120px] truncate">{artwork.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
