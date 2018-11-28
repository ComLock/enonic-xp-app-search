//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
import {get as getContentByKey} from '/lib/xp/content';
import {getLocale} from '/lib/xp/admin';


//──────────────────────────────────────────────────────────────────────────────
// Local libs (Absolute path without extension so it doesn't get webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {Facets} from '/lib/appSearch/Facets';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
// This is typically called from
// recipe site mapping controller during development,
// and some component (page/layout/part) or service in production.
export function search({
	params,
	recipeContent,
	recipeId = recipeContent ? recipeContent._id : params.recipeId
}) {
	log.info(toStr({params}));

	// Returns the preferred locale based on the current HTTP request, or the server default locale if none is specified.
	const locale = params.locale || getLocale(); log.info(toStr({locale}));

	if (!recipeId) { throw new Error('Required param recipeId missing!'); }

	if (!recipeContent) {
		recipeContent = getContentByKey({key: recipeId}); // eslint-disable-line no-param-reassign
		if (!recipeContent) { throw new Error(`Unable to find recipe with id:${recipeId}!`); }
	}

	const facetCategories = new Facets({
		facetCategoryIds: recipeContent.data.facetCategoryIds,
		params
	});
	//const filters = {};

	/*let page = params.page ? parseInt(params.page, 10) : 1; // NOTE First index is 1 not 0
	const count = params.count ? parseInt(params.count, 10) : 10;
	const start = params.count ? parseInt(params.start, 10) : (page - 1) * count; // NOTE First index is 0 not 1
	const {
		name = 'q',
		searchString = ''
	} = params;
	/*log.info(toStr({
		count,
		page,
		recipeId,
		start
	}));
	if (!page) { page = Math.floor(start / count) + 1; }*/
} // function search
