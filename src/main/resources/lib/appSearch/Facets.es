//──────────────────────────────────────────────────────────────────────────────
// Node modules (webpacked)
//──────────────────────────────────────────────────────────────────────────────
import merge from 'deepmerge';
import Uri from 'jsuri';
import set from 'set-value';


//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
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
		if (!['name', 'page', 'recipeId', 'searchString'].includes(k)) {
			if (Array.isArray(v)) {
				v.forEach((value) => { uri.addQueryParam(k, value); });
			} else { uri.addQueryParam(k, v); }
		}
	});
	if (params.name && params.searchString) {
		uri.addQueryParam(params.name, params.searchString);
	}
	return uri;
}


function localizeFromContent({content, contentCache, locale}) {
	//log.info(toStr({content, contentCache, locale}));
	let rv = content.displayName;
	if (!locale) { return rv; }
	if (content.data.localization) {
		const localizations = {};
		const locales = forceArray(content.data.localization);
		for (let i = 0; i < locales.length; i += 1) {
			const {localeId, translation} = locales[i];
			if (localeId) {
				const localeContent = cachedContent({cache: contentCache, key: localeId}); //log.info(toStr({localeContent}));
				const {language, country} = localeContent.data; //log.info(toStr({language, country}));
				const lowerCaseLocale = locale.toLowerCase();
				if (lowerCaseLocale.startsWith(language.toLowerCase())) {
					rv = translation;
					break;
				} else if (country && lowerCaseLocale.startsWith(country.toLowerCase())) {
					rv = translation;
					break;
				}
				localizations[language] = translation;
			}
		}
		//log.info(toStr({localizations}));
	}
	//log.info(toStr({rv}));
	return rv;
}


//──────────────────────────────────────────────────────────────────────────────
// Public class
//──────────────────────────────────────────────────────────────────────────────
export class Facets {
	constructor({
		contentCache,
		facetCategoryIds,
		filters = {},
		locale,
		multiRepoConnection,
		params,
		query,
		queryCache
	}) {
		//log.info(toStr({facetCategoryIds}));
		//this.tagIdToFacetCategoryId = {};
		this.tagIdToLocalizedFacetCategoryName = {};
		//this.tagIdToFacetId = {};
		this.tagIdToLocalizedFacetName = {};
		this.facetCategories = {};
		const hasValues = {};
		if (facetCategoryIds) {
			forceArray(facetCategoryIds).forEach((facetCategoryId) => {
				const facetCategoryContent = cachedContent({cache: contentCache, key: facetCategoryId});
				const facetCategoryName = localizeFromContent({content: facetCategoryContent, contentCache, locale});
				this.facetCategories[facetCategoryId] = {
					activeCount: 0,
					hasValues: {},
					facets: {},
					inactiveCount: 0,
					name: facetCategoryName,
					paths: []
				};
				const facetCategoryUri = uriObjFromParams(params);
				const facetCategoryClearUri = uriObjFromParams(params);
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
						//this.tagIdToFacetCategoryId[value] = facetCategoryId;
						this.tagIdToLocalizedFacetCategoryName[value] = facetCategoryName;
						//this.tagIdToFacetId[value] = facetId;
						const facetUri = uriObjFromParams(params);
						const active = !!params.facetId && params.facetId.includes(facetId);
						facetUri.deleteQueryParam('facetId', facetId);
						facetCategoryClearUri.deleteQueryParam('facetId', facetId);
						const removeHref = facetUri.toString();
						facetUri.addQueryParam('facetId', facetId);
						facetCategoryUri.addQueryParam('facetId', facetId);
						if (active) {
							this.facetCategories[facetCategoryId].activeCount += 1;
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
							this.facetCategories[facetCategoryId].inactiveCount += 1;
						}
						const localizedFacetName = localizeFromContent({content: facetContent, contentCache, locale});
						this.tagIdToLocalizedFacetName[value] = localizedFacetName;
						this.facetCategories[facetCategoryId].facets[facetId] = {
							active,
							href: facetUri.toString(),
							name: localizedFacetName,
							path,
							removeHref,
							value
						};
					});
					this.facetCategories[facetCategoryId].hasValues = hasValuesInCategory;
					//log.info(toStr({hasValuesInCategory}));
					this.facetCategories[facetCategoryId].paths = pathsInCategory;
					this.facetCategories[facetCategoryId].href = facetCategoryUri.toString();
					this.facetCategories[facetCategoryId].clearHref = facetCategoryClearUri.toString();
				} // if facetIds
			}); // forEach facetCategoryId
		} // if facetCategoryIds
		log.info(toStr({hasValues}));
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
		log.info(toStr({facetCategories: this.facetCategories}));
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
		//log.info(toStr({tagIdToFacetCategoryId: this.tagIdToFacetCategoryId}));
		//log.info(toStr({tagIdToFacetId: this.tagIdToFacetId}));
		//log.info(toStr({tagIdToLocalizedFacetCategoryName: this.tagIdToLocalizedFacetCategoryName}));
		//log.info(toStr({tagIdToLocalizedFacetName: this.tagIdToLocalizedFacetName}));
	} // constructor


	getCategoriesArray() {
		return Object.values(this.facetCategories).map(({
			activeCount, clearHref, facets, href: categoryHref, inactiveCount, name
		}) => ({
			activeCount,
			clearHref,
			href: categoryHref,
			inactiveCount,
			name,
			facets: Object.values(facets).map(({
				active,
				count,
				href,
				name: facetName,
				removeHref
			}) => ({
				active,
				count,
				href,
				name: facetName,
				removeHref
			}))
		}));
	}
} // class Facets
