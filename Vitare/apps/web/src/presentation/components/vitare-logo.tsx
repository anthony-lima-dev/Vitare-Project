import type { ImgHTMLAttributes } from "react";

export function VitareLogo({
  className,
  alt = "Vitare",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img src="/vitare-logo.png" alt={alt} className={className} {...props} />
  );
}
