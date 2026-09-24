# SENTINEL AI - Landing Page

A full-screen dark hero landing page for a security company featuring an embedded Spline 3D scene as the background.

## 🎨 Design Features

- **Dark Theme**: Charcoal background (#1a1a1a) with vivid green accents (#4ade80)
- **Typography**: Sora font family (300-700 weights)
- **3D Background**: Interactive Spline scene with lazy loading
- **Animations**: Staggered fade-up animations with blur effects
- **Responsive**: Mobile-first design with fluid typography using clamp()
- **Glassmorphism**: Dark overlay over 3D scene for text readability

## 🚀 Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing fast builds
- **Tailwind CSS v4** for styling
- **shadcn/ui** for Button component
- **@splinetool/react-spline** for 3D embed
- **class-variance-authority** for component variants

## 📦 Installation

```bash
npm install
```

## 🏃 Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🏗️ Build

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/
│   │   └── button.tsx          # shadcn Button with custom variants
│   ├── Navbar.tsx              # Fixed transparent navbar
│   └── HeroSection.tsx         # Hero with Spline 3D background
├── lib/
│   └── utils.ts                # cn() utility for class merging
├── App.tsx                     # Main app component
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + custom theme
```

## 🎯 Key Components

### Navbar
- Fixed position, transparent background
- Logo on left, nav links in center, CTA button on right
- Hidden on mobile (links and CTA)
- Custom `navCta` button variant

### HeroSection
- Full-screen height with Spline 3D background
- Lazy-loaded Spline scene with Suspense fallback
- Dark overlay (30% black) for text contrast
- Content anchored to bottom-left
- Staggered animations:
  - Heading (0.2s delay)
  - Subheading (0.4s delay)
  - Description (0.55s delay)
  - CTA buttons (0.7s delay)
  - Trust line (0.85s delay)
- Fluid typography with clamp()
- `pointer-events-none` on content, `pointer-events-auto` on buttons

## 🎨 Color Palette

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | 0 0% 10% | Dark charcoal |
| `--foreground` | 0 0% 96% | Near-white text |
| `--primary` | 119 99% 46% | Vivid green |
| `--secondary` | 0 0% 18% | Dark gray |
| `--muted` | 0 0% 16% | Muted gray |
| `--hero-bg` | 0 0% 8% | Darkest background |
| `--nav-button` | 0 0% 18% | Navbar button bg |

## ✨ Custom Animations

### fade-up
```css
@keyframes fade-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
```

### fade-in
```css
@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

## 🔧 Configuration

### Tailwind Config
Custom colors, fonts, and animations are defined in `src/index.css` using the `@theme` directive (Tailwind v4).

### Path Aliases
`@/` maps to `./src/` via `tsconfig.json` and `vite.config.js`.

## 📱 Responsive Design

- **Mobile**: Logo only in navbar, content stacks vertically
- **Tablet**: Fluid typography scales with viewport
- **Desktop**: Full navbar with links and CTA, max-width constraints

## 🎬 Spline 3D Scene

The 3D scene is loaded from:
```
https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode
```

It's lazy-loaded using `React.lazy()` and wrapped in `Suspense` with a dark background fallback.

## 🎯 Content

- **Heading**: "SENTINEL AI" (AI in green)
- **Subheading**: "We implement security correctly."
- **Description**: Enterprise security systems pitch
- **CTAs**: "Book a Call" (green) and "Our Work" (white)
- **Trust Line**: "Trusted security partner. Columbus, OH. 12 systems deployed."

## 🚀 Performance

- Lazy-loaded 3D scene
- Optimized animations with cubic-bezier easing
- Minimal bundle size (257 KB main JS)
- Code-split Spline runtime chunks

## 📝 Notes

- No light mode (dark only)
- No hamburger menu on mobile (nav items hidden)
- Content has `pointer-events-none` to allow 3D interaction
- Buttons re-enable clicks with `pointer-events-auto`
- All typography uses fluid clamp() values

## 🎨 Design Inspiration

Modern security/tech company landing page with:
- Dark, mysterious aesthetic
- Interactive 3D elements
- Bold typography
- Clear CTAs
- Professional trust signals
