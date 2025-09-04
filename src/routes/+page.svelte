<script>
	import Link from './Link.svelte';
	const links = [
		{ 'link':'/satisfaction',
			'title':'설문응답 분석하기'},
		{'link':'/attendance',
			'title':'수강생 정보 분석'}
		];

</script>
<div
	class={[
		"flex flex-row items-center justify-center w-full h-full",
		"min-h-screen",
	]}
>
	<div class="flex flex-col">
		<h1 class="text-xl font-bold text-white">List of Applications</h1>
		<div class="p-4">
			<ul>
				{#each links as {link, title}}
					<Link {link} {title}/>
				{/each}
			</ul>
		</div>
	</div>
</div>
