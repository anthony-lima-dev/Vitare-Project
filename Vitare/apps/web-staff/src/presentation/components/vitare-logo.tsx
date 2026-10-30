import type { ImgHTMLAttributes } from "react";

export function VitareLogo({
  className,
  alt = "Vitare",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const src = `${import.meta.env.BASE_URL}vitare-logo.png`;

  return <img src={src} alt={alt} className={className} {...props} />;
}
