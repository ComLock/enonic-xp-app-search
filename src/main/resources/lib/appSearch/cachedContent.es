//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {get as getContentByKey} from '/lib/xp/content';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export const cachedContent = ({cache, key}) => cache.get(key, () => {
	const content = getContentByKey({key});
	if (!content) {
		const msg = `Could not find content with key:${key}`;
		log.error(msg);
		throw new Error(msg);
	}
	return content;
});
