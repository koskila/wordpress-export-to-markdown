module.exports = (post) => {
	var status = post.data.status[0];
	return status === 'draft' ? 'true' : 'false';
	//return status;
};
