//──────────────────────────────────────────────────────────────────────────────
// Node modules (webpacked)
//──────────────────────────────────────────────────────────────────────────────
import set from 'set-value';
import highlightSearchResult from 'highlight-search-result';


//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
//import {toStr} from '/lib/enonic/util';
import {dlv} from '/lib/enonic/util/object';
import {forceArray} from '/lib/enonic/util/data';


//──────────────────────────────────────────────────────────────────────────────
// Local libs (Absolute path without extension so it doesn't get webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {cachedContent} from '/lib/appSearch/cachedContent';
import {cachedNode} from '/lib/enonic/search/cachedNode';


//──────────────────────────────────────────────────────────────────────────────
// Public class
//──────────────────────────────────────────────────────────────────────────────
export class Mappings {
	constructor({
		contentCache,
		mappingIds
	}) {
		//log.info(toStr({contentCache, mappingIds}));

		const mappingContents = mappingIds.map(key => cachedContent({cache: contentCache, key}));
		//log.info(toStr({mappingContents}));

		this.mappings = mappingContents.map(({
			data: {
				target,
				mappings: mappingConfigs
			}
		}) => {
			//log.info(toStr({target}));
			const mappings = forceArray(mappingConfigs).map(({
				conditionId,
				source,
				valueType: {
					_selected,
					facet,
					string
				}
			}) => {
				/*log.info(toStr({
					conditionId, source, _selected, facet, string
				}));*/
				const conditionContent = cachedContent({cache: contentCache, key: conditionId});
				//log.info(toStr({conditionContent}));
				const {operator, field, value} = conditionContent.data;
				//log.info(toStr({operator, field, value}));
				const conditionMapping = {
					operator,
					field,
					value,
					source,
					_selected,
					facet,
					string
				};
				//log.info(toStr({conditionMapping}));
				return conditionMapping;
			});
			//log.info(toStr({mappings}));
			const targetMapping = {
				target,
				mappings
			};
			//log.info(toStr({targetMapping}));
			return targetMapping;
		});
		//log.info(toStr({mappings: this.mappings}));
	}

	handleMultirepoQueryHit({
		repoId, branch, id, nodeCache, score, searchString, tagIdToLocalizedFacetCategoryName, tagIdToLocalizedFacetName
	}) {
		/*log.info(toStr({
			repoId, branch, id, score
		}));*/

		const node = cachedNode({
			cache: nodeCache, repoId, branch, id
		});
		//log.info(toStr({node}));

		const hit = {
			id,
			score,
			repoId,
			branch,
			node
		};
		//log.info(toStr({mappings: this.mappings}));

		const mapped = {};
		for (let i = 0; i < this.mappings.length; i += 1) {
			const {target, mappings} = this.mappings[i];
			//log.info(toStr({target, mappings}));
			for (let j = 0; j < mappings.length; j += 1) {
				const {
					field, operator, value, source, _selected, string
				} = mappings[j];
				const actual = dlv(hit, field); //log.info(toStr({actual}));
				/*log.info(toStr({
					field, operator, value, source, _selected, facet, string
				}));*/
				let truthy = false;
				switch (operator) {
				case 'eq': truthy = actual == value; break; // eslint-disable-line eqeqeq
				case 'f': truthy = !actual; break;
				case 'ne': truthy = actual != value; break; // eslint-disable-line eqeqeq
				case 't': truthy = Array.isArray(actual) ? !!actual.length : !!actual; break;
				default: {
					const msg = `Unknown operator:${operator}!`;
					log.error(msg);
					throw new Error(msg);
				}
				} // switch
				//log.info(toStr({truthy}));
				/*log.info(toStr({
					target, field, operator, value, source, _selected, string, actual, truthy
				}));*/

				if (truthy) {
					if (_selected === 'string') {
						const textToHighlight = dlv(hit, source);
						const {highlight, lengthLimit} = string;
						let v;
						if (highlight) {
							v = highlightSearchResult(textToHighlight, searchString, lengthLimit || textToHighlight.length, str => `<b>${str}</b>`);
						} else {
							v = lengthLimit
								? textToHighlight.substring(0, lengthLimit)
								: textToHighlight;
						}
						set(mapped, target, v);
						break;
					} else if (_selected === 'facet') {
						set(
							mapped,
							target,
							forceArray(actual).map(repoBranchNodeId => `${tagIdToLocalizedFacetCategoryName[repoBranchNodeId]}: ${tagIdToLocalizedFacetName[repoBranchNodeId]}`).sort().join(', ')
						);
					}
					//findFacetFromNodeId
				} // if truthy
				//if (resultMappings[i].doBreak) { break; } // TODO Document why
			} // for mappings
		} // for this.mappings
		return mapped;
	} // handleMultirepoQueryHit
} // class Mappings
