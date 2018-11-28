//──────────────────────────────────────────────────────────────────────────────
// Node modules (webpacked)
//──────────────────────────────────────────────────────────────────────────────
import Uri from 'jsuri';


//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';


//──────────────────────────────────────────────────────────────────────────────
// Public class
//──────────────────────────────────────────────────────────────────────────────
export class Facets {
	constructor({
		facetCategoryIds,
		params
	}) {
		//log.info(toStr({facetCategoryIds}));
		this.contents = {};
		//this.aggregations = {};
		//this.filters = {};
		const facetCategories = [];
		const paths = [];
		if (facetCategoryIds) {
			forceArray(facetCategoryIds).forEach((facetCategoryId) => {
				const facetCategoryContent = getContentByKey({key: facetCategoryId});
				if (!facetCategoryContent) {
					const msg = `Could not find facetCategory with key:${facetCategoryId}`;
					log.error(msg);
					throw new Error(msg);
				}
				/*this.aggregations[content._name] = {
					terms: {
						field: ,
						order: 'count desc',
						size: 10
					}
				};*/
				//log.info(toStr({facetCategoryContent}));
				//this.contents[key] = content;
				if (facetCategoryContent.data.facetIds) {
					const facetCategoryName = facetCategoryContent.displayName;
					//facets[facetCategoryName] = {};
					facetCategories.push({
						name: facetCategoryName,
						facets: forceArray(facetCategoryContent.data.facetIds).map((facetId) => {
							const facetContent = getContentByKey({key: facetId});
							if (!facetContent) {
								const msg = `Could not find facet with key:${facetId}`;
								log.error(msg);
								throw new Error(msg);
							}
							//log.info(toStr({facetContent}));
							//this.contents[facetId] = facetContent;
							const {
								fieldId/*,
								valueType: {
									_selected: selectedValueType
								}*/
							} = facetContent.data;
							//log.info(toStr({fieldId, selectedValueType}));
							if (!this.contents[fieldId]) {
								const fieldContent = getContentByKey({key: fieldId});
								if (!fieldContent) {
									const msg = `Could not find field with key:${fieldId}`;
									log.error(msg);
									throw new Error(msg);
								}
								//log.info(toStr({fieldContent}));
								this.contents[fieldId] = fieldContent;
							}
							const {path} = this.contents[fieldId].data;
							//log.info(toStr({path}));
							if (!paths.includes(path)) { paths.push(path); }
							//const {value} = facetContent.data.valueType[selectedValueType];
							//log.info(toStr({value}));
							const uri = new Uri();
							Object.entries(params).forEach(([k, v]) => {
								uri.addQueryParam(k, v);
							});
							if (!uri.getQueryParamValues('facetId').includes(facetId)) {
								uri.addQueryParam('facetId', facetId);
							}
							return {
								href: uri.toString(),
								active: false,
								count: 0,
								//id: facetId,
								name: facetContent.displayName
							};
						}) // map facetId
					});
				} // if facetIds
			}); // forEach facetCategoryId
		} // if facetCategoryIds
		log.info(toStr({paths}));
		log.info(toStr({facetCategories}));
		//log.info(toStr({contents: this.contents}));
		//log.info(toStr({this: this}));
	} // constructor
} // class Facets
