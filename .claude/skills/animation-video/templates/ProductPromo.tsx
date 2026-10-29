import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type ProductPromoProps = {
  productName: string;
  price: string;
  salePrice?: string;
  imageUrl?: string;
  ctaText: string;
  brandColor: string;
};

export const productPromoDefaults: ProductPromoProps = {
  productName: 'Premium Cotton T-Shirt',
  price: '৳1,200',
  salePrice: '৳899',
  imageUrl: '',
  ctaText: 'Shop Now',
  brandColor: '#7c3aed',
};

const ProductImage: React.FC<{imageUrl?: string; brandColor: string}> = ({
  imageUrl,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const scale = spring({frame, fps, config: {damping: 12}});
  const size = width * 0.6;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 32,
        overflow: 'hidden',
        transform: `scale(${scale})`,
        boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
        background: imageUrl ? '#fff' : brandColor,
      }}
    >
      {imageUrl ? (
        <Img src={imageUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : null}
    </div>
  );
};

const SlideUpText: React.FC<{children: React.ReactNode; fontSize: number; color?: string}> = ({
  children,
  fontSize,
  color = '#fff',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame, fps, config: {damping: 200}});
  const translateY = interpolate(progress, [0, 1], [60, 0]);

  return (
    <div
      style={{
        fontSize,
        fontWeight: 800,
        color,
        opacity: progress,
        transform: `translateY(${translateY}px)`,
        textAlign: 'center',
        lineHeight: 1.15,
      }}
    >
      {children}
    </div>
  );
};

export const ProductPromo: React.FC<ProductPromoProps> = ({
  productName,
  price,
  salePrice,
  imageUrl,
  ctaText,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, durationInFrames} = useVideoConfig();
  const base = width / 1080;

  // Fade the whole scene out during the last 15 frames.
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaPulse = 1 + 0.05 * Math.sin((frame / fps) * Math.PI * 2);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${brandColor} 0%, #111827 100%)`,
        fontFamily: 'Inter, "Noto Sans Bengali", Arial, sans-serif',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48 * base,
        opacity: fadeOut,
      }}
    >
      <Sequence from={0} layout="none">
        <ProductImage imageUrl={imageUrl} brandColor={brandColor} />
      </Sequence>

      <Sequence from={Math.round(0.5 * fps)} layout="none">
        <SlideUpText fontSize={72 * base}>{productName}</SlideUpText>
      </Sequence>

      <Sequence from={Math.round(1.2 * fps)} layout="none">
        <SlideUpText fontSize={96 * base} color="#facc15">
          {salePrice ? (
            <>
              <span style={{textDecoration: 'line-through', opacity: 0.6, fontSize: 56 * base, color: '#fff'}}>
                {price}
              </span>{' '}
              {salePrice}
            </>
          ) : (
            price
          )}
        </SlideUpText>
      </Sequence>

      <Sequence from={Math.round(2 * fps)} layout="none">
        <div
          style={{
            padding: `${24 * base}px ${64 * base}px`,
            borderRadius: 999,
            background: '#fff',
            color: brandColor,
            fontSize: 48 * base,
            fontWeight: 800,
            transform: `scale(${ctaPulse})`,
          }}
        >
          {ctaText}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
