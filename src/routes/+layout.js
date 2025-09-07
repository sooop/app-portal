// /+layout.js
/** @type {import('./$types').LayoutLoad} */
export function load() {
	return {
		links: [
			{
				'link': '/satisfaction',
				'title': '설문응답 분석하기'
			},
			{
				'link': '/attendance',
				'title': '수강생 정보 분석'
			}
		]
	};
}