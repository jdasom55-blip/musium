export interface MuseumArtwork {
  id: string;
  title: string;
  artistName: string;
  description: string;
  imageUrl: string;
  isCurated: boolean;
  accessionNo: string;
  mediumLabel: string;
  compressedSizeBytes?: number;
  width?: number;
  height?: number;
  authorUid?: string;
  createdAtMs: number;
  frameStyle: 'walnut' | 'brass' | 'ebony';
}

export interface MuseumReview {
  id: string;
  visitorName: string;
  content: string;
  authorUid: string;
  createdAtMs: number;
}
