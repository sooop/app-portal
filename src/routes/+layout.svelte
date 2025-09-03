<script>
	import favicon from '$lib/assets/favicon.svg';
	import "../app.css";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<div class="min-h-screen w-full bg-gradient-to-br from-blue-400 to-purple-500">
{@render children?.()}
</div>
