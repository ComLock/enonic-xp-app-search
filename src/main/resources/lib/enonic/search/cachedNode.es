//──────────────────────────────────────────────────────────────────────────────
// Enonic XP libs (externals not webpacked)
//──────────────────────────────────────────────────────────────────────────────
import {connect} from '/lib/xp/node';


//──────────────────────────────────────────────────────────────────────────────
// Public function
//──────────────────────────────────────────────────────────────────────────────
export const cachedNode = ({
	cache,
	repoId,
	branch,
	id,
	repoBranchNodeId
}) => {
	if (repoBranchNodeId) {
		const arr = repoBranchNodeId.split(':');
		/* eslint-disable no-param-reassign */
		/* eslint-disable prefer-destructuring */
		repoId = arr[0];
		branch = arr[1];
		id = arr[2];
		/* eslint-enable prefer-destructuring */
	} else {
		repoBranchNodeId = `${repoId}:${branch}:${id}`;
		/* eslint-enable no-param-reassign */
	}
	return cache.get(repoBranchNodeId, () => {
		const repoConnection = connect({
			repoId,
			branch,
			principals: ['role:system.admin'] // TODO Remove hardcode?
		});
		const node = repoConnection.get(id); //log.info(toStr({node}));
		if (!node) {
			const msg = `Could not find node ${repoBranchNodeId}`;
			log.error(msg);
			throw new Error(msg);
		}
		return node;
	});
};
