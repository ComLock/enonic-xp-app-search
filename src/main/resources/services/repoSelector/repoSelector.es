//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
//import {toStr} from '/lib/enonic/util';
import {list} from '/lib/xp/repo';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export function get() {
	const repoList = list()
		.map(r => ({
			id: r.id,
			displayName: r.id,
			description: r.id // Looks best with description even though optional.
		})); //log.info(toStr({repoList}));
	const body = {
		count: repoList.length,
		total: repoList.length,
		hits: repoList
	};  //log.info(toStr({body}));
	return {
		body,
		contentType: 'text/json; charset=utf-8'
	};
}
