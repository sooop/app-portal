<script>
	import UnifiedAnalyzer from '$lib/components/UnifiedAnalyzer.svelte';
</script>

<div class="min-h-screen bg-gray-50 py-12 px-6">
	<div class="max-w-6xl mx-auto">
		<header class="mb-12 text-center">
			<h1 class="text-3xl font-medium text-gray-900">통합 분석 시스템</h1>
			<p class="mt-2 text-sm text-gray-600">
				Excel 파일 하나로 수강생 정보와 만족도를 동시에 분석합니다
			</p>
		</header>

		<UnifiedAnalyzer />
	</div>
</div>
