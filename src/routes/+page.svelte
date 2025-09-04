<script>
	import Link from './Link.svelte';
	const links = [
		{ 'link':'https://claude.ai/public/artifacts/87a7cbc4-067c-4477-b3f7-99b0be7f9894',
			'title':'설문응답 분석하기'},
		{'link':'https://claude.ai/public/artifacts/d37c4bc8-d607-4a92-a885-6dc1026a2ba6',
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
