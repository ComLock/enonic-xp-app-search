//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
//import {toStr} from '/lib/enonic/util';
import {getContent as getCurrentContent} from '/lib/xp/portal';


//──────────────────────────────────────────────────────────────────────────────
// Local libs (Absolute path without extension so it doesn't get webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {jsonResponse} from '/lib/appSearch/jsonResponse';
import {search} from '/lib/enonic/search/search';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export function get(req) {
	//log.info(toStr({req}));
	const {params} = req;
	return jsonResponse(search({
		params,
		recipeContent: getCurrentContent()
	}));
}
