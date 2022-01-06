//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {newCache} from '/lib/cache';
import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {getLocale} from '/lib/xp/admin';
import {multiRepoConnect} from '/lib/xp/node';
import {applySynonyms} from '/lib/enonic/yase/applySynonyms';

//──────────────────────────────────────────────────────────────────────────────
// Local libs (Absolute path without extension so it doesn't get webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {buildPagination} from '/lib/appSearch/buildPagination';
import {buildQuery} from '/lib/appSearch/buildQuery';
import {cachedContent} from '/lib/appSearch/cachedContent';
import {cachedQuery} from '/lib/appSearch/cachedQuery';
import {Facets} from '/lib/appSearch/Facets';
import {Mappings} from '/lib/enonic/search/Mappings';


//──────────────────────────────────────────────────────────────────────────────
// Private constants
//──────────────────────────────────────────────────────────────────────────────
const CONTENT_CACHE = newCache({
	expire: 3600,
	size: 100
});

const NODE_CACHE = newCache({
	expire: 3600,
	size: 100
});

const QUERY_CACHE = newCache({
	expire: 5 * 60, // 5 minutes
	size: 100
});


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
	if (params.clearCache) {
		log.info('Clearing content, node and query cache.');
		CONTENT_CACHE.clear();
		NODE_CACHE.clear();
		QUERY_CACHE.clear();
	}

	//log.info(toStr({params}));
	const name = params.name || 'q';
	const searchString = params.searchString || params[name] || '';

	// Returns the preferred locale based on the current HTTP request, or the server default locale if none is specified.
	const locale = params.locale || getLocale(); //log.info(toStr({locale}));

	if (!recipeId) { throw new Error('Required param recipeId missing!'); }

	if (!recipeContent) {
		recipeContent = cachedContent({cache: CONTENT_CACHE, key: recipeId}); // eslint-disable-line no-param-reassign
		if (!recipeContent) { throw new Error(`Unable to find recipe with id:${recipeId}!`); }
	}

	const {data} = recipeContent;
	const {expressionId, pagination: paginationOptionSet, thesauri} = data;
	//log.info(toStr({thesauri}));

	const searchStringWithSynonyms = applySynonyms({
		//expand: true, // default is false
		searchString,
		thesauri
	});
	log.info(toStr({searchStringWithSynonyms}));

	// Allowing empty query:
	const query = expressionId && searchString ? buildQuery({expressionId, searchString}) : ''; //log.info(toStr({query}));

	const repoIds = forceArray(data.repoIds); //log.info(toStr({repoIds}));
	const sources = repoIds.map(repoId => ({
		repoId,
		branch: 'master', // NOTE Hardcoded
		principals: ['role:system.admin'] // TODO Remove hardcode?
	}));
	const multiRepoConnection = multiRepoConnect({sources});

	const filters = {};
	const boolean = {};
	if (data.filters && data.filters._selected) {
		//log.info(toStr({filters: data.filters}));
		const selectedFilterGroups = forceArray(data.filters._selected); //log.info(toStr({selectedFilterGroups}));
		selectedFilterGroups.forEach((filterGroup) => {
			//log.info(toStr({filterGroup}));
			boolean[filterGroup] = [];
			const selectedFilters = forceArray(data.filters[filterGroup].filter._selected); //log.info(toStr({selectedFilters}));
			selectedFilters.forEach((filterType) => {
				const filter = {};
				if (['exists', 'notExists', 'hasValue'].includes(filterType)) {
					filter.field = data.filters[filterGroup].filter[filterType].field;
				}
				if (['hasValue', 'ids'].includes(filterType)) {
					filter.values = forceArray(data.filters[filterGroup].filter[filterType].values);
				}
				boolean[filterGroup].push({[filterType]: filter});
			});
		}); // forEach filterGroup
		filters.boolean = boolean;
	} // if filters
	//log.info(toStr({filters}));

	const facets = new Facets({
		contentCache: CONTENT_CACHE,
		facetCategoryIds: recipeContent.data.facetCategoryIds,
		filters,
		locale,
		multiRepoConnection,
		params,
		query,
		queryCache: QUERY_CACHE
	});
	const facetCategories = facets.getCategoriesArray(); //log.info(toStr({facetCategories}));
	//log.info(toStr({filters}));

	let page = params.page ? parseInt(params.page, 10) : 1; // NOTE First index is 1 not 0
	const count = params.count ? parseInt(params.count, 10) : 10;
	const start = params.start ? parseInt(params.start, 10) : (page - 1) * count; // NOTE First index is 0 not 1
	/*log.info(toStr({
		count,
		page,
		start
	}));*/
	if (!page) { page = Math.floor(start / count) + 1; }


	const queryParams = {
		count,
		filters,
		query,
		start
	}; //log.info(toStr({queryParams}));
	const queryRes = cachedQuery({cache: QUERY_CACHE, connection: multiRepoConnection, params: queryParams}); //log.info(toStr({queryRes}));
	const pages = Math.ceil(queryRes.total / count); //log.info(toStr({pages}));

	const pagination = buildPagination({
		facetId: params.facetId,
		optionSet: paginationOptionSet,
		locale,
		name,
		searchString,
		page,
		pages
	}); //log.info(toStr({pagination}));

	const mappings = new Mappings({
		contentCache: CONTENT_CACHE,
		mappingIds: forceArray(data.resultMappingIds)
	});
	//log.info(toStr({mappings}));

	return {
		params: {
			count,
			facetId: params.facetId || [],
			locale,
			page,
			recipeId,
			searchString,
			start
		},
		count: queryRes.count,
		facetCategories,
		pages,
		pagination,
		query,
		repoIds,
		//aggregations: aggregationsObj.handleResult(queryRes.aggregations),
		total: queryRes.total,
		hits: queryRes.hits.map(hit => mappings.handleMultirepoQueryHit({
			...hit,
			tagIdToLocalizedFacetCategoryName: facets.tagIdToLocalizedFacetCategoryName,
			tagIdToLocalizedFacetName: facets.tagIdToLocalizedFacetName,
			nodeCache: NODE_CACHE,
			searchString
		}))
	};
} // function search
