# FPS Game (GoldenEye Style)

A simple first-person shooter game built with Three.js, inspired by GoldenEye 007.

## Features

- First-person controls with mouse look and WASD movement
- GoldenEye-style visible weapon with realistic animations
- Humanoid enemies with AI that chase and attack
- Shooting mechanics with muzzle flash and recoil
- Ammo system with reload animation
- Health and scoring system
- Game over screen

## Development

This project uses Vite and pnpm:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Deployment to Vercel

This project is configured for easy deployment to Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the project settings
3. The following settings are configured in `vercel.json`:
   - Build command: `pnpm build`
   - Output directory: `dist`
   - Install command: `pnpm install`
   - Framework preset: `vite`

## Controls

- **WASD/Arrow Keys**: Move
- **Mouse**: Look around
- **Click**: Shoot
- **R**: Reload weapon
- **Space**: Jump
- **ESC**: Pause

## License

MIT 