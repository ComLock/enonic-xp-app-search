//──────────────────────────────────────────────────────────────────────────────
// Node modules (webpacked)
//──────────────────────────────────────────────────────────────────────────────
import set from 'set-value';


//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
//import {toStr} from '/lib/enonic/util';
import {dlv} from '/lib/enonic/util/object';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';
//import {get as getContext} from '/lib/xp/context';


//──────────────────────────────────────────────────────────────────────────────
// Local libs (Absolute path without extension so it doesn't get webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {runAsSu} from '/lib/appSearch/runAsSu';


//──────────────────────────────────────────────────────────────────────────────
// Private constant
//──────────────────────────────────────────────────────────────────────────────
const CT_TERMS = `${app.name}:aggregationTerms`;


export class Aggregations {
	constructor(keys) {
		//log.info('constructor() called');
		//log.info(toStr({keys}));
		this.mappingsObj = {};
		this.contents = keys ? forceArray(keys).map((key) => {
			const aggregationContent = getContentByKey({key});
			if (aggregationContent) {
				if (aggregationContent.data.aggregationIds) {
					aggregationContent.subAggregations = new Aggregations(aggregationContent.data.aggregationIds); // Recurse
					this.mappingsObj = {...this.mappingsObj, ...aggregationContent.subAggregations.mappingsObj};
				}
				const {
					_name: name,
					data: {
						bucketType: {
							_selected: bucketType,
							content
						}
					}
				} = aggregationContent;
				if (bucketType === 'content') {
					this.mappingsObj[name] = content.mappings ? forceArray(content.mappings) : [];
					/*(content.mappings ? forceArray(content.mappings) : []).forEach(({source, target}) => {
						log.info(toStr({source, target}));
					});*/
				}
				return aggregationContent;
			}
			log.error(`Could not find any aggregationContent with key:${key}`);
			return null;
		}).filter(x => x) : null;
		/*log.info(toStr({
			contents: this.contents,
			mappings: this.mappingsObj
		}));*/
	}


	static terms(aggregationContent) {
		//log.info('terms() called');
		const {
			field, orderType, orderDirection, size
		} = aggregationContent.data;
		/*log.info(toStr({
			field, orderType, orderDirection, size
		}));*/
		return {
			terms: {
				field,
				order: `${orderType} ${orderDirection}`,
				size
			}
		};
	} // static terms


	buildExpression() {
		//log.info('buildExpression() called');
		if (!this.contents) { return {}; }
		const expression = {};
		this.contents.forEach((aggregationContent) => {
			const {
				_name: name,
				subAggregations,
				type
			} = aggregationContent; //log.info(toStr({name, subAggregations, type}));
			switch (type) {
			case CT_TERMS: expression[name] = Aggregations.terms(aggregationContent); break;
			default: {
				const msg = `Unknown aggregation content type:${type}`;
				log.error(msg);
				throw new Error(msg);
			}
			} // switch
			if (subAggregations) {
				expression[name].aggregations = subAggregations.map(subAggregation => subAggregation.buildExpression()); // Recurse
			}
		}); // forEach aggregationContent
		//log.info(toStr({expression}));
		return expression;
	} // buildExpression


	handleResult(aggregations) {
		//log.info('handleResult() called');
		//log.info(toStr({aggregations}));
		//const xpContext = getContext(); //log.info(toStr({xpContext}));
		const rObj = {};
		Object.keys(aggregations).forEach((name) => {
			if (this.mappingsObj[name]) {
				aggregations[name].buckets.forEach(({key, docCount}) => {
					const content = runAsSu(() => getContentByKey({key})); // TODO Using runAsSu because services called via httpclient.request
					if (!content) {
						log.error(`Unable to find content with key:${key}!`);
					} else {
						const obj = {};
						const context = {
							key,
							docCount,
							content
						}; //log.info(toStr({context}));
						this.mappingsObj[name].forEach(({source, target}) => {
							//log.info(toStr({source, target}));
							//const whatever = source.split('${'); log.info(toStr({whatever}));
							const value = source.split('${').map((part) => {
								if (!part.includes('}')) { return part; }
								//log.info(toStr({part}));
								const variableAndMore = part.split('}');
								return `${dlv(context, variableAndMore.shift())}${variableAndMore.join('')}`;
							}).join('');
							//log.info(toStr({value}));
							set(obj, target, value);
						});
						rObj[name] = obj;
					}
				});
			}
		});
		//log.info(toStr({rObj}));
		return rObj;
	} // buildResult
} // class Aggregations
