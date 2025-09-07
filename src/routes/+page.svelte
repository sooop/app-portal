<script>
	import Link from './Link.svelte';
	let { data } = $props();
</script>
<div
	class={[
		"flex flex-row items-center justify-center w-full h-full",
		"min-h-screen",
	]}
>
	<div class="flex flex-col">
		<h1 class="text-xl text-center font-bold text-white">List of Applications</h1>
		<div class="p-4">
			<ul>
				{#each data.links as {link, title}}
					<Link {link} {title}/>
				{/each}
			</ul>
		</div>
	</div>
</div>
