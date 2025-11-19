import data from './qr-codes.json';

export type QrCodePlaceholder = {
  id: string;
  name: string;
  imageUrl: string;
};

export const QrCodeImages: QrCodePlaceholder[] = data.qrCodeImages;
