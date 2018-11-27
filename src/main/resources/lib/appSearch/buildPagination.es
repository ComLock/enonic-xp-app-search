//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
import {localize} from '/lib/xp/i18n';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export function buildPagination({
	optionSet,
	locale,
	name, // name of url query parameter that contains the searchString
	searchString,
	page,
	pages
}) {
	const {
		_selected: selected,
		static: {
			pagesToShow = 10,
			first = true,
			prev = true,
			next = true,
			last = true
		} = {}
	} = optionSet;
	if (!selected) { return []; }
	const pagination = [];
	if (first && page > 1) {
		pagination.push({
			href: `?${name}=${searchString}`,
			text: localize({locale, key: 'search.pagination.first'})
		});
	}

	if (prev && page > 2) {
		pagination.push({
			href: `?${name}=${searchString}&page=${page - 1}`,
			text: localize({locale, key: 'search.pagination.prev'})
		});
	}

	const half = Math.ceil(pagesToShow / 2);
	const firstPageToShow = Math.max(1, Math.min(pages - pagesToShow + 1, page - half));
	const lastPageToShow = Math.min(pages, firstPageToShow + pagesToShow - 1);
	/*log.info(toStr({
		page, pagesToShow, half, firstPageToShow, pages, lastPageToShow
	}));*/
	for (let i = firstPageToShow; i <= lastPageToShow; i += 1) {
		//log.info(toStr({i, page}));
		pagination.push({
			href: i === page ? null : `?${name}=${searchString}${i === 1 ? '' : '&page=' + i}`, // eslint-disable-line prefer-template
			text: `${i}`
		});
	} // for

	if (page < pages) {
		if (next && page < (pages - 1)) {
			pagination.push({
				href: `?${name}=${searchString}&page=${page + 1}`,
				text: localize({locale, key: 'search.pagination.next'})
			});
		}
		if (last) {
			pagination.push({
				href: `?${name}=${searchString}&page=${pages}`,
				text: localize({locale, key: 'search.pagination.last'})
			});
		}
	}
	log.info(toStr({pagination}));
	return pagination;
}
