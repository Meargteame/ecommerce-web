import fs from 'fs'
import path from 'path'

// Get all files with useSearchParams error in Vercel logs
const filesToFix = [
  'app/about/page.tsx',
  'app/cart/page.tsx',
  'app/checkout/page.tsx',
  'app/checkout/success/page.tsx',
  'app/help/page.tsx',
  'app/page.tsx',
  'app/privacy/page.tsx',
  'app/sell/page.tsx',
  'app/terms/page.tsx',
  'app/track-order/page.tsx'
];

filesToFix.forEach(relPath => {
  const filePath = path.join(process.cwd(), 'frontend', relPath);
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // If it already has force-dynamic, skip
  if (content.includes('export const dynamic')) return;
  
  // Find where 'use client' is, or simply prepend if not there
  if (content.trim().startsWith("'use client'") || content.trim().startsWith('"use client"')) {
    const newContent = content.replace(/^(["']use client["']\s*)/m, "$1\nexport const dynamic = 'force-dynamic';\n");
    fs.writeFileSync(filePath, newContent);
  } else {
    fs.writeFileSync(filePath, "export const dynamic = 'force-dynamic';\n" + content);
  }
  console.log(`Fixed ${relPath}`);
})
