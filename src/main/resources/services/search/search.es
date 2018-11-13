//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';
import {multiRepoConnect} from '/lib/xp/node';


//──────────────────────────────────────────────────────────────────────────────
// Local libs (Absolute path without extension so it doesn't get webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {buildQuery} from '/lib/appSearch/buildQuery';
import {jsonError} from '/lib/appSearch/jsonError';
import {jsonResponse} from '/lib/appSearch/jsonResponse';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export function get({params}) {
	log.info(toStr({params}));
	let {page = 1} = params; // NOTE First index is 1 not 0
	const {
		count = 10,
		recipeId,
		searchString = '',
		start = (page - 1) * count // NOTE First index is 0 not 1
	} = params;
	log.info(toStr({
		count,
		page,
		recipeId,
		start
	}));
	if (!page) { page = Math.floor(start / count) + 1; }
	if (!recipeId) { return jsonError('Required param recipeId missing!'); }

	const recipeContent = getContentByKey({key: recipeId}); log.info(toStr({recipeContent}));
	if (!recipeContent) { return jsonError(`Unable to find recipe with id:${recipeId}!`); }

	const {data} = recipeContent;
	const {expressionId} = data;
	//if (!expressionId) { return jsonError(`Recipe with id:${recipeId} is missing required param data.expressionId!`); }

	// Allowing empty query:
	const query = expressionId ? buildQuery({expressionId, searchString}) : ''; log.info(toStr({query}));
	const queryParams = {
		//aggregations,
		count,
		//filter,
		query,
		start
	};
	log.info(toStr({queryParams}));

	const repoIds = forceArray(data.repoIds); log.info(toStr({repoIds}));
	const sources = repoIds.map(repoId => ({
		repoId,
		branch: 'master', // NOTE Hardcoded
		principals: []
	}));
	const multiRepoConnection = multiRepoConnect({sources});

	const res = multiRepoConnection.query(queryParams); log.info(toStr({res}));
	const pages = Math.ceil(res.total / count); log.info(toStr({pages}));

	return jsonResponse({
		params: {
			count,
			page,
			recipeId,
			searchString,
			start
		},
		count: res.count,
		pages,
		query,
		repoIds,
		total: res.total,
		hits: res.hits
	});
}
