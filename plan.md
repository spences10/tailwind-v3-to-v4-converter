# Tailwind v3 to v4 converter

## Project Structure

The converter will handle two main tasks:

1. Converting Tailwind v3 config to v4 CSS syntax
2. Merging app.css with the converted config into a single file

## Key Conversion Points

1. Config to CSS Variables:

   - Theme colors → CSS custom properties
   - Screen breakpoints → @custom-media
   - Typography settings → @plugin configurations
   - DaisyUI themes → @plugin "daisyui/theme"

2. CSS Structure:
   - Replace @tailwindcss imports with single @import
   - Convert @apply directives to new syntax
   - Update color syntax (especially for opacity)
   - Handle plugin configurations

## Example Files

### v3 files

tailwind.config.ts

```ts
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';
import type { Config } from 'tailwindcss';
import tailwind_theme from 'tailwindcss/defaultTheme';
import { create_daisy_themes } from './src/lib/themes';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		screens: {
			xs: '475px',
			...tailwind_theme.screens,
		},
		extend: {
			typography: {
				DEFAULT: {
					css: {
						maxWidth: null,
						img: {
							filter:
								'drop-shadow(0 20px 13px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 5px rgb(0 0 0 / 0.08));',
							margin: '0 auto',
						},
					},
				},
			},
		},
	},

	daisyui: {
		darkTheme: 'night',
		themes: create_daisy_themes(),
		logs: false,
	},

	plugins: [typography, daisyui],
} satisfies Config;
```

app.css

```css
@import '@fontsource-variable/victor-mono';
@import '@fontsource-variable/manrope';
@import '@fontsource-variable/playpen-sans';

@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

html {
	scroll-behavior: smooth;
	word-break: break-word;
}

::selection {
	color: oklch(var(--pc));
	background: oklch(var(--p));
}

.table-of-contents {
	z-index: 1;
	position: fixed;
	left: calc(50% + 400px);
	top: 18rem;
	max-height: 50vh;
	width: 310px;
	padding: 0.75rem;
	margin: 0.75rem 0;
	font-size: 1rem;
	line-height: 1.75rem;
}

.all-prose {
	@apply prose-a:text-primary hover:prose-a:text-accent prose prose-lg lg:prose-xl prose-headings:scroll-mt-16 prose-a:transition;
}

/* 
Scrollbar styles:
	scrollbar-color Two valid colors. thumb and track
	scrollbar-gutter padding when there's no scrollbar
	scrollbar-width auto | thin | none
*/
* {
	scrollbar-width: thin;
	scrollbar-color: oklch(var(--s)) oklch(var(--p)) !important;
}

::-webkit-scrollbar-track {
	background: oklch(var(--p));
}

::-webkit-scrollbar-thumb {
	background-color: oklch(var(--s));
}
```

## result

app.css

```css
/* Import fonts */
@import '@fontsource-variable/victor-mono';
@import '@fontsource-variable/manrope';
@import '@fontsource-variable/playpen-sans';

/* Import Tailwind and plugins */
@import 'tailwindcss';

@layer base {
	html {
		scroll-behavior: smooth;
		word-break: break-word;
	}

	::selection {
		color: var(--color-primary-content);
		background: var(--color-primary);
	}

	/* Scrollbar styles using modern syntax */
	* {
		scrollbar-width: thin;
		scrollbar-color: var(--color-secondary) var(--color-primary) !important;
	}

	::-webkit-scrollbar-track {
		background: var(--color-primary) !important;
	}

	::-webkit-scrollbar-thumb {
		background-color: var(--color-secondary) !important;
	}
}

/* Custom screen sizes */
@custom-media --xs (min-width: 475px);
@custom-media --sm (min-width: 640px);
@custom-media --md (min-width: 768px);
@custom-media --lg (min-width: 1024px);
@custom-media --xl (min-width: 1280px);
@custom-media --2xl (min-width: 1536px);

/* Custom components */
@layer components {
	.table-of-contents {
		@apply fixed left-[calc(50%+400px)] top-72 z-10 my-3 max-h-[50vh] w-[310px] p-3 text-base leading-7;
	}

	.all-prose {
		@apply prose prose-lg lg:prose-xl prose-headings:scroll-mt-16 prose-a:text-primary prose-a:transition prose-a:hover:text-accent max-w-none;

		/* remove derp backticks from prose */
		:where(code):not(:where([class~='not-prose'] *, pre *)) {
			font-family: 'Victor Mono Variable', monospace;
			padding: 1px 8px;
			border-radius: var(--radius-selector);
			font-weight: initial;
			background-color: var(
				--fallback-bc,
				color-mix(
					in oklab,
					var(--color-base-content),
					transparent 90%
				)
			);
		}

		/* Remove code markers */
		:where(code):not(:where([class~='not-prose'] *, pre *))::before,
		:where(code):not(:where([class~='not-prose'] *, pre *))::after {
			content: '' !important;
			display: none !important;
		}
	}
}

/* Plugin configurations */
@plugin "@tailwindcss/typography";
@plugin "daisyui" {
	themes: all;
}

@plugin "daisyui/theme" {
	name: 'wireframe';
	--color-primary: oklch(32.37% 0.177 264.06); /* Navy */
	--color-primary-content: oklch(100% 0 0); /* White */
	--color-secondary: oklch(54.02% 0 0); /* Gray */
	--color-secondary-content: oklch(0% 0 0); /* Black */
	--color-accent: oklch(50.12% 0.156 196.63); /* Teal */
	--color-accent-content: oklch(100% 0 0); /* White */
	--color-neutral: oklch(78.57% 0 0); /* Silver */
	--color-neutral-content: oklch(0% 0 0); /* Black */
	--color-base-100: oklch(78.57% 0 0); /* Silver */
	--color-base-200: oklch(67.28% 0 0); /* Darker silver */
	--color-base-300: oklch(54.02% 0 0); /* Gray */
	--color-base-content: oklch(0% 0 0); /* Black */
	--color-info: oklch(32.37% 0.177 264.06); /* Navy */
	--color-info-content: oklch(100% 0 0); /* White */
	--color-success: oklch(46.37% 0.156 142.5); /* Green */
	--color-success-content: oklch(100% 0 0); /* White */
	--color-warning: oklch(52.19% 0.125 102.85); /* Olive */
	--color-warning-content: oklch(100% 0 0); /* White */
	--color-error: oklch(37.47% 0.156 29.23); /* Maroon */
	--color-error-content: oklch(100% 0 0); /* White */
	--radius-box: 0;
	--radius-field: 0;
	--radius-selector: 0;
	font-family:
		'Chalkboard', 'comic sans ms', 'Playpen Sans Variable',
		'sans-serif';
}

@plugin "daisyui/theme" {
	name: 'corporate';
	font-family: 'Manrope Variable';
}

@plugin "daisyui/theme" {
	name: 'cyberpunk';
	font-family: 'Victor Mono Variable';
}
```
