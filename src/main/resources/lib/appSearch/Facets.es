//──────────────────────────────────────────────────────────────────────────────
// Node modules (webpacked)
//──────────────────────────────────────────────────────────────────────────────
import merge from 'deepmerge';
import Uri from 'jsuri';
import set from 'set-value';


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
import {cachedQuery} from '/lib/appSearch/cachedQuery';


//──────────────────────────────────────────────────────────────────────────────
// Private function
//──────────────────────────────────────────────────────────────────────────────
function uriObjFromParams(params) {
	const uri = new Uri();
	Object.entries(params).forEach(([k, v]) => {
		if (Array.isArray(v)) {
			v.forEach((value) => { uri.addQueryParam(k, value); });
		} else { uri.addQueryParam(k, v); }
	});
	return uri;
}


//──────────────────────────────────────────────────────────────────────────────
// Public class
//──────────────────────────────────────────────────────────────────────────────
export class Facets {
	constructor({
		contentCache,
		facetCategoryIds,
		filters = {},
		multiRepoConnection,
		params,
		query,
		queryCache
	}) {
		//log.info(toStr({facetCategoryIds}));
		this.facetCategories = {};
		const hasValues = {};
		if (facetCategoryIds) {
			forceArray(facetCategoryIds).forEach((facetCategoryId) => {
				const facetCategoryContent = cachedContent({cache: contentCache, key: facetCategoryId});
				const facetCategoryName = facetCategoryContent.displayName;
				this.facetCategories[facetCategoryId] = {
					hasValues: {},
					facets: {},
					name: facetCategoryName,
					paths: []
				};
				if (!facetCategoryContent) {
					const msg = `Could not find facetCategory with key:${facetCategoryId}`;
					log.error(msg);
					throw new Error(msg);
				}
				//log.info(toStr({facetCategoryContent}));
				const pathsInCategory = [];
				if (facetCategoryContent.data.facetIds) {
					const facetIds = forceArray(facetCategoryContent.data.facetIds);
					const hasValuesInCategory = {};
					facetIds.forEach((facetId) => {
						const facetContent = cachedContent({cache: contentCache, key: facetId});
						if (!facetContent) {
							const msg = `Could not find facet with key:${facetId}`;
							log.error(msg);
							throw new Error(msg);
						}
						//log.info(toStr({facetContent}));
						const {
							fieldId,
							valueType: {
								_selected: selectedValueType
							}
						} = facetContent.data;
						//log.info(toStr({fieldId, selectedValueType}));
						const {path} = cachedContent({cache: contentCache, key: fieldId}).data; //log.info(toStr({path}));
						if (!pathsInCategory.includes(path)) { pathsInCategory.push(path); }
						const {value} = facetContent.data.valueType[selectedValueType]; //log.info(toStr({value}));
						const facetUri = uriObjFromParams(params);
						const active = params.facetId && params.facetId.includes(facetId);
						if (active) {
							//log.info(`facetId:${facetId} is active with path:${path} value:${value}`);
							if (hasValuesInCategory[path]) {
								hasValuesInCategory[path].push(value);
							} else {
								hasValuesInCategory[path] = [value];
							}
							if (hasValues[path]) {
								hasValues[path].push(value);
							} else {
								hasValues[path] = [value];
							}
						} else {
							facetUri.addQueryParam('facetId', facetId);
						}
						this.facetCategories[facetCategoryId].facets[facetId] = {
							href: facetUri.toString(),
							active,
							name: facetContent.displayName,
							path,
							value
						};
					});
					this.facetCategories[facetCategoryId].hasValues = hasValuesInCategory;
					this.facetCategories[facetCategoryId].paths = pathsInCategory;
				} // if facetIds
			}); // forEach facetCategoryId
		} // if facetCategoryIds
		//log.info(toStr({hasValues}));
		const hasValueEntries = Object.entries(hasValues); //log.info(toStr({hasValueEntries}));
		if (hasValueEntries.length && !dlv(filters, 'boolean.must')) {
			set(filters, 'boolean.must', []);
		}
		hasValueEntries.forEach(([field, values]) => {
			//log.info(toStr({field, values}));
			filters.boolean.must.push({
				hasValue: {
					field,
					values
				}
			});
		});
		//log.info(toStr({filters}));
		//log.info(toStr({facetCategories: this.facetCategories}));
		Object.entries(this.facetCategories).forEach(([
			categoryId, //eslint-disable-line no-unused-vars
			properties
		]) => {
			const filtersExceptCategory = merge.all([{}, filters]);
			//log.info(toStr({filtersExceptCategory}));
			if (properties.hasValues) {
				Object.entries(properties.hasValues).forEach(([path, values]) => {
					//log.info(toStr({path, values}));
					filtersExceptCategory.boolean.must.forEach(({hasValue}, i) => {
						if (hasValue) {
							//log.info(toStr({hasValue}));
							if (hasValue.field === path) {
								//log.info(`hasValue.field === path:${path}`);
								const filteredValues = hasValue.values.filter(value => !values.includes(value));
								//log.info(toStr({filteredValues}));
								if (hasValue.values.length !== filteredValues.length) {
									//log.info(`hasValue.values.length:${hasValue.values.length} !== filteredValues.length:${filteredValues.length}`);
									if (filteredValues.length) {
										filtersExceptCategory.boolean.must[i].hasValue.values = filteredValues;
									} else {
										delete filtersExceptCategory.boolean.must.splice(i, 1);
										if (!filtersExceptCategory.boolean.must.length) {
											delete filtersExceptCategory.boolean.must;
											if (!Object.keys(filtersExceptCategory.boolean).length) {
												delete filtersExceptCategory.boolean;
											}
										}
									}
								}
							}
						}
					});
				}); // forEach path
				//log.info(toStr({filtersExceptCategory}));
				//log.info(toStr({pathsInCategory: properties.paths}));
				const aggregations = {};
				properties.paths.forEach((path) => {
					aggregations[path] = {
						terms: {
							field: path,
							order: 'count desc',
							size: 10
						}
					};
				});
				//log.info(toStr({aggregations}));
				const queryParams = {
					aggregations,
					count: 0,
					filters: filtersExceptCategory,
					query
				}; //log.info(toStr({queryParams}));
				const queryRes = cachedQuery({cache: queryCache, connection: multiRepoConnection, params: queryParams});
				//log.info(toStr({queryRes}));
				Object.entries(this.facetCategories[categoryId].facets).forEach(([facetId, {path, value}]) => {
					//log.info(toStr({buckets: queryRes.aggregations[path].buckets}));
					const filteredBuckets = queryRes.aggregations[path].buckets.filter(({key}) => key === value);
					//log.info(toStr({filteredBuckets}));
					if (filteredBuckets.length) {
						this.facetCategories[categoryId].facets[facetId].count = filteredBuckets[0].docCount;
					} else {
						this.facetCategories[categoryId].facets[facetId].count = 0;
					}
				});
			} // if properties.hasValues
		});
		//log.info(toStr({facetCategories: this.facetCategories}));
		//log.info(toStr({facetCategories}));

		//log.info(toStr({contents: this.contents}));
		//log.info(toStr({this: this}));
	} // constructor

	getCategoriesArray() {
		return Object.values(this.facetCategories).map(({facets,  name}) => ({
			name,
			facets: Object.values(facets).map(({
				active,
				count,
				href,
				name: facetName
			}) => ({
				active,
				count,
				href,
				name: facetName
			}))
		}));
	}
} // class Facets
