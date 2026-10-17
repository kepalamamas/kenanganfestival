# Kenangan Festival - React/Vite Setup

The site is now a React SPA. See [README.md](README.md) for environment setup,
public checkout, API configuration, testing and deployment requirements.

## Available Commands

### Development
```bash
npm run dev
```
- Starts local development server at http://localhost:3000
- Hot module replacement (HMR) enabled
- Proxies `/api` to `DEV_API_TARGET` (default `http://localhost:4000`)

### Production Build
```bash
npm run build
```
- Creates optimized production build in `/dist` folder
- Minifies HTML, CSS, and optimizes assets
- Ready to deploy

### Preview Production Build
```bash
npm run preview
```
- Preview the production build locally before deployment
- Runs at http://localhost:4173 by default

## Project Structure

- React source lives in `src/`; `index.html` is the entry shell
- Build output goes to `/dist` folder
- All assets (images, fonts, libraries) are automatically optimized

## Deployment

After running `npm run build`, deploy the contents of the `/dist` folder to your web server or hosting platform:

- **Static Hosting**: Upload `/dist` folder contents
- **GitHub Pages**: Deploy `/dist` folder
- **Netlify/Vercel**: Point to `/dist` as publish directory

## Notes

- Existing artwork, fonts and Bootstrap CSS are reused; jQuery plugins are no longer loaded
- Configure SPA history fallback for direct checkout/payment/ticket links
- Images, fonts, robots.txt and sitemap.xml are included in the build
- Keep secrets in `ticket-backend`, never in `VITE_*` variables
- `VITE_SECRET_PAYLOAD` matches Purplecloud's existing public API format; it is browser-visible obfuscation, not a protected credential

## First Time Setup

1. Make sure Node.js is installed
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development

## What Was Changed

- Uses existing public checkout, payment returns and printable QR e-tickets
- Added Vitest/Testing Library coverage and desktop/mobile Playwright checks
- Preserved the existing `dist/` deployment target
