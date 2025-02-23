<script lang="ts">
	import { merge_and_convert } from '$lib/converter';
	import { theme } from '$lib/stores/theme';

	let config_input = $state('');
	let css_input = $state('');
	let result = $state<{
		css: string;
		warnings: string[];
		errors: string[];
	} | null>(null);

	const handle_convert = () => {
		try {
			result = merge_and_convert(config_input, css_input);
		} catch (error: unknown) {
			result = {
				css: '',
				warnings: [],
				errors: [
					error instanceof Error ? error.message : String(error),
				],
			};
		}
	};

	const copy_to_clipboard = async () => {
		if (result?.css) {
			await navigator.clipboard.writeText(result.css);
		}
	};
</script>

{#key $theme}
	<div class="container mx-auto p-4">
		<h1 class="mb-8 text-4xl font-bold">
			Tailwind v3 to v4 Converter
		</h1>

		<div class="grid gap-4 md:grid-cols-2">
			<!-- Input Section -->
			<div class="space-y-4">
				<div class="border-base-300 rounded-lg border p-4">
					<h2 class="mb-4 text-2xl font-semibold">Tailwind Config</h2>
					<textarea
						bind:value={config_input}
						class="textarea textarea-bordered h-64 w-full font-mono"
						placeholder="Paste your tailwind.config.js/ts here..."
					/>
				</div>

				<div class="border-base-300 rounded-lg border p-4">
					<h2 class="mb-4 text-2xl font-semibold">CSS Input</h2>
					<textarea
						bind:value={css_input}
						class="textarea textarea-bordered h-64 w-full font-mono"
						placeholder="Paste your app.css here..."
					/>
				</div>

				<button
					class="btn btn-primary w-full"
					onclick={handle_convert}
					disabled={!config_input || !css_input}
				>
					Convert to Tailwind v4
				</button>
			</div>

			<!-- Output Section -->
			<div class="space-y-4">
				<div class="border-base-300 rounded-lg border p-4">
					<div class="flex items-center justify-between">
						<h2 class="text-2xl font-semibold">Converted CSS</h2>
						{#if result?.css}
							<button
								class="btn btn-outline btn-sm"
								onclick={copy_to_clipboard}
							>
								Copy
							</button>
						{/if}
					</div>

					{#if result?.css}
						<pre
							class="bg-base-200 mt-4 max-h-[600px] overflow-auto rounded-lg p-4 font-mono">{result.css}</pre>
					{:else}
						<div
							class="bg-base-200 mt-4 flex h-[600px] items-center justify-center rounded-lg"
						>
							<p class="text-base-content/50">
								Converted CSS will appear here...
							</p>
						</div>
					{/if}
				</div>

				{#if result?.warnings?.length || result?.errors?.length}
					<div class="space-y-2">
						{#each result.errors || [] as error}
							<div class="alert alert-error" role="alert">
								{error}
							</div>
						{/each}
						{#each result.warnings || [] as warning}
							<div class="alert alert-warning" role="alert">
								{warning}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/key}
