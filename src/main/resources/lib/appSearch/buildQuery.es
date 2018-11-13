//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {toStr} from '/lib/enonic/util';
import {forceArray} from '/lib/enonic/util/data';
import {get as getContentByKey} from '/lib/xp/content';


//──────────────────────────────────────────────────────────────────────────────
// Private constants
//──────────────────────────────────────────────────────────────────────────────
const CT_EXPRESSION = `${app.name}:expression`;
const CT_FULLTEXT = `${app.name}:fulltext`;
const CT_GROUP = `${app.name}:group`;
const CT_NGRAM = `${app.name}:ngram`;


//──────────────────────────────────────────────────────────────────────────────
// Private functions
//──────────────────────────────────────────────────────────────────────────────
function fulltext({
	data = {},
	fields = data.fields || '_alltext',
	searchString = '',
	operator = data.operator || 'OR'
} = {}) {
	return `fulltext('${forceArray(fields).join(',')}', '${searchString}', '${operator}')`;
}


function group({
	data = {},
	expressionIds = data.expressionIds,
	operator = data.operator || 'OR',
	searchString
}) {
	const expression = forceArray(expressionIds).map(expressionId => buildQuery({expressionId, searchString})).join(` ${operator} `); // eslint-disable-line no-use-before-define
	return `(${expression})`;
}


function ngram({
	data = {},
	fields = data.fields || '_alltext',
	searchString = '',
	operator = data.operator || 'OR'
} = {}) {
	return `ngram('${forceArray(fields).join(',')}', '${searchString}', '${operator}')`;
}


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export function buildQuery({expressionId, searchString}) {
	const expressionContent = getContentByKey({key: expressionId}); log.info(toStr({expressionContent}));
	const {data, type} = expressionContent;
	let query = '';
	switch (type) {
	case CT_EXPRESSION:
		query += data.expression;
		break;
	case CT_FULLTEXT:
		query += fulltext({data, searchString});
		break;
	case CT_GROUP:
		query += group({data, searchString});
		break;
	case CT_NGRAM:
		query += ngram({data, searchString});
		break;
	default:
		throw new Error('Unknown expression content type!');
	} // switch
	return query;
} // function buildQuery
