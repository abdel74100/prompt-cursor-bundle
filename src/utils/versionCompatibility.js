/**
 * Version compatibility matrix for common tech stacks
 */

const COMPATIBILITY_MATRIX = {
  // React + Vite + TailwindCSS stack
  'react-vite-tailwind': {
    name: 'React + Vite + TailwindCSS',
    packages: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'vite': '^5.0.0',
      'tailwindcss': '^3.4.0',  // v3 is stable with PostCSS
      'postcss': '^8.4.31',
      'autoprefixer': '^10.4.16',
      '@vitejs/plugin-react': '^4.2.0'
    },
    devDependencies: {
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.31',
      'autoprefixer': '^10.4.16'
    },
    notes: [
      'TailwindCSS v3 uses standard PostCSS plugin',
      'TailwindCSS v4 requires @tailwindcss/postcss (breaking change)',
      'Using v3 for compatibility'
    ]
  },

  // Next.js + TailwindCSS
  'nextjs-tailwind': {
    name: 'Next.js + TailwindCSS',
    packages: {
      'next': '^14.0.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.31',
      'autoprefixer': '^10.4.16'
    },
    devDependencies: {
      'tailwindcss': '^3.4.0',
      'postcss': '^8.4.31',
      'autoprefixer': '^10.4.16'
    }
  },

  // Express + Node.js
  'express-node': {
    name: 'Express + Node.js',
    packages: {
      'express': '^4.18.0',
      'cors': '^2.8.5',
      'dotenv': '^16.3.0',
      'helmet': '^7.1.0'
    },
    devDependencies: {
      'nodemon': '^3.0.0'
    },
    engines: {
      'node': '>=18.0.0'
    }
  },

  // Prisma + SQLite
  'prisma-sqlite': {
    name: 'Prisma + SQLite',
    packages: {
      '@prisma/client': '^5.7.0'
    },
    devDependencies: {
      'prisma': '^5.7.0'
    }
  },

  // JWT + bcrypt
  'auth-jwt': {
    name: 'JWT Authentication',
    packages: {
      'bcrypt': '^5.1.0',
      'jsonwebtoken': '^9.0.0'
    }
  },

  // React Native + Expo
  'react-native-expo': {
    name: 'React Native + Expo',
    packages: {
      'expo': '~49.0.0',
      'react': '18.2.0',
      'react-native': '0.72.0'
    }
  },

  // NestJS
  'nestjs': {
    name: 'NestJS',
    packages: {
      '@nestjs/common': '^10.0.0',
      '@nestjs/core': '^10.0.0',
      '@nestjs/platform-express': '^10.0.0',
      'reflect-metadata': '^0.1.13',
      'rxjs': '^7.8.1'
    }
  }
};

/**
 * Get PostCSS configuration for TailwindCSS v3
 */
function getPostCSSConfig() {
  return {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  };
}

/**
 * Get Tailwind config template
 */
function getTailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
}

/**
 * Get Vite config for React + TailwindCSS
 */
function getViteConfig() {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
})`;
}

/**
 * Detect stack from project description
 */
function detectStack(description) {
  const lowerDesc = description.toLowerCase();
  const stacks = [];

  // Frontend frameworks
  if (lowerDesc.includes('react') && lowerDesc.includes('vite') && lowerDesc.includes('tailwind')) {
    stacks.push('react-vite-tailwind');
  } else if (lowerDesc.includes('next') && lowerDesc.includes('tailwind')) {
    stacks.push('nextjs-tailwind');
  } else if (lowerDesc.includes('react native') || lowerDesc.includes('expo')) {
    stacks.push('react-native-expo');
  }

  // Backend frameworks
  if (lowerDesc.includes('express') || lowerDesc.includes('node')) {
    stacks.push('express-node');
  } else if (lowerDesc.includes('nestjs') || lowerDesc.includes('nest.js')) {
    stacks.push('nestjs');
  }

  // Database
  if (lowerDesc.includes('prisma')) {
    stacks.push('prisma-sqlite');
  }

  // Auth
  if (lowerDesc.includes('jwt') || lowerDesc.includes('auth')) {
    stacks.push('auth-jwt');
  }

  return stacks;
}

/**
 * Get compatibility notes for detected stacks
 */
function getCompatibilityNotes(stacks) {
  const notes = [];
  
  stacks.forEach(stackKey => {
    const stack = COMPATIBILITY_MATRIX[stackKey];
    if (stack && stack.notes) {
      notes.push(`\n**${stack.name}:**`);
      stack.notes.forEach(note => notes.push(`- ${note}`));
    }
  });

  return notes.join('\n');
}

/**
 * Generate package versions section for prompt
 */
function generateVersionsSection(description) {
  const stacks = detectStack(description);
  
  if (stacks.length === 0) {
    return '';
  }

  let section = '\n## ⚠️ IMPORTANT: Package Versions (Compatibility Verified)\n\n';
  section += 'Use these EXACT versions to avoid compatibility issues:\n\n';

  const allPackages = {};
  const allDevDependencies = {};

  stacks.forEach(stackKey => {
    const stack = COMPATIBILITY_MATRIX[stackKey];
    if (stack) {
      section += `### ${stack.name}\n\n`;
      
      if (stack.packages) {
        section += '**Dependencies:**\n```json\n';
        Object.entries(stack.packages).forEach(([pkg, version]) => {
          section += `"${pkg}": "${version}",\n`;
          allPackages[pkg] = version;
        });
        section += '```\n\n';
      }

      if (stack.devDependencies) {
        section += '**Dev Dependencies:**\n```json\n';
        Object.entries(stack.devDependencies).forEach(([pkg, version]) => {
          section += `"${pkg}": "${version}",\n`;
          allDevDependencies[pkg] = version;
        });
        section += '```\n\n';
      }
    }
  });

  // Add compatibility notes
  const notes = getCompatibilityNotes(stacks);
  if (notes) {
    section += '### 📋 Compatibility Notes\n';
    section += notes + '\n\n';
  }

  // Add configuration files if TailwindCSS is detected
  if (stacks.includes('react-vite-tailwind') || stacks.includes('nextjs-tailwind')) {
    section += '### 📝 Required Configuration Files\n\n';
    
    section += '**postcss.config.js:**\n```javascript\n';
    section += JSON.stringify(getPostCSSConfig(), null, 2);
    section += '\n```\n\n';
    
    section += '**tailwind.config.js:**\n```javascript\n';
    section += getTailwindConfig();
    section += '\n```\n\n';
    
    if (stacks.includes('react-vite-tailwind')) {
      section += '**vite.config.js:**\n```javascript\n';
      section += getViteConfig();
      section += '\n```\n\n';
    }
  }

  return section;
}

/**
 * Get specific version for a package
 */
function getPackageVersion(packageName, stackKeys) {
  for (const stackKey of stackKeys) {
    const stack = COMPATIBILITY_MATRIX[stackKey];
    if (stack) {
      if (stack.packages && stack.packages[packageName]) {
        return stack.packages[packageName];
      }
      if (stack.devDependencies && stack.devDependencies[packageName]) {
        return stack.devDependencies[packageName];
      }
    }
  }
  return null;
}

module.exports = {
  COMPATIBILITY_MATRIX,
  detectStack,
  generateVersionsSection,
  getCompatibilityNotes,
  getPackageVersion,
  getPostCSSConfig,
  getTailwindConfig,
  getViteConfig
};
