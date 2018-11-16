//──────────────────────────────────────────────────────────────────────────────
// Node modules (webpacked)
//──────────────────────────────────────────────────────────────────────────────
import set from 'set-value';
import {findAll} from 'highlight-words-core';


//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {dlv} from '/lib/enonic/util/object';
import {get as getContentByKey} from '/lib/xp/content';
import {connect, multiRepoConnect} from '/lib/xp/node';


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
		principals: ['role:system.admin'] // TODO Remove hardcode?
	}));
	const multiRepoConnection = multiRepoConnect({sources});

	const queryRes = multiRepoConnection.query(queryParams); log.info(toStr({queryRes}));
	const pages = Math.ceil(queryRes.total / count); log.info(toStr({pages}));

	const resultMappings = forceArray(data.resultMappings).map(({conditionId, doBreak = false, mappings}) => {
		const conditionContent = getContentByKey({key: conditionId}); log.info(toStr({conditionContent}));
		return {
			condition: conditionContent.data,
			doBreak,
			mappings: forceArray(mappings)
		};
	}); log.info(toStr({resultMappings}));

	return jsonResponse({
		params: {
			count,
			page,
			recipeId,
			searchString,
			start
		},
		count: queryRes.count,
		pages,
		query,
		repoIds,
		total: queryRes.total,
		hits: queryRes.hits.map(({
			id, score, repoId, branch
		}) => {
			const repoConnection = connect({
				repoId,
				branch,
				principals: ['role:system.admin'] // TODO Remove hardcode?
			});
			const node = repoConnection.get(id); //log.info(toStr({node}));
			const hit = {
				id,
				score,
				repoId,
				branch,
				node
			};
			const mapped = {};
			for (let i = 0; i < resultMappings.length; i += 1) {
				const {field, operator, value} = resultMappings[i].condition;
				log.info(toStr({field, operator, value}));
				const actual = dlv(hit, field); log.info(toStr({actual}));
				let truthy = false;
				switch (operator) {
				case 'eq': truthy = actual == value; break; // eslint-disable-line eqeqeq
				case 'f': truthy = !actual; break;
				case 'ne': truthy = actual != value; break; // eslint-disable-line eqeqeq
				case 't': truthy = actual; break;
				default: {
					const msg = `Unknown operator:${operator}!`;
					log.error(msg);
					throw new Error(msg);
				}
				} // switch
				log.info(toStr({truthy}));
				if (truthy) {
					resultMappings[i].mappings.forEach((mapping) => {
						const textToHighlight = dlv(hit, mapping.source);
						set(mapped, mapping.target, mapping.highlight ? findAll({
							searchWords: searchString.split(' '),
							textToHighlight
						}).map(({end, highlight, start: s}) => {
							const text = textToHighlight.substr(s, end - s);
							if (highlight) {
								return `<b>${text}</b>`;
							}
							return text;
						}).join('') : textToHighlight);
					});
				}
				if (resultMappings[i].doBreak) { break; }
			}
			return mapped;
		})
	});
}
