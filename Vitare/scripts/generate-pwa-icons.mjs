import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const SOURCE_LOGO = '../../../TCC_Vitare/Vitare/apps/web/public/vitare-logo.png';
const WEB_PUBLIC = "../../../TCC_Vitare/Vitare/apps/web/public";
const STAFF_PUBLIC = "../../../TCC_Vitare/Vitare/apps/web-staff/public";

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate a square icon with safe area (maskable)
async function generateIcon(inputPath, outputPath, size, isMaskable = false) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  // Calculate the safe area for maskable icons (minimum 40% of the smaller dimension)
  const safeArea = Math.floor(Math.min(metadata.width, metadata.height) * 0.4);
  
  if (isMaskable) {
    // For maskable icons, we need to ensure the logo fits within the safe area
    // Create a canvas with the logo centered and padded
    await image
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
      })
      .png()
      .toFile(outputPath);
  } else {
    // Regular icons - fill the square
    await image
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toFile(outputPath);
  }
  
  console.log(`Generated: ${outputPath} (${size}x${size}${isMaskable ? ' maskable' : ''})`);
}

// Generate apple-touch-icon (180x180 recommended, but we'll do 192x192)
async function generateAppleTouchIcon(inputPath, outputPath, size = 192) {
  await sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background for iOS
    })
    .png()
    .toFile(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size} apple-touch-icon)`);
}

async function generateAllIcons() {
  // Ensure directories exist
  if (!existsSync(WEB_PUBLIC)) mkdirSync(WEB_PUBLIC, { recursive: true });
  if (!existsSync(STAFF_PUBLIC)) mkdirSync(STAFF_PUBLIC, { recursive: true });

  console.log('Generating PWA icons for apps/web...');
  
  // Generate regular icons for web app
  for (const size of ICON_SIZES) {
    await generateIcon(SOURCE_LOGO, resolve(WEB_PUBLIC, `icon-${size}x${size}.png`), size);
  }
  
  // Generate maskable icons for web app (required for Android)
  for (const size of [192, 512]) {
    await generateIcon(SOURCE_LOGO, resolve(WEB_PUBLIC, `icon-${size}x${size}-maskable.png`), size, true);
  }
  
  // Generate apple-touch-icon for web app
  await generateAppleTouchIcon(SOURCE_LOGO, resolve(WEB_PUBLIC, 'apple-icon.png'), 192);
  
  // Generate favicon.ico (32x32)
  await sharp(SOURCE_LOGO)
    .resize(32, 32, { fit: 'cover' })
    .toFile(resolve(WEB_PUBLIC, 'favicon.ico'));
  console.log(`Generated: ${WEB_PUBLIC}/favicon.ico (32x32)`);

  console.log('\nGenerating PWA icons for apps/web-staff...');
  
  // Generate regular icons for staff app
  for (const size of ICON_SIZES) {
    await generateIcon(SOURCE_LOGO, resolve(STAFF_PUBLIC, `icon-${size}x${size}.png`), size);
  }
  
  // Generate maskable icons for staff app
  for (const size of [192, 512]) {
    await generateIcon(SOURCE_LOGO, resolve(STAFF_PUBLIC, `icon-${size}x${size}-maskable.png`), size, true);
  }
  
  // Generate apple-touch-icon for staff app
  await generateAppleTouchIcon(SOURCE_LOGO, resolve(STAFF_PUBLIC, 'apple-icon.png'), 192);
  
  // Generate favicon.ico for staff app
  await sharp(SOURCE_LOGO)
    .resize(32, 32, { fit: 'cover' })
    .toFile(resolve(STAFF_PUBLIC, 'favicon.ico'));
  console.log(`Generated: ${STAFF_PUBLIC}/favicon.ico (32x32)`);

  console.log('\n✅ All PWA icons generated successfully!');
}

generateAllIcons().catch(console.error);