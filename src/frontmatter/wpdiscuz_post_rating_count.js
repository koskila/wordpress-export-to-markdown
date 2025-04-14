module.exports = (post) => {
	// console.log(post);
	// console.warn(post.data);
	// console.error(post.data.wpdiscuz_post_rating_count);
	try {
		// console.log(post);
		return post.wpdiscuz_post_rating_count;
	} catch (error) {	
		console.error(post.data.title + ' had an error in wpdisduz_post_rating_count.js:' + error);
		// console.info(post);
		return '';
	}
}
