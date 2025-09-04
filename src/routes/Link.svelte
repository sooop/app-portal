<script>
	const {title="Untitled Link", link} = $props();
</script>

<li class="mb-4 text-sm text-white mx-1">
	<a href={link} target="_blank"
		class={["inline-block rounded-sm p-2",
	"hover:bg-blue-600 transition-colur duration-200"]}
		>{title}</a>

</li>
