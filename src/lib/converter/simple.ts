import type { ConversionResult } from './types';

const convert_imports = (css: string): string => {
	// In v4, we only need a single @import "tailwindcss"
	// Remove all tailwindcss/X imports
	return '@import "tailwindcss";';
};

const convert_colors = (css: string): string => {
	// Convert color variables to new format
	return css
		.replace(/oklch\(var\(--p\)\)/g, 'var(--color-primary)')
		.replace(/oklch\(var\(--pc\)\)/g, 'var(--color-primary-content)')
		.replace(/oklch\(var\(--s\)\)/g, 'var(--color-secondary)')
		.replace(
			/oklch\(var\(--sc\)\)/g,
			'var(--color-secondary-content)',
		)
		.replace(/oklch\(var\(--a\)\)/g, 'var(--color-accent)')
		.replace(/oklch\(var\(--ac\)\)/g, 'var(--color-accent-content)')
		.replace(/oklch\(var\(--n\)\)/g, 'var(--color-neutral)')
		.replace(/oklch\(var\(--nc\)\)/g, 'var(--color-neutral-content)')
		.replace(/oklch\(var\(--b1\)\)/g, 'var(--color-base-100)')
		.replace(/oklch\(var\(--b2\)\)/g, 'var(--color-base-200)')
		.replace(/oklch\(var\(--b3\)\)/g, 'var(--color-base-300)')
		.replace(/oklch\(var\(--bc\)\)/g, 'var(--color-base-content)');
};

const convert_base_layer = (css: string): string => {
	const parts: string[] = [];

	// Extract base styles (html, ::selection, scrollbar)
	const html_match = css.match(/html\s*{([^}]*)}/);
	const selection_match = css.match(/::selection\s*{([^}]*)}/);
	const scrollbar_match = css.match(/\*\s*{[^}]*scrollbar[^}]*}/);
	const scrollbar_track = css.match(
		/::-webkit-scrollbar-track\s*{([^}]*)}/,
	);
	const scrollbar_thumb = css.match(
		/::-webkit-scrollbar-thumb\s*{([^}]*)}/,
	);

	if (
		html_match ||
		selection_match ||
		scrollbar_match ||
		scrollbar_track ||
		scrollbar_thumb
	) {
		parts.push('@layer base {');

		if (html_match) {
			parts.push('  html {');
			parts.push('    ' + html_match[1].trim());
			parts.push('  }');
		}

		if (selection_match) {
			parts.push('  ::selection {');
			parts.push('    ' + convert_colors(selection_match[1].trim()));
			parts.push('  }');
		}

		if (scrollbar_match || scrollbar_track || scrollbar_thumb) {
			if (scrollbar_match) {
				parts.push('  * {');
				parts.push(
					'    ' +
						convert_colors(
							scrollbar_match[0]
								.match(/scrollbar[^;]+;/g)
								?.join('\n    ') || '',
						),
				);
				parts.push('  }');
			}

			if (scrollbar_track) {
				parts.push('  ::-webkit-scrollbar-track {');
				parts.push(
					'    ' + convert_colors(scrollbar_track[1].trim()),
				);
				parts.push('  }');
			}

			if (scrollbar_thumb) {
				parts.push('  ::-webkit-scrollbar-thumb {');
				parts.push(
					'    ' + convert_colors(scrollbar_thumb[1].trim()),
				);
				parts.push('  }');
			}
		}

		parts.push('}');
	}

	return parts.join('\n');
};

const convert_components = (css: string): string => {
	// Extract component classes
	const components = css.match(/\.([\w-]+)\s*{[^}]+}/g) || [];

	if (components.length) {
		return (
			'@layer components {\n' +
			components
				.map((comp) => '  ' + convert_colors(comp))
				.join('\n') +
			'\n}'
		);
	}

	return '';
};

const convert_plugins = (config: string): string => {
	const plugins: string[] = [];

	// Add typography plugin if present
	if (config.includes('@tailwindcss/typography')) {
		plugins.push('@plugin "@tailwindcss/typography";');

		// Extract typography config if present and add as a separate block
		const typography_match = config.match(/typography:\s*{([^}]*)}/);
		if (typography_match) {
			plugins.push('@layer base {');
			plugins.push('  :where(html) {');
			plugins.push('    max-width: initial;');
			plugins.push('  }');
			plugins.push('}');
		}
	}

	// Add daisyui plugin if present
	if (config.includes('daisyui')) {
		plugins.push('@plugin "daisyui" {');
		// Check if using specific themes
		const themes_match = config.match(/themes:\s*\[(.*?)\]/);
		if (themes_match) {
			const themes = themes_match[1]
				.split(',')
				.map((t) => t.trim().replace(/['"]/g, ''))
				.filter(Boolean);
			if (themes.length) {
				plugins.push(`  themes: ${themes.join(', ')};`);
			}
		} else if (
			config.includes('themes: true') ||
			config.includes('themes()')
		) {
			plugins.push('  themes: all;');
		}
		plugins.push('}');
	}

	return plugins.join('\n\n');
};

export const convert = (
	config: string,
	css: string,
): ConversionResult => {
	try {
		const parts: string[] = [];

		// Handle non-Tailwind imports first (like fonts)
		const imports =
			css.match(/@import\s+(?!['"]tailwindcss).*?;/g) || [];
		if (imports.length) {
			parts.push('/* Import fonts */');
			parts.push(...imports);
			parts.push('');
		}

		// Add Tailwind import
		parts.push('/* Import Tailwind */');
		parts.push(convert_imports(css));
		parts.push('');

		// Add base layer
		const base = convert_base_layer(css);
		if (base) {
			parts.push('/* Base layer */');
			parts.push(base);
			parts.push('');
		}

		// Add components
		const components = convert_components(css);
		if (components) {
			parts.push('/* Components */');
			parts.push(components);
			parts.push('');
		}

		// Add plugin configurations
		const plugins = convert_plugins(config);
		if (plugins) {
			parts.push('/* Plugin configurations */');
			parts.push(plugins);
		}

		return {
			css: parts.join('\n'),
			warnings: [],
			errors: [],
		};
	} catch (error) {
		return {
			css: '',
			warnings: [],
			errors: [
				`Conversion error: ${error instanceof Error ? error.message : String(error)}`,
			],
		};
	}
};
